import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AssistantService } from "./assistant.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("assistant")
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("query")
  async query(
    @Body() body: { query: string; brandId?: string },
    @CurrentUser("sub") userId: string,
  ) {
    return this.assistantService.queryKnowledge({
      ...body,
      userId,
    });
  }
}
