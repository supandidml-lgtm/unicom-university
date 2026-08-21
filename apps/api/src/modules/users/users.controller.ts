import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SystemRole, AccountStatus } from "@unicom/types";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR)
  async getAllUsers(
    @Query("role") role?: SystemRole,
    @Query("branchId") branchId?: string,
    @Query("status") status?: AccountStatus,
  ) {
    return this.usersService.getAllUsers({ role, branchId, status });
  }

  @Get(":id")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR)
  async getUserById(@Param("id") id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  @Roles(SystemRole.SUPER_ADMIN)
  async createUser(@Body() dto: CreateUserDto, @CurrentUser("email") actorEmail: string) {
    return this.usersService.createUser(dto, actorEmail);
  }

  @Put(":id")
  @Roles(SystemRole.SUPER_ADMIN)
  async updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser("email") actorEmail: string,
  ) {
    return this.usersService.updateUser(id, dto, actorEmail);
  }

  @Delete(":id")
  @Roles(SystemRole.SUPER_ADMIN)
  async deleteUser(@Param("id") id: string, @CurrentUser("email") actorEmail: string) {
    return this.usersService.deleteUser(id, actorEmail);
  }
}
