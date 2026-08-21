import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/database.service";
import { AccountStatus } from "@unicom/types";

export interface JwtPayload {
  sub: string;
  email: string;
  nik: string;
  role: string;
  branchId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private databaseService: DatabaseService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ||
        "super_secret_jwt_key_that_is_at_least_32_characters_long_for_dev",
    });
  }

  async validate(payload: JwtPayload) {
    const user = this.databaseService.users.find((u) => u.id === payload.sub);
    if (!user) {
      throw new UnauthorizedException("Pengguna tidak ditemukan atau token tidak valid.");
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Akun Anda sedang dinonaktifkan atau disuspend.");
    }

    return {
      id: user.id,
      nik: user.nik,
      name: user.name,
      email: user.email,
      role: user.role,
      jobProfile: user.jobProfile,
      branchId: user.branchId,
      brandIds: user.brandIds,
    };
  }
}
