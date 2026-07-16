# Learning Platform — AI Infrastructure Engineer

A multi-career learning platform. v1 ships one career path (AI Infrastructure Engineer); the architecture supports adding more without code changes — just new content.

**Live:** https://learning.theemergingsmart.com

## Architecture

```
Career Path → Stage → Milestone → Skills → Quiz → Project → Portfolio Evidence
```

- **Stack:** React + TypeScript + Vite, Tailwind v4, React Router
- **Backend:** Firebase Auth (Google), Cloud Firestore
- **Hosting:** Cloudflare Pages, custom domain via CNAME

See `Learning_Platform_Implementation_Plan_v2.md` (in the project history) for the full Firestore schema and phase-by-phase build plan this repo was built against.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase project's config values
npm run dev
```

You'll need a Firebase project with **Authentication → Google** and **Firestore Database** both enabled. See `.env.example` for the exact keys required.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run lint` | oxlint |
| `npm run test` | Vitest unit tests (quiz scoring, GitHub URL parsing) |
| `npm run preview` | Preview the production build locally |

## Seeding content

Career path content (stages, milestones, skills, quizzes, projects) lives as JSON under `scripts/seed/content/` and is loaded into Firestore via a one-time admin script — it is **not** editable from the app itself (no admin UI in v1).

```bash
# 1. Firebase Console → Project Settings → Service Accounts → Generate new private key
#    Save it OUTSIDE this repo (e.g. a sibling `secrets/` folder), never commit it.
$env:SERVICE_ACCOUNT_PATH="C:\path\to\serviceAccountKey.json"   # PowerShell
# export SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json  # bash/zsh

npx tsx scripts/seed/seed.ts scripts/seed/content/ai-infra-engineer.json
```

Safe to re-run — uses deterministic doc IDs derived from content keys, so re-seeding overwrites existing docs rather than duplicating them. Useful whenever you edit the content JSON (new questions, updated skill descriptions, etc.).

## Firestore rules & indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Rules: content collections (`careerPaths`, `stages`, `milestones`, `skills`, `quizzes`, `projects`) are public-read, write-only via the Admin SDK seed script. User-owned collections (`progress`, `quizAttempts`, `projectProgress`, `users`) are scoped to the signed-in user via a `uid` field check — **not** a document-ID pattern check, since Firestore can only verify list/query requests against rules that check `resource.data` fields matching the query's `where` filters, not ID patterns. See `firestore.rules` for the current version.

## Deployment (Cloudflare Pages)

Connected to this repo; pushes to `main` auto-deploy. Two things that aren't obvious from the Cloudflare UI alone:

- **`public/_headers`** relaxes `Cross-Origin-Opener-Policy` to `same-origin-allow-popups` — without this, Cloudflare's default COOP header silently breaks Firebase's `signInWithPopup` Google sign-in (the popup completes visually, but the resulting auth session doesn't fully establish, so Firestore reads fail with "Missing or insufficient permissions").
- **`wrangler.toml`** sets `not_found_handling = "single-page-application"` so client-side routes (`/dashboard`, `/roadmap/milestones/...`) don't 404 on direct load or refresh.
- Environment variables (`VITE_FIREBASE_*`) are baked into the JS bundle **at build time** by Vite — adding/editing them in Cloudflare's dashboard requires triggering a fresh deploy to take effect, not just a settings save.

## Known gaps (intentional, for v1)

- Quiz scoring happens client-side — sufficient for a personal learning tool, not tamper-proof against someone inspecting network calls.
- GitHub project verification (`src/services/github.ts`) checks that a repo is real, public, has commits, and roughly matches stated requirements via GitHub's public API — it does not review code quality or correctness.
- No admin UI — content changes go through editing the seed JSON and re-running the seed script.
- Text-answer quiz questions score via substring match, not exact match, to tolerate minor phrasing differences.
