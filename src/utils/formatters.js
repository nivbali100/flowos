export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  if (value >= 1000) {
    return `₪${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
  }
  return `₪${value.toLocaleString('he-IL')}`
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('he-IL')
}

export function formatPercent(ratio) {
  if (ratio === null || ratio === undefined) return '—'
  return `${Math.round(ratio * 100)}%`
}

export function progressPercent(actual, target) {
  if (!target) return 0
  return Math.min(100, Math.round((actual / target) * 100))
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatRelativeDate(isoString) {
  if (!isoString) return 'לא עודכן'
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}
