# TASK-003 Authorization Foundation

TASK-003 establishes database-backed RBAC for roles, permissions, role assignments, and the explicit
first Super Administrator bootstrap. It intentionally excludes Brand/resource scope and every business
domain. System role and permission definitions are centralized in `packages/database/src/rbac.ts`; all
protected API operations must use the centralized authorization guard.
