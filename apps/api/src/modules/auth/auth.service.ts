import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService, DBUser } from "../../database/database.service";
import { AccountStatus } from "@unicom/types";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<DBUser> {
    const trimmed = identifier.trim().toLowerCase();
    const user = this.databaseService.users.find(
      (u) => u.email.toLowerCase() === trimmed || u.nik.toLowerCase() === trimmed,
    );

    if (!user) {
      throw new UnauthorizedException("NIK / Email atau password salah.");
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(
        user.status === AccountStatus.SUSPENDED
          ? "Akun Anda sedang ditangguhkan (SUSPENDED). Hubungi Administrator."
          : "Akun Anda belum aktif (INACTIVE).",
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("NIK / Email atau password salah.");
    }

    return user;
  }

  async login(identifier: string, pass: string, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(identifier, pass);

    const payload = {
      sub: user.id,
      email: user.email,
      nik: user.nik,
      role: user.role,
      jobProfile: user.jobProfile,
      branchId: user.branchId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "8h",
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "7d" },
    );

    // Audit login event
    this.databaseService.logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "AUTH_LOGIN_SUCCESS",
      resource: "USER_SESSION",
      resourceId: user.id,
      details: { role: user.role, branchId: user.branchId },
      ipAddress,
      userAgent,
    });

    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 28800, // 8 hours in seconds
      user: {
        id: user.id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        role: user.role,
        jobProfile: user.jobProfile,
        branchId: user.branchId,
        branchName: branch?.name || "Unicom Central",
        brandIds: user.brandIds,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = this.databaseService.users.find((u) => u.id === decoded.sub);
      if (!user || user.status !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException("Sesi refresh tidak valid.");
      }

      const payload = {
        sub: user.id,
        email: user.email,
        nik: user.nik,
        role: user.role,
        jobProfile: user.jobProfile,
        branchId: user.branchId,
      };

      const newAccessToken = this.jwtService.sign(payload, { expiresIn: "8h" });
      return {
        accessToken: newAccessToken,
        expiresIn: 28800,
      };
    } catch {
      throw new UnauthorizedException("Refresh token kadaluarsa atau tidak valid.");
    }
  }

  async getCurrentProfile(userId: string) {
    const user = this.databaseService.users.find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException("Profil pengguna tidak ditemukan.");
    }

    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);
    const brands = this.databaseService.brands.filter((b) => user.brandIds.includes(b.id));

    return {
      id: user.id,
      nik: user.nik,
      name: user.name,
      email: user.email,
      role: user.role,
      jobProfile: user.jobProfile,
      branchId: user.branchId,
      branchName: branch?.name || "Unicom Central",
      branchCity: branch?.city || "Jakarta",
      brands: brands.map((b) => ({ id: b.id, name: b.name, code: b.code })),
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
