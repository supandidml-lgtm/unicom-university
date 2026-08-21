# Unicom University — Frontend Rule

Read `00-master.md`, `01-architecture.md`, `05-ui-ux.md`, and the MASTER PRD first.

Preferred frontend baseline: **Next.js + React + TypeScript**.

## Frontend Responsibility

Frontend is responsible for:

- rendering;
- interaction;
- navigation;
- local UI state;
- accessibility;
- calling approved APIs;
- presenting authoritative backend state.

Frontend is NOT authoritative for:

- permission;
- final progress;
- completion;
- exam score;
- pass/fail;
- attempt limit;
- resource ownership.

Never rely on hidden buttons as authorization.

## Type Safety

Use strict TypeScript.

Avoid `any`.

Model API contracts explicitly.

Validate unsafe external/runtime data when necessary.

Do not suppress type errors merely to finish a task.

## Component Design

Prefer small, composable components with clear responsibilities.

Separate:

- reusable UI primitives;
- domain components;
- page/layout composition;
- data access;
- form logic.

Avoid page files that contain all data fetching, business logic, validation, styling, and rendering in one giant component.

## Data Access

Centralize API access.

Do not scatter raw `fetch` calls with inconsistent error behavior throughout UI components.

The API client/service layer should handle:

- base URL;
- credentials/session behavior;
- standardized error parsing;
- request cancellation when relevant;
- typed contracts.

Do not retry unsafe mutation requests blindly.

## Loading and Error States

Every important async view must support:

- loading;
- empty;
- success;
- recoverable error;
- permission denied when relevant.

Never leave a blank screen because an API failed.

Use skeletons/spinners intentionally; do not create excessive motion.

## Forms

Forms must have:

- visible labels;
- field-level validation feedback;
- submit disabled/loading behavior;
- server error handling;
- success feedback;
- duplicate-submit protection.

Client validation improves UX but does not replace server validation.

## Role-Specific Experience

UI must reflect the authorized role:

- Super Admin;
- Trainer;
- Supervisor;
- Staff.

Staff job profile may be:

- Technician;
- Customer Service;
- Admin.

Do not expose irrelevant navigation.

However, remember: actual access control remains backend responsibility.

## Brand/Training Context

Staff should see only assigned training/program context returned by the backend.

Never hardcode brand-specific dashboards with conditional source-code branches when configuration/data can drive the UI.

## Learning UI

Video and PDF screens must prioritize learning content over dashboard decoration.

Learning screen should clearly show:

- course title;
- current material;
- progress;
- sequence/navigation status;
- locked/unlocked state;
- next permitted action.

Do not implement anti-skip or completion logic solely in the browser. The UI enforces UX restrictions while backend validates evidence.

## Exam UI

Exam UI must not receive correct answer flags before final submission.

Support:

- progress through questions;
- validation;
- timer if enabled;
- submit confirmation where appropriate;
- clear completion/result state.

Prevent accidental double submission.

## Tables

Administrative and monitoring tables should support relevant:

- server-side pagination;
- filter;
- search;
- sort.

On small screens, use a deliberate responsive pattern rather than shrinking desktop columns until unreadable.

## Responsive Design

Design for:

- mobile;
- tablet;
- desktop;
- large desktop.

Verify actual breakpoints in browser.

No horizontal overflow except where a deliberate scroll container is the correct pattern.

## Accessibility

Use semantic HTML.

Maintain:

- keyboard navigation;
- visible focus;
- meaningful buttons/links;
- labels;
- accessible errors;
- contrast;
- reduced-motion awareness.

Do not communicate status through color alone.

## Performance

Use appropriate server/client component boundaries.

Avoid unnecessary client-side rendering.

Optimize expensive lists and media.

Do not prematurely add global state libraries when local/server state is sufficient.

Avoid large dependencies for trivial UI behavior.

## No Production Mock Data

Mocks may exist only in explicit development/test fixtures.

Do not ship fake dashboard metrics, fake progress, fake users, or fake exam results as production behavior.

## Browser Verification

For every UI-affecting phase verify:

- desktop;
- at least one mobile viewport;
- navigation;
- loading;
- empty;
- error;
- form states;
- no severe console errors;
- no unexpected failed network calls;
- role-based visibility;
- real data flow when backend exists.

UI is not complete until browser verification passes.
