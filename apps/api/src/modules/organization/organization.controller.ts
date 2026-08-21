import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { OrganizationService } from "./organization.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SystemRole } from "@unicom/types";
import { IsNotEmpty, IsString } from "class-validator";

class CreateBrandDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsNotEmpty() @IsString() code!: string;
  @IsNotEmpty() @IsString() description!: string;
}

class CreateBranchDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsNotEmpty() @IsString() code!: string;
  @IsNotEmpty() @IsString() city!: string;
}

@Controller("organization")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  @Get("brands")
  async getBrands() {
    return this.organizationService.getAllBrands();
  }

  @Get("brands/:id")
  async getBrandById(@Param("id") id: string) {
    return this.organizationService.getBrandById(id);
  }

  @Post("brands")
  @Roles(SystemRole.SUPER_ADMIN)
  async createBrand(@Body() dto: CreateBrandDto, @CurrentUser("email") email: string) {
    return this.organizationService.createBrand(dto.name, dto.code, dto.description, email);
  }

  @Get("branches")
  async getBranches() {
    return this.organizationService.getAllBranches();
  }

  @Get("branches/:id")
  async getBranchById(@Param("id") id: string) {
    return this.organizationService.getBranchById(id);
  }

  @Post("branches")
  @Roles(SystemRole.SUPER_ADMIN)
  async createBranch(@Body() dto: CreateBranchDto, @CurrentUser("email") email: string) {
    return this.organizationService.createBranch(dto.name, dto.code, dto.city, email);
  }
}
