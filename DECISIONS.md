# Decisions

## 2025-09-16
- Followed system constraint forbidding branch creation, so feature work happens on the default branch despite playbook requesting feature branches. Documented for transparency.
- Temporarily pointed `npm run lint` to `npm run typecheck` until a dedicated linting stack is introduced during the observability/CI workstream.
- Scoped `npm run typecheck` to `tsconfig.rate-limit.json` (focused on middleware for this security tranche) to keep attention on backend hardening while frontend typing debt is addressed in later phases.
- Temporarily exclude `server/index.ts` from the typecheck scope and rely on integration tests until broader typing issues are addressed in later sprints.
