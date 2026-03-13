# The History Gauntlet

A trivia game app — daily history challenges across six difficulty tiers.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Mobile:** React Native (TypeScript)
- **API:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1, R2 (game storage), Hyperdrive → Neon Postgres
- **Dashboard:** React + Vite + TanStack Router + TanStack Query (CF Pages)
- **OTA Updates:** BundleMudge
- **Auth:** None in V1 (V2: better-auth with magic link + OAuth2)

## Project Structure

```
/packages
  /api          — Hono API (Cloudflare Workers)
  /mobile       — React Native app
  /dashboard    — Admin dashboard (React SPA on CF Pages)
/shared         — Shared types, constants, validators, theme
```

## Code Rules — STRICTLY ENFORCED

### TypeScript
- Always TypeScript, never vanilla JS
- No `any` types, no empty argument lists — strict TS everywhere
- Enable strict mode in all tsconfigs

### File Standards
- **250 LOC maximum per file** — no exceptions
- **One function per file** (for utilities/helpers)
- Break out components — reuse, never inline complex logic
- Never hardcode data or configs — use env vars, constants files, or config objects
- Never use emojis — always custom SVG icon components with `iconKey` mapping

### Testing
- Tests must be thorough and meaningful — test real behavior, edge cases, failure modes
- No "green checkmark" tests that just assert truthy values
- Integration tests where appropriate

### Linting & Formatting
- Strict ESLint config
- Strict TypeScript compiler options
- Consistent formatting (Prettier or Biome)

## Agent & Model Rules

- Always use agent team, never subagents
- Always use Opus 4.6, never Haiku or Sonnet
- Always ask questions when unsure — never guess

## V1 Scope

- Singleplayer daily games
- Questions pre-generated and stored in R2
- Local device storage for game state/history
- Admin dashboard for question management and game generation
- No auth in V1 (reserved for V2 with better-auth)
- No multiplayer, no leaderboard, no private games (V2+)

## Key Feature: User-Selectable Difficulty

- Daily game contains questions for ALL six tiers
- Users choose which tiers to play (at least one required)
- Scoring and ranks are relative to selected question count
- Tier preferences persist locally across sessions

## Design Language (mirrors jsx.md)

- Antique/parchment aesthetic — dark, warm, scholarly
- Background: dark brown gradients (#1a1410, #2c2218, #1e1a14, #0f0d0a)
- Text: warm cream/gold (#e8d9b8, #d4c5a9, #b0a48a, #887a62)
- Accent: muted gold (#8b7355)
- Correct: green (#4a7c59, #a8e6b0) / Wrong: red (#8b2d2d, #e6a8a8)
- Typography: system serif (Palatino Linotype / Georgia)
- Cards: gradient bg with #3d3225 border, 12px radius
- Buttons: transparent with gold border, fill on hover
- Dividers: gradient transparent-gold-transparent, 2px
- Animations: fade-in 0.4s, slide-up 12px, pulse on streak
- All icons: custom SVGs, no emojis anywhere
- Tier colors: Novice (#4a7c59), Apprentice (#5c6d3f), Journeyman (#8d6e3f), Scholar (#8b4513), Master (#6a1b3a), Grandmaster (#1a1a2e)
