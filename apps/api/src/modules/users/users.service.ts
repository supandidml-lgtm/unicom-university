import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { DatabaseService, DBUser } from "../../database/database.service";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user.dto";
import { AccountStatus, SystemRole } from "@unicom/types";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  async getAllUsers(filters?: { role?: SystemRole; branchId?: string; status?: AccountStatus }) {
    let list = this.databaseService.users;

    if (filters?.role) {
      list = list.filter((u) => u.role === filters.role);
    }
    if (filters?.branchId) {
      list = list.filter((u) => u.branchId === filters.branchId);
    }
    if (filters?.status) {
      list = list.filter((u) => u.status === filters.status);
    }

    return list.map((u) => {
      const branch = this.databaseService.branches.find((b) => b.id === u.branchId);
      const brands = this.databaseService.brands.filter((b) => u.brandIds.includes(b.id));
      return {
        id: u.id,
        nik: u.nik,
        name: u.name,
        email: u.email,
        role: u.role,
        jobProfile: u.jobProfile,
        branchId: u.branchId,
        branchName: branch?.name || "-",
        brandNames: brands.map((b) => b.name),
        status: u.status,
        createdAt: u.createdAt,
      };
    });
  }

  async getUserById(id: string) {
    const user = this.databaseService.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException("Pengguna tidak ditemukan.");
    }
    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);
    return {
      ...user,
      passwordHash: undefined,
      branchName: branch?.name || "-",
    };
  }

  async createUser(dto: CreateUserDto, actorEmail?: string) {
    const existingNik = this.databaseService.users.find(
      (u) => u.nik.toLowerCase() === dto.nik.toLowerCase().trim(),
    );
    if (existingNik) {
      throw new ConflictException(`NIK '${dto.nik}' sudah terdaftar dalam sistem.`);
    }

    const existingEmail = this.databaseService.users.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase().trim(),
    );
    if (existingEmail) {
      throw new ConflictException(`Email '${dto.email}' sudah terdaftar dalam sistem.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newUser: DBUser = {
      id: `usr-${Date.now()}`,
      nik: dto.nik.trim().toUpperCase(),
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      role: dto.role,
      jobProfile: dto.jobProfile,
      branchId: dto.branchId,
      brandIds: dto.brandIds || [],
      status: AccountStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.databaseService.users.push(newUser);

    this.databaseService.logAudit({
      actorEmail,
      action: "USER_CREATED",
      resource: "USER",
      resourceId: newUser.id,
      details: { nik: newUser.nik, name: newUser.name, role: newUser.role },
    });

    return {
      id: newUser.id,
      nik: newUser.nik,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      jobProfile: newUser.jobProfile,
      branchId: newUser.branchId,
      status: newUser.status,
      createdAt: newUser.createdAt,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto, actorEmail?: string) {
    const index = this.databaseService.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException("Pengguna tidak ditemukan.");
    }

    const existing = this.databaseService.users[index]!;

    if (dto.email && dto.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = this.databaseService.users.find(
        (u) => u.email.toLowerCase() === dto.email!.toLowerCase().trim() && u.id !== id,
      );
      if (emailConflict) {
        throw new ConflictException(`Email '${dto.email}' sudah digunakan oleh pengguna lain.`);
      }
      existing.email = dto.email.trim().toLowerCase();
    }

    if (dto.name) existing.name = dto.name.trim();
    if (dto.role) existing.role = dto.role;
    if (dto.jobProfile) existing.jobProfile = dto.jobProfile;
    if (dto.branchId) existing.branchId = dto.branchId;
    if (dto.brandIds) existing.brandIds = dto.brandIds;
    if (dto.status) {
      if (existing.role === SystemRole.SUPER_ADMIN && existing.nik === "ADM001" && dto.status === AccountStatus.INACTIVE) {
        throw new ForbiddenException("Akun Master Super Admin (ADM001) tidak dapat dinonaktifkan.");
      }
      existing.status = dto.status;
    }
    existing.updatedAt = new Date().toISOString();

    this.databaseService.logAudit({
      actorEmail,
      action: "USER_UPDATED",
      resource: "USER",
      resourceId: id,
      details: { changes: dto },
    });

    return {
      id: existing.id,
      nik: existing.nik,
      name: existing.name,
      email: existing.email,
      role: existing.role,
      jobProfile: existing.jobProfile,
      branchId: existing.branchId,
      status: existing.status,
      updatedAt: existing.updatedAt,
    };
  }

  async deleteUser(id: string, actorEmail?: string) {
    const index = this.databaseService.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException("Pengguna tidak ditemukan.");
    }

    const user = this.databaseService.users[index]!;
    if (user.role === SystemRole.SUPER_ADMIN && user.nik === "ADM001") {
      throw new ForbiddenException("Akun Master Super Admin (ADM001) tidak dapat dinonaktifkan.");
    }

    // Soft delete: set status to INACTIVE / SUSPENDED
    user.status = AccountStatus.INACTIVE;
    user.updatedAt = new Date().toISOString();

    this.databaseService.logAudit({
      actorEmail,
      action: "USER_DEACTIVATED",
      resource: "USER",
      resourceId: id,
      details: { name: user.name, nik: user.nik },
    });

    return { message: `Akun ${user.name} (${user.nik}) berhasil dinonaktifkan.` };
  }
}
