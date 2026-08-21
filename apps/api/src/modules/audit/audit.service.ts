import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class AuditService {
  constructor(private databaseService: DatabaseService) {}

  async getAllLogs(limit: number = 100, action?: string) {
    let logs = this.databaseService.auditLogs;
    if (action) {
      logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    return logs.slice(0, limit);
  }

  async getLogsByActor(actorId: string) {
    return this.databaseService.auditLogs.filter((l) => l.actorId === actorId);
  }
}
