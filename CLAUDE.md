# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FlowOS** (branded "הפסגה") is a Hebrew-language operating system for entrepreneurs in Niv Bali's coaching program. It guides trainees through a continuous loop: Identity → Planning → Execution → Measurement → Reflection.

**Tech Stack:** React 19 + React Router v7, Vite 8, Tailwind CSS 3.4 (RTL, Heebo font), Recharts 3.8, LocalStorage (no backend yet).

**Language:** Hebrew (עברית), RTL layout — `html { direction: rtl }` in `index.css`.

---

## Common Commands

```bash
npm run dev      # Dev server → http://localhost:5173 (or 5174 if port taken)
npm run build    # Production build → dist/
npm run preview  # Preview production build
npm run lint     # ESLint check
```

---

## Routes (`src/App.jsx`)

| Path | Page | Purpose |
|------|------|---------|
| `/dashboard` | Dashboard | **Home** — KPIs, score, momentum, insights |
| `/` | Journey | יומן מסע — 5-section editable journal |
| `/goals` | Goals | Editable goal hierarchy (annual → quarterly → monthly) |
| `/weekly` | Weekly | Kanban task manager (backlog / today / done) |
| `/performance` | Performance | Monthly KPI trends + week-by-week table |
| `/rules` | GameRules | System education |
| `/onboarding` | Onboarding | Pre-program checklist |
| `/admin` | Admin | Coach's trainee overview |

All routes are children of `<AppShell>` which renders Sidebar (desktop) + BottomNav (mobile) + VisionBanner.

---

## Two Data Layers — Critical Distinction

### 1. `useData(key)` — `src/hooks/useData.js` — READ-ONLY historical data

Returns computed/hardcoded data. Current user hardcoded as `CURRENT_USER = 'lior@example.com'`.

Key paths:
- `'raw.latest'` / `'raw.previous'` / `'raw.allWeeks'` — weekly form submissions
- `'user'` — trainee profile (annualGoals, startingPoint)
- `'goals.quarterly'` / `'goals.currentMonth'` — goal hierarchy
- `'dashboard'` — **computed snapshot** used by all 5 Dashboard sub-components: `{monthStatus, statusMessage, month, insight, momentumScore, momentumTrend, topThree, gapRevenue, kpis[]}`
- `'goalsExcel.current'` — domain breakdown by week

Never import from `src/data/` files directly in components — always go through `useData()`.

### 2. `useStore()` — `src/hooks/useStore.js` — MUTABLE localStorage-backed store

Use this wherever the user can edit data. Seeds defaults from `useData` files on first run.

```js
const {
  profile, updateStartingPoint(field, value), updateAnnualGoals(field, value),
  quarterly, updateQuarterly(field, value), updateQuarterlyMove(idx, value),
  monthly, updateMonthly(field, value), updateMonthlyMove(idx, value),
  tasks, addTask(data), updateTask(id, updates), deleteTask(id), moveTask(id, newStatus),
} = useStore()
```

localStorage keys: `flowos_profile`, `flowos_quarterly`, `flowos_monthly`, `flowos_tasks`.

Also exports three utility functions:
- `analyzeTask(title, monthly)` — returns rule-based AI insight string for a task
- `analyzeWeek(tasks, monthly)` — returns AI insight string for the current board state
- `suggestFromGoals(monthly, existingTasks)` — derives task suggestions from `monthly.threeKeyMoves`

**Rule:** Use `useStore()` in Journey/Goals/Weekly. Use `useData()` in Dashboard/Performance/read-only views.

---

## EditableField Component (`src/components/ui/EditableField.jsx`)

Reusable editable field used throughout Journey and Goals. Every field has:
- View mode: click anywhere or press ✏️ to open, flashes "נשמר ✓" after save
- Edit mode: hint explanation shown, input, Save/Cancel
- Types: `'text'` | `'textarea'` | `'number'` | `'currency'` | `'percent'` | `'slider'`
- Slider: range 1–10 with large number display
- Enter saves, Escape cancels (text inputs only)

```jsx
<EditableField
  label="הכנסה חודשית"
  hint="ממוצע 3 חודשים אחרונים"
  type="currency"
  value={sp.avgMonthlyRevenue}
  formatDisplay={v => formatCurrency(v)}
  onSave={v => updateStartingPoint('avgMonthlyRevenue', v)}
/>
```

---

## Weekly Kanban (`src/pages/Weekly/index.jsx`)

3 columns: `backlog` (💡 רעיונות) | `today` (📌 היום) | `done` (✅ בוצע).

- Mobile: tab switcher between columns; Desktop: 3-column CSS grid
- Add task: inline form in backlog — auto-runs `analyzeTask()` on submit
- Suggested tasks: chips from `suggestFromGoals()` appear when backlog < 5 tasks
- AI insight banner at top using `analyzeWeek()`
- Edit overlay (modal) for modifying existing tasks
- Task cards: title, goalRef pill, collapsible AI analysis, action buttons per status

---

## Dashboard Sub-Components (`src/pages/Dashboard/`)

All read from `useData('dashboard')`:

| Component | What it renders |
|-----------|----------------|
| `MonthStatusBanner` | Status pill + message + month progress bar (% of days elapsed) |
| `SmartInsight` | Gradient header + contextual insight text |
| `KPISummaryRow` | 2×2 KPI cards with emoji icons (🎯📞🤝💰), progress bars |
| `TopThreeTasks` | 3 הגדולים with color-coded urgency |
| `MomentumIndicator` | Circular SVG gauge (0–10) + trend pill |

`Dashboard/index.jsx` also renders inline: gap-to-goal dark card, weekly score dark hero, annual pace, mental pulse.

---

## Core Utilities

**`src/utils/status.js` — `getTimeBasedStatus(actual, monthlyTarget)`**
Green/Yellow/Red based on actual vs time-proportional target (day of month).
- Green ≥ 90%, Yellow ≥ 70%, Red < 70%. Always use `getStatusColors(status)` for colors.

**`src/utils/scoring.js` — `calcWeeklyScore(weekData)`**
`score = KPI×40% + BigThree×30% + Improvement×15% + Preservation×15%` → 0–100.

**`src/utils/insights.js`**
- `calcSmartInsight(weekData, allWeeks, score)` → `{text, type}` priority: burnout → score → big3 → revenue
- `calcPaceProjection(allWeeks, annualTarget)` → `{projectedAnnual, weeklyPace, pct, gapPct}`

**`src/utils/formatters.js`** — `formatCurrency(v)` shows ₪15K style; `progressPercent(actual, target)` → 0–100 capped.

---

## Design System

**Brand colors** (`tailwind.config.js`): `brand.500 = #6366f1`, `brand.600 = #4f46e5`.
**Status colors**: always use `getStatusColors(status)` from `status.js` — never hardcode.

**UI Primitives** (`src/components/ui/`): `Card`, `StatusBadge`, `ProgressBar`, `EditableField`, `Button`, `SectionHeader`, `KPICard`, `EmptyState`, `StatusDot`

**Layout** (`src/components/layout/`): `AppShell`, `Sidebar`, `BottomNav`, `TopBar`, `VisionBanner`, `PeriodBreadcrumb`

---

## Period & Auth

- **Period** is hardcoded in `src/hooks/usePeriod.js` → Q2, April 2026, Week 2. Update this file when the period changes.
- **Current user** is `'lior@example.com'` in both `useData.js` and `useStore.js`. Replace with auth when multi-user support is added (planned ~3 months out).

---

## Known Limitations / Planned Work

- All data is hardcoded in `src/data/` — planned backend: Google Sheets via n8n → replace `src/data/raw.js`
- `src/data/challenge.js` uses `Math.random()` for habit data — unstable across reloads
- AI task analysis in `useStore.js` is rule-based regex — designed to be swapped for Claude API calls
- `weekly_close` key in localStorage (Weekly page reflection section) is not connected to backend
- Onboarding completion state (`localStorage('onboarding_completed')`) is single-device only
