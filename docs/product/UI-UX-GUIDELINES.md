# UNICOM University UI/UX Guidelines

## Design language

Use the shared primitives from `@unicom/ui` before creating a page-specific visual variant. The
application uses a light page surface, white cards, slate text, indigo primary actions, and the
same visible focus ring across all roles. Token values live in `apps/web/app/globals.css`.

## App shell and navigation

Authenticated pages render inside one role-aware application shell. Navigation visibility improves
wayfinding only; the API remains the sole authorization boundary. Super Administrators see global
operations, Trainers see only operational routes, and Participants see My Training and Certificates.
The mobile drawer supports Escape, focus containment, focus restoration, and closes after navigation.

## Components

| Component       | Recommended use                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| `Button`        | Primary, secondary, destructive, and ghost actions; use `loading` for mutations. |
| `Card`          | Grouped content, dashboard metrics, and bounded forms.                           |
| `StatusBadge`   | Any canonical lifecycle status. It always includes a text label.                 |
| `ConfirmDialog` | Irreversible actions such as certificate revocation. State the impact plainly.   |

Use semantic `button`, `label`, `table`, `caption`, headings, and landmarks. Icon-only controls
need accessible labels. Do not create clickable `div` elements.

## Page pattern

Pages use an optional eyebrow, one clear H1, short safe description, and a predictable primary
action. Use skeletons while loading, explanatory empty states when there is no data, and retryable
safe error states for network/service failures. Do not render API error payloads directly.

## Status, dates, and percentages

Use `StatusBadge` for lifecycle labels. Use `formatDate` and `formatPercentage` from
`apps/web/lib/presentation.ts`; percentages are display-only bounded values from server basis points.
Never recompute a canonical score, completion state, or authorization result in the browser.

## Responsive and accessibility baseline

Support 360px, 390px, 768px, 1024px, and 1440px layouts. Controls target at least 44px height where
practical. Dense tables may scroll horizontally, but their primary actions remain reachable. Keep
content readable without color alone, use a logical heading sequence, preserve visible keyboard focus,
respect reduced motion, and ensure dialogs restore focus on close.

## Terminology and sensitive data

Use: Participant, Trainer, Super Administrator, Brand, Curriculum, Week, Module, Material, Exam,
Training, and Certificate. Do not display NIK, unmasked sensitive fields, security tokens, private
storage paths, answer keys, or raw service errors. Certificate pages never introduce public share or
verification links.
