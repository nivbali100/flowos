// Dynamic period — computed from the real current date.
// Updates automatically as time passes; no hardcoded values.

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

function getQuarter(monthIndex) {
  if (monthIndex <= 2) return 'Q1'
  if (monthIndex <= 5) return 'Q2'
  if (monthIndex <= 8) return 'Q3'
  return 'Q4'
}

// Week-of-month: which numbered week (1–5) does this day fall in?
// Based on ISO week boundaries (Monday = start of week).
function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  // Day of week for the 1st (0=Sun → shift to Mon-based: Mon=0)
  const firstDow = (firstDay.getDay() + 6) % 7
  const dayOfMonth = date.getDate()
  return Math.ceil((dayOfMonth + firstDow) / 7)
}

export function usePeriod() {
  const now        = new Date()
  const year       = now.getFullYear()
  const monthIndex = now.getMonth()           // 0-based
  const month      = HEBREW_MONTHS[monthIndex]
  const quarter    = getQuarter(monthIndex)
  const weekNumber = getWeekOfMonth(now)
  const weekLabel  = 'ש' + weekNumber

  return {
    year,
    quarter,
    month,
    monthIndex,                               // 0-based, useful for comparisons
    monthLabel: month + ' ' + year,           // e.g. "מאי 2026"
    weekNumber,
    weekLabel,
    breadcrumb: `${year} › ${quarter} › ${month} › שבוע ${weekNumber}`,
  }
}
