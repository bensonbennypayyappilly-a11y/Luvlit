# Commit verification — Lovable tooling removal & lockfile sync

## Step 1 — git status / diff (before this session's changes)

```
 M package.json
 M src/routeTree.gen.ts
 M vite.config.ts
?? .vercel/
?? AUDIT.md
?? PHASE1_REPORT.md
```

`git log --oneline -- package.json` → last commit touching it was `be10665` (Phase 1's `typecheck` script only). `git log --oneline -- vite.config.ts` → only the original template commit `d5f2402`. Confirmed: both were uncommitted working-tree edits, not part of any prior commit — exactly as you suspected.

## Step 2 — "lovable" grep beyond README.md / public/robots.txt / AUDIT.md

Found and **left untouched** (not requested, and not pure documentation so I didn't treat them like AUDIT.md either — flagging for your decision):
- `AGENTS.md:1-10` — a `<!-- LOVABLE:BEGIN -->...END -->` git-sync warning banner about not force-pushing/rewriting history on the Lovable-connected branch.
- `src/routes/__root.tsx:94-95` — `og:image`/`twitter:image` meta tags pointing at a Lovable-hosted Cloudflare R2 URL (filename contains `...lovable.app-....png`, a Lovable-generated preview screenshot). Functional code, not docs.
- `src/integrations/supabase/client.ts:41`, `client.server.ts:41`, `src/integrations/supabase/auth-middleware.ts:44` — error string `"...Connect Supabase in Lovable Cloud."` shown when Supabase env vars are missing. Functional code, not docs.
- `.vercel/output/**` — untracked build-output copies of the same strings; not source, regenerates on every build, no action needed.

**Edited as requested:** `README.md:187` and `public/robots.txt:16`, replacing `luvlt.lovable.app` → `luvlit.in`. `AUDIT.md` and the rest of README.md's Lovable prose left as historical record, per your instruction.

## Steps 3-5 — fresh install, build/typecheck, lockfile diff, commit

- `rm -rf node_modules && rm package-lock.json && npm install` (true from-scratch, no lockfile present) regenerated a lockfile **byte-identical** to the one committed in `be10665` — confirmed via `git diff HEAD -- package-lock.json` returning empty. **This specific check says the lockfile was already correct** — it was already generated from the Lovable-free `package.json`, so nothing to stage there.
- `npm run build` and `npm run typecheck` both passed cleanly.
- Committed `package.json`, `vite.config.ts`, `README.md`, `public/robots.txt` (package-lock.json had nothing to stage) as `694d04f`: "chore: remove Lovable build tooling, finalize Vercel config, sync lockfile".

## Step 6 — clean-clone simulation: **found a real, separate lockfile problem**

`rm -rf node_modules && npm install` (lockfile present this time, only `node_modules` deleted) produced a **different** lockfile than the from-scratch install: 401 packages instead of 400, with `ajv@6.15.0` and `json-schema-traverse@0.4.1` each duplicated as nested entries under both `node_modules/@eslint/eslintrc` and `node_modules/eslint`, instead of a single hoisted top-level `node_modules/ajv`. `npm run build` and `npm run typecheck` still passed on this variant.

Per your instruction, I stopped before committing this and investigated further rather than guessing. The actual root cause: **`npm ci` (strict, lockfile-authoritative install — what most CI/deploy pipelines, including Vercel, actually use) rejects the currently-committed lockfile outright:**

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json ... are in sync. Please update your lock file
npm error with `npm install` before continuing.
npm error Missing: ajv@6.15.0 from lock file
npm error Missing: ajv@6.15.0 from lock file
npm error Missing: json-schema-traverse@0.4.1 from lock file
npm error Missing: json-schema-traverse@0.4.1 from lock file
```

I confirmed the 401-package variant (the one `npm install` produces when a lockfile already exists) **does** pass `npm ci` cleanly, and `npm run build`/`npm run typecheck` both pass on it too.

**So: the "lockfile might be stale" concern was real, just not for the reason originally suspected.** It has nothing to do with the Lovable removal — it's a pre-existing npm dependency-resolution edge case in eslint's transitive `ajv`/`json-schema-traverse` dependencies, where a from-scratch resolve and a resolve-with-existing-lockfile pick different (both individually valid, but different) hoisting layouts, and only one of the two is `npm ci`-clean.

**I did not commit this.** Per your instructions, I'm stopping here and reporting it instead: `package-lock.json` in the working tree right now is the 401-package, `npm ci`-clean variant (verified: `npm run build` and `npm run typecheck` both pass on it). It is **not yet committed** — `git diff -- package-lock.json` will show it against the version in `694d04f`. You can either:
1. Have me commit this corrected lockfile (recommended — it's the one that actually works with `npm ci`), or
2. `git checkout -- package-lock.json` to discard it and keep investigating the eslint/ajv resolution yourself first.

## Final results summary

| Check | Result |
|---|---|
| `npm run build` (after fresh from-scratch install) | ✅ pass |
| `npm run typecheck` (after fresh from-scratch install) | ✅ pass |
| Lockfile vs `HEAD` before commit | No diff — already matched the Lovable-free `package.json` |
| Commit `694d04f` | Done — package.json, vite.config.ts, README.md, public/robots.txt |
| `npm run build` (clean-clone simulation) | ✅ pass |
| `npm run typecheck` (clean-clone simulation) | ✅ pass |
| Lockfile diff after clean-clone simulation | **Diffed** (400 → 401 packages) — not committed, flagged above |
| `npm ci` against the committed (400-package) lockfile | ❌ **fails** — missing `ajv`/`json-schema-traverse` entries |
| `npm ci` against the uncommitted (401-package) lockfile | ✅ pass |

Stopping here per instructions — no further commits made, no Phase 2 work started.
