# Permission Matrix

System permissions are defined only in `packages/database/src/rbac.ts`. The API enforces them with
the centralized authorization guard; frontend visibility is only a UX aid.

| Capability                            | Permission                                                     | Super Administrator  | Trainer | Trainee |
| ------------------------------------- | -------------------------------------------------------------- | -------------------- | ------- | ------- |
| View roles                            | `roles.read`                                                   | Yes (central bypass) | No      | No      |
| Create/update/deactivate custom roles | `roles.create`, `roles.update`, `roles.delete`                 | Yes (central bypass) | No      | No      |
| View permission catalog               | `permissions.read`                                             | Yes (central bypass) | No      | No      |
| Read/assign/remove user roles         | `users.roles.read`, `users.roles.assign`, `users.roles.remove` | Yes (central bypass) | No      | No      |
| Read authorization audit events       | `system.auth-events.read`                                      | Yes (central bypass) | No      | No      |

`TRAINER` and `TRAINEE` intentionally receive no business permissions in TASK-003. Future domain
tasks may add application-defined permissions and assign them through reviewed seed/application code.

## Brand management

| Capability                             | Permission                                                              | Super Administrator  | Trainer | Trainee |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------- | ------- | ------- |
| Read all Brands                        | `brands.read`                                                           | Yes (central bypass) | No      | No      |
| Read assigned active Brands            | `brands.read` + Brand scope                                             | Yes                  | Yes     | No      |
| Create/update/archive/reactivate Brand | `brands.create`, `brands.update`, `brands.archive`, `brands.reactivate` | Yes                  | No      | No      |
| View Trainer Brand access              | `brand_access.read`                                                     | Yes                  | No      | No      |
| Assign/remove Trainer Brand access     | `brand_access.assign`, `brand_access.remove`                            | Yes                  | No      | No      |

`TRAINER` receives only `brands.read` from TASK-004. Its read access still requires an active
`UserBrandAccess` assignment, an active Brand, and an effective `TRAINER` role. A participant's future
learning scope is enrollment, never `UserBrandAccess`.

## Staff provisioning

| Capability                   | Permission                | Super Administrator  | Trainer                                | Trainee |
| ---------------------------- | ------------------------- | -------------------- | -------------------------------------- | ------- |
| Create Participant           | `participants.create`     | Yes (central bypass) | Yes                                    | No      |
| Read Participants            | `participants.read`       | All                  | Only pre-enrollment Participants owned | No      |
| Update/disable/invite owned  | `participants.*`          | All                  | Yes, only owned Participants           | No      |
| Reactivate owned Participant | `participants.reactivate` | All                  | Yes, only owned Participants           | No      |
| Create/read/manage Trainers  | `trainers.*`              | Yes (central bypass) | No                                     | No      |
| Read full staff NIK          | `staff.nik.read_full`     | Yes (central bypass) | No                                     | No      |

TASK-005 ownership is explicitly pre-enrollment only. TASK-006 uses Training Enrollment plus Brand
scope for legitimate Trainer access; `createdByUserId` must not become a bypass for that boundary.

## Training enrollment

| Capability                      | Permission              | Super Administrator | Trainer                                                    | Trainee       |
| ------------------------------- | ----------------------- | ------------------- | ---------------------------------------------------------- | ------------- |
| List/read scoped enrollments    | `enrollments.read`      | All                 | Assigned active Brand scope                                | No            |
| Create participant enrollment   | `enrollments.create`    | All                 | Participant they provisioned + assigned active Brand scope | No            |
| Change planned Week count       | `enrollments.update`    | All                 | Assigned active Brand scope; `NOT_STARTED` only            | No            |
| Cancel enrollment               | `enrollments.cancel`    | All                 | Assigned active Brand scope; `NOT_STARTED` only            | No            |
| Read own enrollment list/detail | `enrollments.read_self` | No separate need    | No                                                         | Own rows only |

`TRAINER` receives the first four permissions; `TRAINEE` receives only `enrollments.read_self`.
An active, scoped non-cancelled enrollment extends Trainer participant **read** visibility, but never
permits profile update, disable, or invitation reissue unless that Trainer is the original provisioner.

## Curriculum versioning

| Capability                          | Permission                                                                                                            | Super Administrator | Trainer                                       | Trainee |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------- | ------- |
| Read Brand-scoped Curricula         | `curricula.read`                                                                                                      | All                 | Assigned active Brand scope                   | No      |
| Create/update Curriculum            | `curricula.create`, `curricula.update`                                                                                | All                 | Assigned active Brand scope                   | No      |
| Archive Curriculum                  | `curricula.archive`                                                                                                   | Yes                 | No                                            | No      |
| Read/create/update/publish versions | `curriculum_versions.read`, `curriculum_versions.create`, `curriculum_versions.update`, `curriculum_versions.publish` | All                 | Assigned active Brand scope                   | No      |
| Manage Draft Weeks                  | `curriculum_weeks.manage`                                                                                             | All                 | Assigned active Brand scope                   | No      |
| Manage Draft Modules                | `curriculum_modules.manage`                                                                                           | All                 | Assigned active Brand scope                   | No      |
| Bind enrollment version             | `enrollments.update` + `curriculum_versions.read`                                                                     | All                 | Assigned active Brand scope on both resources | No      |

All nested Curriculum actions resolve `Week → Version → Curriculum → Brand` or
`Module → Week → Version → Curriculum → Brand` on the server. The UI never supplies scope authority.

## Materials and learning content

| Capability                                   | Permission                                                                      | Super Administrator       | Trainer                     | Trainee                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- | --------------------------- | --------------------------------------------------------- |
| Read Material metadata                       | `materials.read`                                                                | All                       | Assigned active Brand scope | No                                                        |
| Create/update/remove/reorder Draft Materials | `materials.create`, `materials.update`, `materials.remove`, `materials.reorder` | All                       | Assigned active Brand scope | No                                                        |
| Upload or replace Draft Material files       | `materials.upload` + mutation permission                                        | All                       | Assigned active Brand scope | No                                                        |
| Read own learning content                    | `learning_content.read_self`                                                    | Via management permission | No                          | Exact own non-cancelled Enrollment and bound Version only |

Published and Retired Material structures are immutable. Material metadata and bytes are never granted by
a submitted Brand ID, a frontend selection, or Brand membership alone; server-side parent-chain scope or
the exact participant Enrollment-to-CurriculumVersion binding is mandatory.

## Learning consumption

| Capability                                                        | Permission                   | Super Administrator            | Trainer                                | Trainee                                                                        |
| ----------------------------------------------------------------- | ---------------------------- | ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------ |
| Start/submit own material learning activity and read own progress | `learning_content.read_self` | No participant bypass endpoint | No                                     | Exact active Trainee, own non-cancelled bound Enrollment, exact READY Material |
| Read enrollment material-progress status                          | `learning_progress.read`     | All                            | Assigned active Brand scope, read-only | No                                                                             |

The participant permission never accepts client progress or completion. `learning_progress.read` is read-only;
it does not grant a Trainer any material stream access, activity-session creation, or manual completion.

## Exam engine

| Capability                            | Permission                                                                    | Super Administrator            | Trainer                       | Trainee                                          |
| ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ | ----------------------------- | ------------------------------------------------ |
| Read/create/update draft Exams        | `exams.read`, `exams.create`, `exams.update`                                  | All                            | Active Brand scope            | No                                               |
| Read/create/update/approve Questions  | `questions.read`, `questions.create`, `questions.update`, `questions.approve` | All                            | Active Brand scope            | No                                               |
| Start/answer/submit/read own attempts | `exam_attempts.start_self`, `answer_self`, `submit_self`, `read_self`         | No participant bypass endpoint | No                            | Exact own active Trainee Enrollment/version only |
| Read submitted results                | `exam_results.read`                                                           | All                            | Active Brand scope, read-only | No                                               |

Exam start additionally requires server-verified material completion for the exact Enrollment and Exam scope.

## Training progress

| Capability                                 | Permission                    | Super Administrator            | Trainer                                | Trainee                             |
| ------------------------------------------ | ----------------------------- | ------------------------------ | -------------------------------------- | ----------------------------------- |
| Read own dashboard and Enrollment progress | `training_progress.read_self` | No participant bypass endpoint | No                                     | Exact active Trainee own Enrollment |
| Read participant Enrollment progress       | `learning_progress.read`      | All                            | Active assigned Brand scope, read-only | No                                  |

Neither permission can create an activity session, change material progress, submit an Exam, set a score, or
mark an Enrollment complete. Training status and basis points are derived server-side only.

## AI question authoring

| Capability                                        | Permission                                          | Super Administrator | Trainer                                | Trainee |
| ------------------------------------------------- | --------------------------------------------------- | ------------------- | -------------------------------------- | ------- |
| Request/read/cancel source-grounded AI draft jobs | `questions.ai_generate` + Exam authoring permission | All                 | Active Brand scope, Draft Version only | No      |

This permission does not approve a Question, publish a definition, access participant data, or grant any
assessment attempt/scoring ability.

# Reporting (TASK-013)

| Capability       | SUPER_ADMIN                | TRAINER                          | TRAINEE |
| ---------------- | -------------------------- | -------------------------------- | ------- |
| `reports.read`   | centralized bypass; global | active assigned Brand scope only | denied  |
| `reports.export` | centralized bypass; global | active assigned Brand scope only | denied  |

Reporting never expands Brand scope. Exports apply the same scope and filters at request time.

## Certificates (TASK-015)

| Capability                                        | Permission               | SUPER_ADMIN                    | TRAINER                                                | TRAINEE                                        |
| ------------------------------------------------- | ------------------------ | ------------------------------ | ------------------------------------------------------ | ---------------------------------------------- |
| Read/download certificate metadata and PDF        | `certificates.read`      | Centralized global bypass      | Effective Trainer role plus current active Brand scope | No                                             |
| Issue/regenerate completed Enrollment certificate | `certificates.issue`     | Centralized global bypass      | Current active Brand scope only                        | No                                             |
| Read/download own certificate                     | `certificates.read_self` | No participant bypass endpoint | No                                                     | Active Trainee and exact certificate ownership |
| Revoke certificate                                | `certificates.revoke`    | Only baseline actor            | No                                                     | No                                             |

Certificate scope is always evaluated by the API at request time. Revoked certificates remain historical but
normal downloads are denied; no permission grants public verification or a public storage URL.
