import { describe, it, expect, beforeEach } from "vitest";
import { UsersService } from "../src/modules/users/users.service";
import { DatabaseService } from "../src/database/database.service";
import { SystemRole, JobProfile, AccountStatus } from "@unicom/types";
import { ConflictException } from "@nestjs/common";

describe("UsersModule Management & NIK Uniqueness (PRD §8–§14)", () => {
  let usersService: UsersService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    usersService = new UsersService(dbService);
  });

  it("should create new employee user with unique NIK", async () => {
    const newUser = await usersService.createUser({
      nik: "UC10099",
      name: "Fajar Nugraha",
      email: "fajar@unicom.co.id",
      password: "Password123!",
      role: SystemRole.STAFF,
      jobProfile: JobProfile.TECHNICIAN,
      branchId: "branch-jkt-pusat",
    });

    expect(newUser.nik).toBe("UC10099");
    expect(newUser.status).toBe(AccountStatus.ACTIVE);
  });

  it("should prevent duplicate NIK registration", async () => {
    await expect(
      usersService.createUser({
        nik: "UC10042", // already registered to Andi Pratama
        name: "Duplicate User",
        email: "duplicate@unicom.co.id",
        password: "Password123!",
        role: SystemRole.STAFF,
        jobProfile: JobProfile.TECHNICIAN,
        branchId: "branch-jkt-pusat",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should soft-delete/deactivate user account", async () => {
    await usersService.deleteUser("usr-staff-1");
    const user = await usersService.getUserById("usr-staff-1");
    expect(user.status).toBe(AccountStatus.INACTIVE);
  });
});
