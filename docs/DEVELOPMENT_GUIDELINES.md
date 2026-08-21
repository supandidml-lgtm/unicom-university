# Development Guidelines — Unicom University

## Quality Standards
1. **Strict TypeScript**: Never use `any` without technical justification. Do not suppress compiler errors with `@ts-ignore`.
2. **Design Discipline (Taste Skill)**:
   - Enterprise white-dominant interface (`#ffffff`).
   - Clean slate text hierarchy, subtle `#e2e8f0` borders.
   - Avoid generic AI dashboard clutter (no purple glow, no oversized hero cards, no glassmorphism).
3. **Server Authority**:
   - Never trust frontend values for progress, scores, or permissions.
   - All critical domain formulas reside in `@unicom/config` and backend services.
4. **Testing Requirement**:
   - Every domain contract, validation schema, and calculation function must have unit tests.
   - Run `npm run test` before submitting changes.
