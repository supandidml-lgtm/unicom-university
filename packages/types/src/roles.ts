/**
 * System Roles in Unicom University
 * Strictly according to MASTER PRD §6
 */
export enum SystemRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  TRAINER = "TRAINER",
  SUPERVISOR = "SUPERVISOR",
  STAFF = "STAFF",
}

/**
 * Job Profiles applicable to STAFF role
 * Strictly according to MASTER PRD §7
 */
export enum JobProfile {
  ADMIN = "ADMIN",
  TECHNICIAN = "TECHNICIAN",
  CUSTOMER_SERVICE = "CUSTOMER_SERVICE",
}
