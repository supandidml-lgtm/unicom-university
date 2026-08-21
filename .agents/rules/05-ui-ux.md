# Unicom University — UI/UX Rule

Read `00-master.md`, `04-frontend.md`, and the MASTER PRD first.

## Taste Skill Requirement

During Phase 0, install the approved Taste Skill:

`npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`

After installation:

1. locate the relevant `SKILL.md`;
2. read it before major UI implementation;
3. apply its design discipline;
4. never allow it to override the MASTER PRD, security rules, accessibility, or business logic.

If installation is required by the active phase and fails, report the failure rather than pretending the requirement is complete.

## Product Character

Unicom University is an internal enterprise LMS.

Desired character:

- clean;
- professional;
- modern;
- bright;
- structured;
- efficient;
- trustworthy;
- easy to scan.

Primary background is **white**.

Use bright accents intentionally, not decoratively.

## Visual Direction

Preferred semantic color intent:

- blue/sky/cyan: primary/action/information;
- green/emerald: success;
- orange/amber: warning;
- red: error/danger.

Do not use excessive unrelated colors.

Use neutral surfaces and subtle dividers to organize dense information.

## Avoid AI-Slop

Do not produce:

- generic template dashboard appearance;
- giant marketing-style hero headings inside operational screens;
- excessive gradients;
- excessive glassmorphism;
- every section inside a rounded card;
- excessive pill buttons;
- huge border radii everywhere;
- decorative blobs/illustrations without purpose;
- random icon styles;
- arbitrary colored shadows;
- excessive whitespace that reduces useful information density;
- animations that delay work.

UI must look designed for Unicom University's workflow, not copied from a generic SaaS template.

## Design Tokens

Create and reuse consistent tokens for:

- color;
- typography;
- spacing;
- border radius;
- border;
- shadow;
- motion;
- layout widths.

Do not use random values on every screen.

Use a coherent spacing rhythm.

## Typography

Use a professional sans-serif stack.

Establish clear hierarchy for:

- page title;
- section heading;
- body;
- label;
- metadata;
- table text.

Operational dashboards should not use oversized display typography.

Keep line length and readability appropriate for learning content.

## Layout

Core application may use:

- persistent/compact sidebar on desktop;
- responsive mobile navigation;
- top context/header area;
- main content region.

Preserve consistent alignment and content widths.

Use cards only when the information is truly a distinct grouped object or metric—not as the default container for every paragraph.

## Dashboard Design

Dashboard priorities:

1. current training status;
2. progress;
3. next action;
4. score/pass information;
5. deadlines/risk;
6. supporting analytics.

For Staff, prioritize "Continue Learning" and current Week.

For Trainer/Supervisor, prioritize monitoring and exceptions.

For Super Admin, prioritize system overview and management access.

## Progress Visualization

Show these as distinct concepts:

- Course Progress;
- Exam Progress;
- Overall Training Progress;
- Average Score;
- Pass Rate.

Never visually imply that Score and Progress are the same metric.

Use labels and accessible text, not color alone.

## Learning Screen

Learning screens must reduce distraction.

Video/PDF content should be visually dominant.

Show:

- breadcrumb/context;
- course/week title;
- material sequence;
- progress;
- completion state;
- next available step.

Locked content should clearly explain why it is locked.

## Exam Screen

Exam UI should focus attention.

Avoid dashboard clutter during an attempt.

Make:

- current question;
- progress;
- remaining time if enabled;
- navigation rules;
- submit action

clear and predictable.

Do not reveal correct answers before allowed result state.

## Tables and Administration

Enterprise tables should be compact but readable.

Use clear:

- column headers;
- filters;
- search;
- status indicators;
- pagination;
- empty states.

Avoid turning every row into a large card on desktop.

Use a purposeful mobile adaptation.

## Forms

Forms should be grouped by task.

Do not create overly long undifferentiated forms.

Use helper text where business meaning is not obvious.

Clearly mark required fields.

Provide actionable errors.

## Icons

Use one consistent icon family.

Do not mix multiple icon styles unless necessary.

Icons must support meaning, not replace clear text for critical actions.

## Motion

Use subtle motion only for:

- state transition;
- feedback;
- orientation.

Respect reduced motion.

No unnecessary parallax, bouncing, or decorative loops.

## Accessibility

Target WCAG 2.2 AA for core workflows where practical.

Required:

- keyboard accessibility;
- visible focus;
- semantic structure;
- sufficient contrast;
- accessible modal/dialog behavior;
- form labels/errors;
- non-color status cues.

## Responsive Verification

Verify at minimum:

- mobile;
- tablet;
- standard desktop;
- wide desktop where dashboard density changes.

Check:

- navigation;
- tables;
- modal/dialog;
- learning player/viewer;
- forms;
- dashboard metric layout.

Do not mark UI complete before browser verification.

## Visual Consistency Gate

Before completing a UI phase confirm:

- spacing is consistent;
- typography hierarchy is consistent;
- component variants are reused;
- colors are semantic;
- no obvious template/AI-slop pattern was introduced;
- mobile layout is usable;
- accessibility basics pass;
- screenshots/browser review show no broken states.
