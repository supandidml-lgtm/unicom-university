import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("storage")
export class StorageController {
  constructor(private storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Get("signed-url")
  async getSignedUrl(
    @Query("fileKey") fileKey: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.storageService.getSignedAccessUrl(fileKey, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("material/:id")
  async getMaterialContent(@Param("id") id: string) {
    return this.storageService.getMaterialContent(id);
  }
}
