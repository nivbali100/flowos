/**
 * computeNearWin — returns the highest-priority active near-win state.
 * Priority: C (personal best) > B (Big3 close) > A (perfect day)
 * Returns null if no near-win condition is active.
 */

const COOLDOWN_KEYS = {
  A: 'flowos_nearwin_perfect_day',   // value: date string (toDateString)
  B: 'flowos_nearwin_big3_week',     // value: weekId string
  C: 'flowos_nearwin_personal_best', // value: weekId string
}

function getWeekId() {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - day)
  startOfWeek.setHours(0, 0, 0, 0)
  return startOfWeek.toISOString().slice(0, 10)
}

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

function isDismissed(key, compareValue) {
  try {
    return localStorage.getItem(key) === compareValue
  } catch { return false }
}

export function dismissNearWin(variant) {
  try {
    const today = new Date().toDateString()
    const weekId = getWeekId()
    if (variant === 'A') localStorage.setItem(COOLDOWN_KEYS.A, today)
    else if (variant === 'B') localStorage.setItem(COOLDOWN_KEYS.B, weekId)
    else if (variant === 'C') localStorage.setItem(COOLDOWN_KEYS.C, weekId)
  } catch {}
}

export function computeNearWin(tasks, weeklySummaries = [], firstName = '') {
  const today = new Date().toDateString()
  const weekId = getWeekId()
  const sot = startOfToday()
  const hour = new Date().getHours()

  // ── Variant C: Personal Best ───────────────────────────────────────────
  // Requires: 4+ weeks of history, personalBest >= 8, current === best-1
  if (
    weeklySummaries.length >= 4 &&
    !isDismissed(COOLDOWN_KEYS.C, weekId)
  ) {
    const personalBest = Math.max(...weeklySummaries.map(w => w.completedCount || 0), 0)
    const completedThisWeek = tasks.filter(t => t.status === 'done' && !t.archivedAt).length
    if (
      personalBest >= 8 &&
      completedThisWeek === personalBest - 1 &&
      completedThisWeek >= 3
    ) {
      return {
        variant: 'C',
        personalBest,
        current: completedThisWeek,
        firstName,
      }
    }
  }

  // ── Variant B: Big3 One Remaining ─────────────────────────────────────
  // Requires: 2/3 Big3 done, 1 remaining, Mon–Thu, not dismissed this week
  const big3Done = tasks.filter(t => t.isBigThree && t.status === 'done')
  const big3Remaining = tasks.filter(t => t.isBigThree && t.status !== 'done')
  const dayOfWeek = new Date().getDay() // 0=Sun,1=Mon,...,4=Thu
  if (
    big3Done.length >= 2 &&
    big3Remaining.length === 1 &&
    dayOfWeek >= 1 && dayOfWeek <= 4 &&
    !isDismissed(COOLDOWN_KEYS.B, weekId)
  ) {
    return {
      variant: 'B',
      lastBig3: big3Remaining[0],
      big3Done: big3Done.length,
    }
  }

  // ── Variant A: Perfect Day ─────────────────────────────────────────────
  // Requires: exactly 1 today task remaining, 1+ done today, hour < 22
  const todayRemaining = tasks.filter(t => t.status === 'today')
  const doneToday = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= sot)
  if (
    todayRemaining.length === 1 &&
    doneToday.length >= 1 &&
    hour < 22 &&
    !isDismissed(COOLDOWN_KEYS.A, today)
  ) {
    return {
      variant: 'A',
      remainingTask: todayRemaining[0],
    }
  }

  return null
}
