# The History Gauntlet -- Implementation Plan

## Agent Team Roster

Each agent is a named member of the team, assigned to specific phases and sub-phases. All agents run on Opus 4.6. No subagents. No Haiku. No Sonnet.

| Agent Name | Role | Primary Responsibility |
|------------|------|------------------------|
| `architect` | Lead Architect | Monorepo setup, shared contracts, tsconfigs, CI |
| `api-engineer` | API Engineer | Hono routes, D1 schema, R2 integration, game generation |
| `mobile-engineer` | Mobile Engineer | React Native screens, navigation, state, local DB |
| `ui-artist` | UI/Design Engineer | SVG icons, theme system, styled components, animations |
| `dashboard-engineer` | Dashboard Engineer | TanStack Router/Query, admin pages, forms, previews |
| `qa-engineer` | QA Engineer | Tests for every phase, integration tests, contract tests |
| `integrator` | Integration Lead | Wire packages together, E2E flows, deployment configs |

---

## Phase 0: Foundation

**Owner:** `architect`
**Duration:** First pass
**Goal:** A working monorepo where all packages can build, lint, and run empty shells.

### Sub-phase 0.1: Monorepo Scaffold

**Agent:** `architect`

**Deliverables:**
- `pnpm-workspace.yaml` with `packages/*` and `shared` entries
- Root `package.json` with workspace scripts: `build`, `dev`, `lint`, `test`, `typecheck`
- Root `tsconfig.base.json` with strict mode, path aliases
- `biome.json` with formatting and linting rules
- `.gitignore` covering node_modules, dist, .wrangler, .expo, etc.
- `.nvmrc` pinning Node version

**Contracts:**
- All packages must extend `tsconfig.base.json`
- All packages must have `build`, `dev`, `lint`, `test` scripts
- `shared` package must be importable by all other packages via workspace protocol

**QA (by `qa-engineer`):**
- `pnpm install` succeeds with no warnings
- `pnpm -r build` succeeds (even if outputs are empty)
- `pnpm -r typecheck` passes
- `pnpm -r lint` passes
- Verify path aliases resolve correctly across packages

**Dos:**
- Use `workspace:*` protocol for internal dependencies
- Set `"strict": true` in base tsconfig
- Set `"noUncheckedIndexedAccess": true`
- Set `"exactOptionalPropertyTypes": true`

**Do NOTs:**
- Do not install app-specific dependencies yet (no hono, no react-native)
- Do not create any application code
- Do not use `any` anywhere, even in configs

---

### Sub-phase 0.2: Shared Package

**Agent:** `architect`

**Deliverables:**
- `shared/types/game.ts` -- `DailyGame`, `GameQuestion`, `LocalGameResult`, `LocalAnswer`
- `shared/types/question.ts` -- `Question`, `DifficultyTier`, `TierDefinition`
- `shared/types/api.ts` -- Request/response shapes for all endpoints
- `shared/types/index.ts` -- Barrel export
- `shared/constants/difficulties.ts` -- All six tier definitions with colors, icon keys, sort order, questions-per-day
- `shared/constants/ranks.ts` -- All eight rank definitions with thresholds, icon keys, descriptions
- `shared/constants/game-config.ts` -- Configurable values (max questions per tier, cooldown days, etc.)
- `shared/constants/index.ts` -- Barrel export
- `shared/validators/question.ts` -- Zod schema for Question
- `shared/validators/game.ts` -- Zod schema for DailyGame, GameQuestion
- `shared/validators/index.ts` -- Barrel export
- `shared/package.json` and `shared/tsconfig.json`

**Contracts:**
- Every type must be exported from the barrel
- Every constant must be typed with its corresponding interface
- Zod schemas must match TypeScript types exactly (use `z.infer` to derive types or validate manually)
- No `any` in any type definition
- `options` field on questions must be a 4-tuple `[string, string, string, string]`
- `correctIndex` must be typed as `0 | 1 | 2 | 3`
- `DailyGame.questionsByTier` must be `Record<DifficultyTier, GameQuestion[]>` (not a flat array)

**QA (by `qa-engineer`):**
- Unit tests for all Zod validators: valid data passes, invalid data fails with correct error
- Test that `DifficultyTier` type and `DIFFICULTY_TIERS` constant are in sync
- Test that rank thresholds cover 0-100% without gaps or overlaps
- Test that `questionsPerDay` values across all tiers sum to expected total (35)
- Typecheck passes with strict mode

**Dos:**
- Use `as const satisfies` for constant arrays where possible
- Use discriminated unions where appropriate
- Add JSDoc comments on all public types explaining their purpose

**Do NOTs:**
- Do not put any runtime logic in the types package
- Do not import from any other package (shared is a leaf dependency)
- Do not use enums (use union types instead)
- Do not use `emoji` or emoji characters anywhere -- use `iconKey: string`

---

## Phase 1: API

**Owner:** `api-engineer`
**Depends on:** Phase 0 complete
**Goal:** A deployed Hono API on Cloudflare Workers with D1 question bank and R2 game storage.

### Sub-phase 1.1: API Scaffold + D1 Schema

**Agent:** `api-engineer`

**Deliverables:**
- `packages/api/package.json` with hono, wrangler, vitest dependencies
- `packages/api/tsconfig.json` extending base
- `packages/api/wrangler.toml` with D1 binding, R2 binding, compatibility flags
- `packages/api/src/index.ts` -- Hono app entry with CORS, error handler
- `packages/api/src/middleware/error-handler.ts` -- Global error handling middleware
- `packages/api/src/middleware/validation.ts` -- Zod-based request validation middleware
- `packages/api/src/db/schema.sql` -- D1 table definitions for questions and game_metadata
- `packages/api/vitest.config.ts`

**D1 Schema:**

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,          -- JSON array of 4 strings
  correct_index INTEGER NOT NULL,
  fact TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT
);

CREATE TABLE game_metadata (
  date TEXT PRIMARY KEY,          -- YYYY-MM-DD
  total_questions INTEGER NOT NULL,
  questions_by_difficulty TEXT NOT NULL, -- JSON object
  generated_at TEXT NOT NULL,
  r2_key TEXT NOT NULL
);

CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_used_count ON questions(used_count);
CREATE INDEX idx_questions_last_used ON questions(last_used_at);
```

**Contracts:**
- All routes must use shared types for request/response shapes
- All request bodies must be validated with shared Zod schemas
- Error responses must follow a consistent shape: `{ error: string; details?: unknown }`
- D1 queries must be in dedicated query files, not inline in routes
- Wrangler bindings must be typed via `Env` interface

**QA (by `qa-engineer`):**
- Hono app starts without errors
- Error handler catches and formats thrown errors
- Validation middleware rejects invalid bodies with 400
- Schema SQL is valid and creates tables without errors
- TypeScript compiles with no errors

**Dos:**
- Type the Cloudflare bindings (`D1Database`, `R2Bucket`) in an `Env` interface
- Use `hono/validator` or custom middleware for validation
- Return proper HTTP status codes (200, 201, 400, 404, 500)

**Do NOTs:**
- Do not write route handlers yet (just the scaffold)
- Do not hardcode any configuration
- Do not use `console.log` for error handling (use structured error responses)

---

### Sub-phase 1.2: Question CRUD Routes

**Agent:** `api-engineer`

**Deliverables:**
- `packages/api/src/routes/admin-questions.ts` -- All question CRUD routes
- `packages/api/src/db/queries/questions.ts` -- Typed D1 query functions
- `packages/api/src/services/question-service.ts` -- Business logic layer

**Endpoints:**
- `GET /api/admin/questions` -- Paginated list with filters (difficulty, category, search)
- `POST /api/admin/questions` -- Create with Zod validation
- `PUT /api/admin/questions/:id` -- Update with Zod validation
- `DELETE /api/admin/questions/:id` -- Soft or hard delete
- `POST /api/admin/questions/bulk` -- Bulk import from JSON array

**Contracts:**
- Pagination via `?page=1&limit=20` query params, response includes `{ data, total, page, limit }`
- Filters via query params: `?difficulty=Novice&category=Ancient&search=rome`
- All mutations return the created/updated resource
- Bulk import validates each question individually, returns `{ imported: number; errors: Array<{ index: number; error: string }> }`

**QA (by `qa-engineer`):**
- Test each endpoint with valid data -- correct status codes and response shapes
- Test each endpoint with invalid data -- 400 with descriptive errors
- Test pagination: first page, last page, out-of-range page
- Test filters: single filter, combined filters, no results
- Test bulk import: all valid, some invalid, all invalid
- Test update of non-existent question returns 404
- Test delete of non-existent question returns 404
- Verify `correctIndex` is validated as 0-3
- Verify `options` must be exactly 4 strings
- Verify `difficulty` must be a valid `DifficultyTier`

**Dos:**
- Use parameterized queries (never string concatenation for SQL)
- Return 201 for successful creation
- Include `updatedAt` on every mutation

**Do NOTs:**
- Do not put SQL in route handlers
- Do not return raw D1 results (map to typed interfaces)
- Do not allow `correctIndex` outside 0-3

---

### Sub-phase 1.3: Game Generation + R2

**Agent:** `api-engineer`

**Deliverables:**
- `packages/api/src/routes/admin-games.ts` -- Game generation and management routes
- `packages/api/src/routes/games.ts` -- Public game fetching routes
- `packages/api/src/services/game-generator.ts` -- Selection algorithm + R2 upload
- `packages/api/src/services/r2-client.ts` -- R2 read/write abstraction

**Endpoints:**
- `POST /api/admin/games/generate` -- Generate game for a date, upload to R2
- `GET /api/admin/games` -- List generated games
- `GET /api/admin/games/:date/preview` -- Preview a game
- `GET /api/games/daily` -- Public: today's game from R2
- `GET /api/games/:date` -- Public: specific date's game from R2
- `GET /api/health` -- Health check

**Selection Algorithm:**
1. Accept target date and optional tier distribution override
2. For each tier, query questions not used in last N days (from `game-config.ts`)
3. Sort by `usedCount` ASC, then random within equal counts
4. Select the required number per tier
5. If insufficient questions for a tier, return error (do not silently reduce)
6. Build `DailyGame` object with `questionsByTier` map
7. Upload JSON to R2 at `games/YYYY-MM-DD.json`
8. Insert row into `game_metadata` table
9. Update `usedCount` and `lastUsedAt` on all selected questions
10. Return the generated game for preview

**Contracts:**
- `GET /api/games/daily` must return the game for today's date in UTC
- `GET /api/games/:date` must validate date format (`YYYY-MM-DD`)
- If no game exists for a date, return 404 with clear message
- Generated game must match `DailyGame` Zod schema exactly
- R2 key format: `games/YYYY-MM-DD.json`
- Game generation must be idempotent for the same date (overwrite, not duplicate)

**QA (by `qa-engineer`):**
- Test game generation with sufficient questions -- correct structure, correct counts per tier
- Test game generation with insufficient questions -- returns error, does not upload partial game
- Test duplicate generation for same date -- overwrites cleanly
- Test `GET /api/games/daily` -- returns today's game
- Test `GET /api/games/:date` -- returns correct game
- Test `GET /api/games/:date` with invalid date format -- 400
- Test `GET /api/games/:date` with no game -- 404
- Test that `usedCount` and `lastUsedAt` are updated after generation
- Test that questions used recently are excluded from selection
- Validate generated JSON against `DailyGame` Zod schema
- Test health endpoint returns 200

**Dos:**
- Wrap generation in a transaction (D1 supports basic transactions)
- Log generation metadata (date, question count, duration)

**Do NOTs:**
- Do not serve games from D1 at runtime (always read from R2 for public endpoints)
- Do not allow generation without sufficient questions (fail explicitly)
- Do not leak admin endpoints without noting they need auth in V2

---

## Phase 2: Mobile App

**Owner:** `mobile-engineer` and `ui-artist`
**Depends on:** Phase 0 complete, Phase 1.3 complete (need working API)
**Goal:** A working React Native app with all screens, local storage, and the full game loop.

### Sub-phase 2.1: Mobile Scaffold + Navigation

**Agent:** `mobile-engineer`

**Deliverables:**
- `packages/mobile/package.json` with react-native, expo, react-navigation dependencies
- `packages/mobile/tsconfig.json` extending base
- `packages/mobile/app.json` with app config
- `packages/mobile/src/navigation/RootNavigator.tsx` -- Stack navigator with all screens
- `packages/mobile/src/navigation/types.ts` -- Typed navigation params
- Empty screen files for all 6 screens (Splash, Home, DifficultySelect, Game, Results, History)
- `packages/mobile/src/services/api-client.ts` -- Typed HTTP client for game API

**Contracts:**
- Navigation must be fully typed (no `as any` on navigation props)
- API client must use shared types for all responses
- API base URL must come from environment config (not hardcoded)
- All screens must be functional components with typed props

**QA (by `qa-engineer`):**
- App launches without crashes
- Navigation between all screens works
- API client types match shared types
- TypeScript compiles with no errors

**Dos:**
- Use `@react-navigation/native-stack` for performance
- Type all navigation params with `NativeStackScreenProps`

**Do NOTs:**
- Do not build any UI yet (just navigation shells)
- Do not install unnecessary dependencies

---

### Sub-phase 2.2: Theme System + SVG Icons

**Agent:** `ui-artist`

**Deliverables:**
- `packages/mobile/src/theme/colors.ts` -- All colors from jsx.md design
- `packages/mobile/src/theme/typography.ts` -- Font families, sizes, weights
- `packages/mobile/src/theme/spacing.ts` -- Spacing scale
- `packages/mobile/src/theme/index.ts` -- Barrel export with `theme` object
- All SVG icon components in `packages/mobile/src/components/icons/`:
  - Rank icons: `WheatIcon`, `QuillIcon`, `BackpackIcon`, `CrownIcon`, `ScrollIcon`, `ColumnsIcon`, `LightningIcon`, `CrystalBallIcon`
  - Question category icons: `SwordIcon`, `ShieldIcon`, `BookIcon`, `AnchorIcon`, `GlobeIcon`, `BellIcon`, `CastleIcon`, `MountainIcon`, `FlameIcon`
  - UI icons: `CheckIcon`, `CrossIcon`, `ChevronRightIcon`, `ClockIcon`, `TrophyIcon`, `StarIcon`
- `packages/mobile/src/components/icons/index.ts` -- Icon registry mapping `iconKey` string to component

**Contracts:**
- Every color in jsx.md must have a named constant (no hex literals in components)
- Every icon must accept `size: number` and `color: string` props
- Icon registry must be typed: `Record<string, React.ComponentType<IconProps>>`
- All icons must use `react-native-svg` (not web SVG elements)
- Icons must be clean, minimal, line-art style matching the antique aesthetic

**QA (by `qa-engineer`):**
- All icon components render without errors
- Icon registry resolves every `iconKey` used in shared constants
- Theme values match jsx.md hex values exactly
- No hardcoded colors or font sizes outside theme

**Dos:**
- Use `react-native-svg` for all SVG rendering
- Design icons to look good at 16px, 24px, 32px, and 48px
- Use consistent stroke widths across all icons

**Do NOTs:**
- Do not use emoji characters anywhere
- Do not use web-specific SVG APIs
- Do not put colors or sizes directly in icon files (accept via props, use theme defaults)

---

### Sub-phase 2.3: Common Components

**Agent:** `ui-artist`

**Deliverables:**
- `GauntletButton.tsx` -- Primary/secondary button with hover states from jsx.md
- `OrnamentDivider.tsx` -- The gradient divider line from jsx.md
- `DifficultyBadge.tsx` -- Pill badge showing tier name with tier colors
- `Card.tsx` -- The dark gradient card container from jsx.md
- `LoadingSpinner.tsx` -- Themed loading indicator

**Contracts:**
- Every component must use theme values only (no inline hex)
- Every component must accept standard RN style overrides via `style` prop
- Every component must be under 250 LOC
- Components must handle light/dark considerations (V1 is dark only, but do not hardcode)

**QA (by `qa-engineer`):**
- Snapshot tests for each component in default state
- Test that all components render without errors with minimal props
- Test that style overrides are applied correctly
- Verify no hardcoded colors or dimensions

**Dos:**
- Use `StyleSheet.create` for all styles
- Accept `testID` prop for testing

**Do NOTs:**
- Do not use inline styles
- Do not use `any` for style props

---

### Sub-phase 2.4: Local Database (SQLite)

**Agent:** `mobile-engineer`

**Deliverables:**
- `packages/mobile/src/services/local-db.ts` -- SQLite database initialization and migration
- `packages/mobile/src/services/game-storage.ts` -- CRUD for `LocalGameResult`
- `packages/mobile/src/services/stats-service.ts` -- Computed stats (total games, averages, streaks)
- `packages/mobile/src/services/cache-service.ts` -- Cache daily game JSON locally
- `packages/mobile/src/stores/settings-store.ts` -- Tier preferences persistence

**Local Tables:**

```sql
CREATE TABLE game_results (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  selected_tiers TEXT NOT NULL,   -- JSON array of tier strings
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  best_streak INTEGER NOT NULL,
  answers TEXT NOT NULL,           -- JSON array of LocalAnswer
  completed_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_game_results_date ON game_results(date);
```

**Contracts:**
- `game-storage.ts` must expose: `saveResult`, `getResultByDate`, `getAllResults`, `getRecentResults(limit)`
- `stats-service.ts` must expose: `getAllTimeStats`, `getStatsByTier`, `getBestGame`, `getCurrentStreak`
- `cache-service.ts` must expose: `cacheDailyGame`, `getCachedGame(date)`, `clearOldCache(keepDays)`
- `settings-store.ts` must expose: `getSelectedTiers`, `setSelectedTiers`
- All functions must return typed results using shared types
- Database must handle migrations gracefully (version tracking)

**QA (by `qa-engineer`):**
- Test save and retrieve game result
- Test stats calculation with known data: 0 games, 1 game, many games
- Test tier preferences: save, retrieve, update, default (all tiers)
- Test cache: store game, retrieve, miss, clear old entries
- Test database migration from empty state
- Test concurrent writes do not corrupt data

**Dos:**
- Use `expo-sqlite` for SQLite access
- Version the database schema for future migrations
- Default tier selection to all tiers enabled

**Do NOTs:**
- Do not use WatermelonDB (overkill for V1)
- Do not store raw API responses without mapping to typed objects
- Do not block the UI thread with database operations (use async)

---

### Sub-phase 2.5: Game Screen Components

**Agent:** `ui-artist`

**Deliverables:**
- `QuestionCard.tsx` -- Question text in styled card (mirrors jsx.md question display)
- `OptionButton.tsx` -- Answer option with correct/incorrect/neutral states
- `ProgressBar.tsx` -- Gradient progress bar with tier-colored segments
- `ScoreHeader.tsx` -- Question counter, score, streak display
- `FactReveal.tsx` -- "Did you know?" card with fade-in animation
- `StreakIndicator.tsx` -- Flame icon with pulse animation for streaks >= 3

**Contracts:**
- `OptionButton` must accept `state: 'neutral' | 'selected-correct' | 'selected-wrong' | 'revealed-correct'`
- `ProgressBar` must calculate width from `currentQuestion / totalQuestions`
- `StreakIndicator` must only render when streak >= 3
- `FactReveal` must animate in with fade + slide (0.4s ease)
- All components use theme values exclusively

**QA (by `qa-engineer`):**
- Snapshot tests for each component in all visual states
- Test `OptionButton` in all 4 states with correct colors
- Test `ProgressBar` at 0%, 50%, 100%
- Test `StreakIndicator` visibility logic
- Test `FactReveal` renders fact text correctly

---

### Sub-phase 2.6: Results + Home Components

**Agent:** `ui-artist`

**Deliverables:**
- `RankDisplay.tsx` -- Rank SVG icon, title, description
- `ScoreBreakdown.tsx` -- Score, best streak, accuracy cards
- `TierPerformance.tsx` -- Per-tier progress bars (only for played tiers)
- `FullBreakdown.tsx` -- Scrollable list of all questions with correct/incorrect indicators
- `DailyGameCard.tsx` -- Home screen card showing today's game status
- `TierToggle.tsx` -- Toggle buttons for tier selection with question count
- `StatsOverview.tsx` -- Summary stats on home screen

**Contracts:**
- `TierPerformance` must only show tiers the user selected for that game
- `TierToggle` must show question count updating as tiers are toggled
- `TierToggle` must prevent deselecting all tiers (at least one required)
- `DailyGameCard` must show different states: ready to play, in progress, completed
- All components under 250 LOC

**QA (by `qa-engineer`):**
- Test `TierToggle` cannot deselect the last tier
- Test `TierToggle` question count updates correctly
- Test `TierPerformance` with subset of tiers
- Test `DailyGameCard` in all 3 states
- Snapshot tests for all components

---

### Sub-phase 2.7: Screen Assembly + Game Logic

**Agent:** `mobile-engineer`

**Deliverables:**
- `SplashScreen.tsx` -- Fetch daily game, show loading, navigate to Home
- `HomeScreen.tsx` -- Daily game card, tier selector, stats, history link
- `DifficultySelectScreen.tsx` -- Full tier configuration before starting game
- `GameScreen.tsx` -- Complete game loop: show question, handle selection, reveal, next, complete
- `ResultsScreen.tsx` -- Show rank, scores, breakdown, play again / go home
- `HistoryScreen.tsx` -- List of past games with scores and tiers
- `packages/mobile/src/stores/game-store.ts` -- Game state management

**Game Loop Logic:**
1. Receive `DailyGame` and `selectedTiers` as input
2. Build question list by merging selected tiers from `questionsByTier`
3. Present questions in tier order (Novice first, Grandmaster last)
4. Track: current index, selected answer, revealed state, score, streak, best streak, per-question timing
5. On answer: reveal correct/incorrect, show fact, update score/streak
6. On next: advance to next question or transition to results
7. On complete: calculate rank, save result to local DB, show results screen

**Contracts:**
- Game state must be managed in a store (not scattered across useState)
- Timer must track per-question time in milliseconds
- Score must only count questions from selected tiers
- Rank must be calculated relative to selected question count (not total 35)
- Results must be saved to SQLite before showing results screen
- Back navigation during game must prompt "are you sure?" (lose progress)

**QA (by `qa-engineer`):**
- Test full game flow: start -> answer all -> see results
- Test partial tier selection: verify only selected tier questions appear
- Test scoring: correct answers increment, incorrect do not
- Test streak: builds on consecutive correct, resets on incorrect
- Test rank calculation at boundary values (0%, 20%, 35%, 50%, 65%, 80%, 90%, 100%)
- Test game result is saved to SQLite with correct data
- Test timer accuracy (mock timers)
- Test back navigation shows confirmation
- Test offline: cached game loads, uncached shows message

**Dos:**
- Use Zustand or similar for game state (lightweight, typed)
- Debounce answer taps to prevent double-submission
- Preload next question data while showing fact

**Do NOTs:**
- Do not allow answering the same question twice
- Do not hardcode the question order (derive from selected tiers)
- Do not block the UI during SQLite writes

---

## Phase 3: Admin Dashboard

**Owner:** `dashboard-engineer`
**Depends on:** Phase 0 complete, Phase 1 complete (need working API)
**Goal:** A working admin dashboard for question management and daily game generation.

### Sub-phase 3.1: Dashboard Scaffold

**Agent:** `dashboard-engineer`

**Deliverables:**
- `packages/dashboard/package.json` with React, Vite, TanStack Router, TanStack Query
- `packages/dashboard/tsconfig.json` extending base
- `packages/dashboard/vite.config.ts` with path aliases to shared package
- `packages/dashboard/src/routes/__root.tsx` -- Root layout with sidebar
- `packages/dashboard/src/components/common/Layout.tsx` -- App shell
- `packages/dashboard/src/components/common/Sidebar.tsx` -- Navigation sidebar
- `packages/dashboard/src/services/api-client.ts` -- Typed API client using shared types
- TanStack Router file-based route structure

**Contracts:**
- All API calls must go through TanStack Query (no raw fetch in components)
- API client must use shared types for request/response
- API base URL must come from environment variable
- All routes must be typed via TanStack Router's type-safe routing

**QA (by `qa-engineer`):**
- Dashboard builds with Vite without errors
- All routes are accessible
- Sidebar navigation works
- API client types match shared types
- TypeScript compiles cleanly

**Dos:**
- Use TanStack Router's file-based routing
- Use TanStack Query for all data fetching with proper cache keys

**Do NOTs:**
- Do not use any CSS framework (match the parchment aesthetic from jsx.md)
- Do not use emoji anywhere

---

### Sub-phase 3.2: Question Management Pages

**Agent:** `dashboard-engineer`

**Deliverables:**
- `routes/questions/index.tsx` -- Question bank table with filters and search
- `routes/questions/new.tsx` -- Create question form with live preview
- `routes/questions/$questionId.tsx` -- Edit question form
- `components/questions/QuestionTable.tsx` -- Sortable, filterable data table
- `components/questions/QuestionForm.tsx` -- Form with Zod validation
- `components/questions/QuestionPreview.tsx` -- Renders question as it appears in mobile app

**Contracts:**
- Table must support: sorting by any column, filtering by tier/category, text search
- Form must validate with shared Zod schemas before submission
- Preview must use the same colors and typography as the mobile app
- Bulk import must accept JSON file upload and show validation results
- All mutations must optimistically update the UI via TanStack Query

**QA (by `qa-engineer`):**
- Test question list loads and displays correctly
- Test filters narrow results correctly
- Test create form: valid submission succeeds, invalid shows errors
- Test edit form: loads existing data, saves changes
- Test delete: removes from list, shows confirmation first
- Test bulk import: valid JSON imports, invalid JSON shows errors per row
- Test preview renders with correct tier colors

---

### Sub-phase 3.3: Game Generation Pages

**Agent:** `dashboard-engineer`

**Deliverables:**
- `routes/games/index.tsx` -- Game calendar view
- `routes/games/generate.tsx` -- Game generator with tier distribution config
- `routes/games/$date.tsx` -- Game preview page
- `components/games/GameCalendar.tsx` -- Month calendar with game indicators
- `components/games/TierDistribution.tsx` -- Configurable question count per tier
- `components/games/GamePreview.tsx` -- Full game preview in mobile style

**Contracts:**
- Calendar must show which dates have generated games (green dot) and which do not (empty)
- Generator must show available question count per tier vs required count
- Generator must prevent generation if any tier has insufficient questions
- Preview must render the complete game in a mobile-width container with correct styles
- Generation must show a confirmation dialog before uploading to R2

**QA (by `qa-engineer`):**
- Test calendar displays generated games correctly
- Test generator shows correct available question counts
- Test generator blocks when insufficient questions
- Test generation creates game and shows in calendar
- Test preview renders all questions with correct structure
- Test date picker prevents generating for past dates (warn but allow)

---

## Phase 4: Integration + Polish

**Owner:** `integrator`
**Depends on:** Phases 1-3 complete
**Goal:** Everything works together end-to-end.

### Sub-phase 4.1: End-to-End Wiring

**Agent:** `integrator`

**Deliverables:**
- Mobile app connects to deployed API and fetches daily game
- Dashboard connects to deployed API and manages questions
- Full flow: create questions in dashboard -> generate game -> play on mobile -> see results
- Environment configuration for dev/staging/production
- BundleMudge integration in mobile app

**Contracts:**
- Mobile must handle API errors gracefully (show cached game or offline message)
- Mobile must cache fetched game for offline replay
- Dashboard must handle API errors with user-friendly messages
- All environment-specific values in config files (not hardcoded)

**QA (by `qa-engineer`):**
- E2E test: create 35+ questions via dashboard API
- E2E test: generate a daily game via dashboard
- E2E test: fetch daily game on mobile, play through, see results
- E2E test: play same game with different tier selections
- E2E test: offline mode with cached game
- E2E test: offline mode without cache shows message
- Verify no hardcoded URLs, keys, or configuration

---

### Sub-phase 4.2: Seed Data

**Agent:** `api-engineer`

**Deliverables:**
- Seed script that imports all 35 questions from the original jsx.md into D1 via the API
- Map original `emoji` fields to `iconKey` values
- Seed script for generating the first daily game
- Script must be idempotent (safe to run multiple times)

**Contracts:**
- All 35 original questions must be preserved exactly (text, options, correct index, facts)
- Difficulty tiers must map correctly
- `iconKey` values must match SVG icon components that exist
- Seed script must use the admin API endpoints (not direct D1 access)

**QA (by `qa-engineer`):**
- Verify all 35 questions are imported with correct data
- Verify generated game contains expected tier distribution
- Verify seed script is idempotent (running twice does not duplicate)
- Verify all `iconKey` values have corresponding icon components

---

### Sub-phase 4.3: Final QA Pass

**Agent:** `qa-engineer`

**Deliverables:**
- Full test suite passes (unit, integration, E2E)
- No TypeScript errors across any package
- No lint errors across any package
- All files under 250 LOC
- No `any` types anywhere
- No hardcoded values anywhere
- No emoji characters anywhere in the codebase
- Performance check: daily game JSON under 50KB
- Performance check: API response under 500ms

**Checklist:**
- [ ] `pnpm -r typecheck` passes
- [ ] `pnpm -r lint` passes
- [ ] `pnpm -r test` passes (all packages)
- [ ] `pnpm -r build` succeeds
- [ ] Mobile app launches and completes full game flow
- [ ] Dashboard loads and can manage questions
- [ ] Game generation works and produces valid R2 JSON
- [ ] Offline mode works correctly on mobile
- [ ] No console errors or warnings in any package
- [ ] All SVG icons render correctly at all sizes
- [ ] Tier selection persists across app restarts
- [ ] Game results persist across app restarts
- [ ] Stats calculations are correct with edge cases

---

## Phase Dependencies (DAG)

```
Phase 0.1 (Monorepo Scaffold)
  |
  v
Phase 0.2 (Shared Package)
  |
  +---------------------------+-----------------------------+
  |                           |                             |
  v                           v                             v
Phase 1.1 (API Scaffold)   Phase 2.1 (Mobile Scaffold)   Phase 3.1 (Dashboard Scaffold)
  |                           |                             |
  v                         Phase 2.2 (Theme + Icons)       |
Phase 1.2 (Question CRUD)    |                             |
  |                         Phase 2.3 (Common Components)   |
  v                           |                             |
Phase 1.3 (Game Gen + R2)  Phase 2.4 (Local DB)            |
  |                           |                             |
  +---------------------------+-----------------------------+
  |                           |                             |
  |                         Phase 2.5 (Game Components)   Phase 3.2 (Question Pages)
  |                           |                             |
  |                         Phase 2.6 (Results + Home)    Phase 3.3 (Game Gen Pages)
  |                           |                             |
  |                         Phase 2.7 (Screen Assembly)     |
  |                           |                             |
  +---------------------------+-----------------------------+
  |
  v
Phase 4.1 (E2E Wiring)
  |
  v
Phase 4.2 (Seed Data)
  |
  v
Phase 4.3 (Final QA)
```

**Parallelism opportunities:**
- Phase 1 (API), Phase 2.1-2.4 (Mobile scaffold/theme/components/DB), and Phase 3.1 (Dashboard scaffold) can run in parallel after Phase 0
- Phase 2.5-2.6 (Game/Results components) can run in parallel with Phase 3.2-3.3 (Dashboard pages)
- Phase 2.2 (Theme) and Phase 2.4 (Local DB) can run in parallel

---

## Global Rules (All Phases)

### Dos

- Use shared types for ALL data crossing package boundaries
- Validate all external input with Zod schemas from shared package
- Write tests alongside implementation (not after)
- Use named exports (no default exports except route components)
- Keep every file under 250 lines of code
- One function per utility file
- Use `as const satisfies` for type-safe constants
- Use environment variables for all configuration
- Commit working code at the end of each sub-phase

### Do NOTs

- Never use `any` -- use `unknown` and narrow, or define a proper type
- Never use emoji characters -- use `iconKey` strings mapped to SVG components
- Never hardcode colors -- use theme constants
- Never hardcode API URLs -- use environment config
- Never hardcode question data -- all questions come from D1 via R2
- Never use `console.log` for production code (use structured logging or remove)
- Never skip tests to ship faster
- Never put business logic in route handlers (use service layer)
- Never import mobile code from dashboard or vice versa (only shared)
- Never exceed 250 LOC per file
- Never use Haiku or Sonnet models
- Never use subagents
