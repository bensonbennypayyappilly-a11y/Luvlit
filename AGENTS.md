# AGENTS.md

LuvLit — a TanStack Start + Supabase local-business marketplace.

- Database schema/RLS changes live in `supabase/migrations/`, applied via `npx supabase db push`.
- `npm run typecheck` (`tsc --noEmit`) runs automatically before `npm run build`.
- `npm test` runs the Vitest suite.
