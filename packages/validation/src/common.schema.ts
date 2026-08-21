import { z } from "zod";
import { SystemRole, JobProfile } from "@unicom/types";
import { DOMAIN_DEFAULTS } from "@unicom/config";

/**
 * Common Zod Validation Schemas
 */

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DOMAIN_DEFAULTS.PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(DOMAIN_DEFAULTS.PAGINATION.MAX_LIMIT).default(DOMAIN_DEFAULTS.PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const nikSchema = z.string().trim().min(3, "NIK must be at least 3 characters").max(30, "NIK max 30 characters");

export const roleAssignmentSchema = z.object({
  role: z.nativeEnum(SystemRole),
  jobProfile: z.nativeEnum(JobProfile).optional(),
});
