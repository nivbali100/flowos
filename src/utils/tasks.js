/**
 * Shared task utility functions.
 * Single source of truth — import from here, never redefine locally.
 */

/** Normalize legacy numeric or missing priority to a valid string key. */
export function normPriority(p) {
  if (typeof p === 'number') return ['low', 'low', 'medium', 'high', 'critical'][Math.min(p, 4)] || 'medium'
  if (p === 'critical' || p === 'high' || p === 'medium' || p === 'low') return p
  return 'medium'
}

/** Returns a Date set to midnight of today (00:00:00.000). */
export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns true if task was completed today. */
export function completedToday(task) {
  if (!task.completedAt) return false
  return new Date(task.completedAt) >= startOfToday()
}
