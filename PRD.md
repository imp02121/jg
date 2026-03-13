# The History Gauntlet -- Product Requirements Document

## Overview

The History Gauntlet is a daily history trivia game for mobile. Players choose which difficulty tiers they want to play, then answer questions spanning five millennia of human civilisation. Each day delivers a fresh pool of questions across all six tiers. V1 is singleplayer with local score tracking.

## Problem

Trivia games are either too casual (no depth) or too niche (no accessibility). The History Gauntlet bridges the gap with six difficulty tiers that let players self-select their challenge level. Rich historical facts after every question make it a learning experience, not just a quiz.

## V1 Scope

### What we ARE building

- Daily game delivery (new questions every day from R2)
- User-selectable difficulty tiers (play any combination of tiers per session)
- Singleplayer quiz experience on mobile (React Native)
- Local score/streak/history tracking (SQLite)
- Admin dashboard for question management and daily game generation
- Hono API on Cloudflare Workers
- Question bank in D1, daily game JSONs in R2
- Custom SVG icons throughout (no emojis anywhere in the app)
- OTA updates via BundleMudge

### What we are NOT building (V2+)

- User authentication
- Leaderboards
- Multiplayer / private games
- Real-time AI question generation
- Social features (sharing, challenges)

## User-Selectable Difficulty

This is the core differentiator from the original JSX prototype. Instead of a fixed 35-question gauntlet, users configure their own session.

### How it works

1. The daily game JSON in R2 contains questions for ALL six tiers
2. On the Home screen, the user sees today's game card with a tier selector
3. The user toggles which tiers they want to play (at least one required)
4. The game filters the daily question pool to only the selected tiers
5. Scoring, streaks, and ranks are calculated relative to the selected question count
6. The results screen shows performance only for the tiers played

### Tier configuration

Each daily game in R2 contains a fixed number of questions per tier:

| Tier | Questions per day |
|------|-------------------|
| Novice | 6 |
| Apprentice | 6 |
| Journeyman | 7 |
| Scholar | 7 |
| Master | 6 |
| Grandmaster | 3 |

A user selecting Novice + Apprentice + Journeyman gets 19 questions. A user selecting all tiers gets the full 35. The tier selection is persisted locally so it remembers preferences across sessions.

## Architecture

### Monorepo Structure

```
johans-gauntlet/
  packages/
    api/                          # Hono API on Cloudflare Workers
      src/
        routes/
          games.ts                # GET /api/games/daily, GET /api/games/:date
          admin-questions.ts      # CRUD for question bank
          admin-games.ts          # Game generation + management
          health.ts               # Health check
        services/
          question-service.ts     # Question bank business logic
          game-generator.ts       # Daily game generation + R2 upload
          r2-client.ts            # R2 read/write operations
        db/
          schema.sql              # D1 table definitions
          migrations/             # Ordered migration files
          queries/
            questions.ts          # Typed D1 query functions
            game-metadata.ts      # Game tracking queries
        middleware/
          error-handler.ts        # Global error handling
          validation.ts           # Request validation middleware
        index.ts                  # Hono app entry point
      wrangler.toml
      vitest.config.ts
      package.json
      tsconfig.json

    mobile/                       # React Native app
      src/
        screens/
          SplashScreen.tsx
          HomeScreen.tsx
          DifficultySelectScreen.tsx
          GameScreen.tsx
          ResultsScreen.tsx
          HistoryScreen.tsx
        components/
          game/
            QuestionCard.tsx
            OptionButton.tsx
            ProgressBar.tsx
            ScoreHeader.tsx
            FactReveal.tsx
            StreakIndicator.tsx
          home/
            DailyGameCard.tsx
            TierToggle.tsx
            StatsOverview.tsx
          results/
            RankDisplay.tsx
            ScoreBreakdown.tsx
            TierPerformance.tsx
            FullBreakdown.tsx
          common/
            GauntletButton.tsx
            OrnamentDivider.tsx
            DifficultyBadge.tsx
            Card.tsx
            LoadingSpinner.tsx
          icons/                  # Custom SVG icon components
            WheatIcon.tsx
            QuillIcon.tsx
            BackpackIcon.tsx
            CrownIcon.tsx
            ScrollIcon.tsx
            ColumnsIcon.tsx
            LightningIcon.tsx
            CrystalBallIcon.tsx
            FlameIcon.tsx
            SwordIcon.tsx
            ShieldIcon.tsx
            BookIcon.tsx
            AnchorIcon.tsx
            GlobeIcon.tsx
            BellIcon.tsx
            CastleIcon.tsx
            MountainIcon.tsx
        services/
          api-client.ts           # HTTP client for game API
          local-db.ts             # SQLite database setup
          game-storage.ts         # Local game result storage
          stats-service.ts        # Computed stats from local data
          cache-service.ts        # Daily game caching
        stores/
          game-store.ts           # Current game state
          settings-store.ts       # Tier preferences, app settings
        navigation/
          RootNavigator.tsx
          types.ts
        theme/
          colors.ts
          typography.ts
          spacing.ts
          index.ts
        utils/
          rank-calculator.ts
          score-calculator.ts
          date-utils.ts
      app.json
      package.json
      tsconfig.json

    dashboard/                    # Admin dashboard (React + Vite + TanStack Router)
      src/
        routes/
          __root.tsx              # Root layout
          index.tsx               # Dashboard home / question bank
          questions/
            index.tsx             # Question list
            new.tsx               # Create question
            $questionId.tsx       # Edit question
          games/
            index.tsx             # Game calendar
            generate.tsx          # Game generator
            $date.tsx             # Game preview
        components/
          questions/
            QuestionTable.tsx
            QuestionForm.tsx
            QuestionPreview.tsx
          games/
            GameCalendar.tsx
            TierDistribution.tsx
            GamePreview.tsx
          common/
            Layout.tsx
            Sidebar.tsx
            DataTable.tsx
            FormField.tsx
        services/
          api-client.ts
        hooks/
          use-questions.ts
          use-games.ts
      vite.config.ts
      package.json
      tsconfig.json

  shared/                         # Shared across all packages
    types/
      game.ts                     # DailyGame, GameQuestion, LocalGameResult
      question.ts                 # Question, DifficultyTier
      api.ts                      # Request/response shapes
      index.ts
    constants/
      difficulties.ts             # Tier definitions with colors and SVG icon keys
      ranks.ts                    # Rank definitions with thresholds and icon keys
      game-config.ts              # Questions per tier, max streak, etc.
      index.ts
    validators/
      question.ts                 # Zod schema for Question
      game.ts                     # Zod schema for DailyGame
      index.ts
    package.json
    tsconfig.json

  CLAUDE.md
  PRD.md
  PLAN.md
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  biome.json
```

### Infrastructure

| Service | Purpose | Details |
|---------|---------|---------|
| Cloudflare Workers | API runtime | Hono framework, edge deployment |
| Cloudflare D1 | Question bank | SQLite-based, all questions with metadata |
| Cloudflare R2 | Daily game storage | JSON files keyed by date (`games/2026-03-13.json`) |
| Cloudflare Pages | Dashboard hosting | React SPA with TanStack Router |
| Neon Postgres | Reserved for V2 | Auth, leaderboards, user profiles (via Hyperdrive) |
| BundleMudge | OTA updates | Push mobile updates without app store review |

### API Endpoints

#### Public (Mobile App)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/games/daily` | Returns today's game JSON from R2 |
| `GET` | `/api/games/:date` | Returns a specific date's game (`YYYY-MM-DD`) |
| `GET` | `/api/health` | Health check |

#### Admin (Dashboard)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/questions` | List questions (paginated, filterable by tier/category) |
| `POST` | `/api/admin/questions` | Create a question |
| `PUT` | `/api/admin/questions/:id` | Update a question |
| `DELETE` | `/api/admin/questions/:id` | Delete a question |
| `POST` | `/api/admin/questions/bulk` | Bulk import questions via JSON |
| `POST` | `/api/admin/games/generate` | Generate a daily game and upload to R2 |
| `GET` | `/api/admin/games` | List generated games with metadata |
| `GET` | `/api/admin/games/:date/preview` | Preview a generated game |

## Data Models

### Question (D1)

```typescript
interface Question {
  id: string;
  difficulty: DifficultyTier;
  iconKey: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  fact: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  lastUsedAt: string | null;
}
```

### DailyGame (R2 JSON)

```typescript
interface DailyGame {
  date: string;
  version: number;
  title: string;
  questionsByTier: Record<DifficultyTier, GameQuestion[]>;
  metadata: {
    totalQuestions: number;
    questionsByDifficulty: Record<DifficultyTier, number>;
    generatedAt: string;
  };
}

interface GameQuestion {
  id: string;
  difficulty: DifficultyTier;
  iconKey: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  fact: string;
}
```

Note: `questionsByTier` is a map keyed by `DifficultyTier` so the mobile app can trivially filter by the user's selected tiers without parsing the full array. This is the key structural change from the original flat array.

### LocalGameResult (SQLite on device)

```typescript
interface LocalGameResult {
  id: string;
  date: string;
  selectedTiers: DifficultyTier[];
  score: number;
  totalQuestions: number;
  bestStreak: number;
  answers: LocalAnswer[];
  completedAt: string;
  durationSeconds: number;
}

interface LocalAnswer {
  questionId: string;
  difficulty: DifficultyTier;
  selectedIndex: number;
  correct: boolean;
  timeSpentMs: number;
}
```

### TierPreferences (SQLite on device)

```typescript
interface TierPreferences {
  selectedTiers: DifficultyTier[];
  updatedAt: string;
}
```

## Shared Constants

### Difficulty Tiers

```typescript
type DifficultyTier =
  | 'Novice'
  | 'Apprentice'
  | 'Journeyman'
  | 'Scholar'
  | 'Master'
  | 'Grandmaster';

interface TierDefinition {
  key: DifficultyTier;
  label: string;
  bgColor: string;
  textColor: string;
  iconKey: string;
  questionsPerDay: number;
  sortOrder: number;
}
```

Defined once in `shared/constants/difficulties.ts`, consumed by mobile, dashboard, and API.

### Ranks

Score-based ranks awarded at game completion. Icons are custom SVGs, not emojis.

| Score Range | Rank | SVG Icon Key |
|-------------|------|--------------|
| 0-20% | Curious Peasant | `wheat` |
| 21-35% | Apprentice Scribe | `quill` |
| 36-50% | Travelling Scholar | `backpack` |
| 51-65% | Court Historian | `crown` |
| 66-80% | Master Chronicler | `scroll` |
| 81-90% | Grand Archivist | `columns` |
| 91-99% | Keeper of All Ages | `lightning` |
| 100% | Immortal Oracle | `crystal-ball` |

### Icon System

All icons are custom SVG components. No emojis anywhere in the codebase. Each icon component accepts `size` and `color` props and renders an SVG. Icons are stored in `packages/mobile/src/components/icons/` for mobile and equivalent paths in dashboard.

The `iconKey` field on questions and ranks maps to these SVG components via a registry/lookup.

## Mobile App

### Screens

1. **Splash** -- App logo (SVG), loading indicator while fetching daily game
2. **Home** -- Today's game card, tier selector, past scores summary
3. **DifficultySelect** -- Toggle tiers on/off, see question count update, confirm selection
4. **Game** -- Question display, answer options, progress bar, score/streak counter, fact reveal
5. **Results** -- Final score, rank (SVG icon), best streak, accuracy, per-tier breakdown
6. **History** -- List of past daily games with dates, scores, tiers played

### Design Language

All visual design mirrors the aesthetic established in `jsx.md`:

- **Aesthetic:** Antique parchment -- dark, warm, scholarly
- **Background:** Dark brown gradients (`#1a1410` to `#2c2218` to `#1e1a14` to `#0f0d0a`)
- **Text primary:** Warm cream (`#e8d9b8`, `#d4c5a9`)
- **Text secondary:** Muted tan (`#b0a48a`, `#887a62`, `#665d4d`)
- **Accents:** Muted gold (`#8b7355`)
- **Correct answer:** `rgba(74,124,89,0.3)` bg, `#4a7c59` border, `#a8e6b0` text
- **Wrong answer:** `rgba(139,45,45,0.3)` bg, `#8b2d2d` border, `#e6a8a8` text
- **Streak indicator:** `#e8a849` gold
- **Typography:** System serif (Palatino Linotype / Book Antiqua / Georgia fallback)
- **Animations:** Fade-in 0.4s ease, slide-up 12px, pulse for streak
- **Cards:** `rgba(58,46,30,0.6)` to `rgba(30,26,20,0.8)` gradient, `#3d3225` border, 12px radius
- **Buttons:** Transparent with `#8b7355` border, hover fills gold
- **Dividers:** Linear gradient `transparent` to `#8b7355` to `transparent`, 2px height
- **Scrollbar:** Track `#1a1410`, thumb `#3d3225`, hover `#8b7355`
- **Background pattern:** Subtle cross pattern at 0.04 opacity

### Tier Colors (from jsx.md)

| Tier | Background | Text |
|------|-----------|------|
| Novice | `#4a7c59` | `#e8f5e9` |
| Apprentice | `#5c6d3f` | `#f1f8e9` |
| Journeyman | `#8d6e3f` | `#fff8e1` |
| Scholar | `#8b4513` | `#fbe9e7` |
| Master | `#6a1b3a` | `#fce4ec` |
| Grandmaster | `#1a1a2e` | `#e8eaf6` |

### Local Storage (SQLite)

- Store completed game results with per-question detail and selected tiers
- Track all-time stats: total games, average score, best score, longest streak
- Track per-tier accuracy over time
- Persist tier selection preferences
- No sync in V1

### Offline Behavior

- Cache the current daily game locally after first fetch
- If offline and today's game is cached, allow play
- If offline and no cache, show "connect to play today's game" message
- Past results always available from local SQLite

## Admin Dashboard

### Tech Stack

- React 19
- Vite
- TanStack Router (file-based routing)
- TanStack Query (data fetching)
- Hosted on Cloudflare Pages

### Pages

1. **Question Bank** -- Sortable/filterable table of all questions, search, inline actions
2. **Create/Edit Question** -- Form with live preview showing how the question renders in-app
3. **Game Generator** -- Select date, configure tier distribution, auto-select or manually pick questions, preview, publish to R2
4. **Game Calendar** -- Month view showing which dates have generated games, click to preview

### Key Features

- Questions track usage count and last-used date to avoid repetition
- Game generator respects configurable tier distribution
- Preview mode renders the game with the same visual style as mobile
- Bulk import questions via JSON upload
- Filter questions by tier, category, usage count, date range

## Daily Game Generation

### Selection Algorithm

1. For each tier, query D1 for questions not used in the last N days (configurable, default 30)
2. Sort by `usedCount` ascending (prefer least-used questions)
3. Randomly select from top candidates to fill the tier quota
4. Structure as `DailyGame` with `questionsByTier` map
5. Upload to R2 at key `games/YYYY-MM-DD.json`
6. Update `usedCount` and `lastUsedAt` on selected questions in D1

## Non-Functional Requirements

- **Performance:** Daily game JSON loads in under 500ms globally (R2 edge caching)
- **Reliability:** App gracefully handles API failures with cached fallback
- **Size:** Daily game JSON under 50KB
- **Privacy:** V1 collects zero user data, all state on-device
- **Updates:** BundleMudge for OTA code updates
- **Icons:** All icons are custom SVGs, no emojis anywhere
- **Code quality:** 250 LOC max per file, strict TypeScript, proper tests

## V2 Roadmap (Architecture-Ready)

These features are NOT in V1 but the architecture must not block them:

- **Authentication** (better-auth, magic link + OAuth2) via Neon Postgres + Hyperdrive
- **Leaderboards** -- daily, weekly, all-time, per-tier
- **Multiplayer** -- real-time head-to-head with the same question set
- **Private games** -- custom question sets shared via invite link
- **AI question generation** -- LLM-powered question creation with human review
- **Social** -- share results, challenge friends
