import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service";
import { DatabaseService } from "../src/database/database.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";

describe("AuthModule & RBAC Authentication (PRD §10–§18)", () => {
  let authService: AuthService;
  let dbService: DatabaseService;
  let jwtService: JwtService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    jwtService = new JwtService({ secret: "test_secret_12345678" });
    authService = new AuthService(dbService, jwtService);
  });

  it("should successfully authenticate with valid email and password", async () => {
    const res = await authService.login("admin@unicom.co.id", "UnicomPassword2026!");
    expect(res.accessToken).toBeDefined();
    expect(res.refreshToken).toBeDefined();
    expect(res.user.nik).toBe("ADM001");
    expect(res.user.role).toBe("SUPER_ADMIN");
  });

  it("should successfully authenticate with NIK", async () => {
    const res = await authService.login("UC10042", "UnicomPassword2026!");
    expect(res.accessToken).toBeDefined();
    expect(res.user.name).toContain("Andi Pratama");
    expect(res.user.role).toBe("STAFF");
  });

  it("should reject authentication with incorrect password", async () => {
    await expect(authService.login("admin@unicom.co.id", "wrong_password")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should reject authentication with non-existent identifier", async () => {
    await expect(authService.login("UNKNOWN_USER", "UnicomPassword2026!")).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
