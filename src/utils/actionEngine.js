/**
 * Action Engine — always returns one clear action, never more.
 * Priority ladder: stuck task → sales backlog → Big 3 → worst KPI → empty board → active today → default
 *
 * getNextBestAction({ weekData, tasks, monthly }) → { actionLabel, reason, urgency, estimatedTime, icon }
 * getConversationOpener(traineeRow)               → coaching sentence for the coach dashboard
 * getIdentityReinforcement(user)                  → identity anchor sentence for dashboard header
 */

// ─── Next Best Action ──────────────────────────────────────────────────────────
export function getNextBestAction({ weekData = {}, tasks = [], monthly = {} } = {}) {
  const now = new Date()

  // P1 — task stuck in "today" for 20+ hours
  const staleTask = tasks.find(t => {
    if (t.status !== 'today' || !t.movedToTodayAt) return false
    return (now - new Date(t.movedToTodayAt)) / 3600000 > 20
  })
  if (staleTask) return {
    actionLabel: `סגור: "${staleTask.title}"`,
    reason: 'נמצאת ב"היום" מאתמול — זה המעצור שלך. סגור לפני הכל.',
    urgency: 'high',
    estimatedTime: '30–60 דקות',
    icon: '🔴',
  }

  // P2 — sales/closing task sitting in backlog
  const salesTask = tasks.find(t => {
    if (t.status !== 'backlog') return false
    const title = (t.title || '').toLowerCase()
    return title.includes('שיחה') || title.includes('מכירה') ||
           title.includes('לסגור') || title.includes('לקוח') || title.includes('הצעה')
  })
  if (salesTask) return {
    actionLabel: `צלצל עכשיו: "${salesTask.title}"`,
    reason: 'משימת מכירה מחכה ברשימה — כל יום שעוברת, ההכנסות לא מגיעות.',
    urgency: 'high',
    estimatedTime: '60–90 דקות',
    icon: '💰',
  }

  // P3 — Big 3 incomplete
  const big3done = weekData.bigThreeCompleted || 0
  if (big3done < 2) {
    const remaining = 3 - big3done
    return {
      actionLabel: remaining === 3
        ? 'התחל עם המהלך הגדול הראשון שלך'
        : `השלם עוד ${remaining} מ-3 הגדולים`,
      reason: 'Big 3 הוא המינוף הכי גבוה שיש לך. כל השאר משני.',
      urgency: 'high',
      estimatedTime: 'תלוי במהלך',
      icon: '🎯',
    }
  }

  // P4 — worst KPI gap
  const kpiChecks = [
    { key: 'revenue',  target: 'revenueTarget',  label: 'הכנסות',  action: 'תסגור עסקה נוספת היום' },
    { key: 'leads',    target: 'leadsTarget',    label: 'לידים',   action: 'תייצר ליד חדש אחד היום' },
    { key: 'calls',    target: 'callsTarget',    label: 'שיחות',   action: 'תקבע עוד שיחת מכירה' },
    { key: 'closures', target: 'closuresTarget', label: 'סגירות',  action: 'תשלח הצעה שתקועה' },
  ]
  let worstAction = null, worstRatio = 1
  kpiChecks.forEach(k => {
    const actual = weekData[k.key] || 0
    const target = monthly[k.target]
    if (!target) return
    const ratio = actual / target
    if (ratio < worstRatio) { worstRatio = ratio; worstAction = k }
  })
  if (worstAction && worstRatio < 0.6) return {
    actionLabel: worstAction.action,
    reason: `${worstAction.label} ב-${Math.round(worstRatio * 100)}% מהיעד — זה מה שמחזיר אותך למסלול.`,
    urgency: worstRatio < 0.3 ? 'high' : 'medium',
    estimatedTime: 'לאורך היום',
    icon: '📊',
  }

  // P5 — empty board
  if (tasks.length === 0) return {
    actionLabel: 'הוסף 3 משימות ללוח השבועי עכשיו',
    reason: 'בלי משימות — אין מה לבצע. 3 דקות עכשיו חוסכות שעות של בלבול.',
    urgency: 'medium',
    estimatedTime: '3–5 דקות',
    icon: '✨',
  }

  // P6 — active "today" tasks
  const todayTasks = tasks.filter(t => t.status === 'today')
  if (todayTasks.length > 0) return {
    actionLabel: `סיים: "${todayTasks[0].title}"`,
    reason: 'יש לך משימה פעילה — תמקד. אחת בכל פעם.',
    urgency: 'medium',
    estimatedTime: 'תלוי במשימה',
    icon: '📌',
  }

  // Default
  return {
    actionLabel: 'בחר משימה אחת מהרשימה — ועבור אליה עכשיו',
    reason: 'הפעולה הבאה תמיד ברורה: בחר, בצע, סגור.',
    urgency: 'low',
    estimatedTime: '10 דקות',
    icon: '▶️',
  }
}

// ─── Conversation Opener for Coach ────────────────────────────────────────────
// Pass `week` for data-driven sentences that reference actual numbers
export function getConversationOpener({ status, score, big3done = 0, daysSince = 0, week = null, name = '' } = {}) {
  const first = name ? name.split(' ')[0] : ''
  const prefix = first ? `${first}, ` : ''

  if (status === 'red' && daysSince > 7) {
    return `${prefix}לא עדכנת שבוע+ — מה עוצר אותך? בוא נבין מה קורה.`
  }

  // Data-driven: reference actual KPI numbers
  if (week && status === 'red') {
    const revenue  = week.revenue || 0
    const calls    = week.calls || 0
    const leads    = week.leads || 0
    const big3     = week.bigThreeCompleted || 0
    const tRevenue = week.targetsRevenue
    const tCalls   = week.targetsCalls

    if (big3 === 0 && (tRevenue || tCalls)) {
      return `${prefix}ראיתי שה-Big 3 לא זז השבוע. בוא נבין מה חסם — ${calls > 0 ? `עשית ${calls} שיחות אבל` : ''} הגדולים לא זכו לזמן.`
    }
    if (tRevenue && revenue < tRevenue * 0.3) {
      const fmt = v => `₪${Math.round(v / 1000)}K`
      return `${prefix}הכנסות ב-${Math.round((revenue / tRevenue) * 100)}% מהיעד — ${fmt(revenue)} מתוך ${fmt(tRevenue)}. מה שינוי אחד שמחזיר אותך?`
    }
    if (tCalls && calls < tCalls * 0.4) {
      return `${prefix}עשית ${calls} שיחות מתוך יעד ${tCalls} — הפער הוא זמן או אנרגיה?`
    }
    return `${prefix}שבוע קשה. בוא נבחר דבר אחד לתקן ממחר.`
  }

  if (status === 'red') {
    return `${prefix}ראיתי את המספרים — שבוע קשה. מה השתנה?`
  }

  if (status === 'yellow' && week) {
    const big3 = week.bigThreeCompleted || 0
    const leads = week.leads || 0
    const revenue = week.revenue || 0
    const tRevenue = week.targetsRevenue

    if (big3 < 2) {
      const done = big3 === 0 ? 'אף אחד מה-Big 3 לא הושלם' : `רק ${big3}/3 מה-Big 3 הושלמו`
      return `${prefix}${done} — מה תפס אותך? בוא נסדר.`
    }
    if (tRevenue && revenue >= tRevenue * 0.7) {
      return `${prefix}כמעט שם — ${Math.round((revenue / tRevenue) * 100)}% מהיעד. מה אחד דבר שסוגר את הפער?`
    }
    return `${prefix}היית על הגבול השבוע. מה דבר אחד שהיה דוחף לירוק?`
  }

  if (status === 'yellow' && big3done < 2) {
    return `${prefix}3 הגדולים לא הושלמו — מה תפס אותך? בוא נסדר את זה.`
  }
  if (status === 'yellow') {
    return `${prefix}היית על הגבול השבוע. מה אחד דבר שהיה דוחף לירוק?`
  }
  if (status === 'green' && score >= 80) {
    return `${prefix}שבוע חזק 💪 מה הדלק אותך? בוא נבנה על זה.`
  }
  if (status === 'green') {
    return `${prefix}על המסלול. מה המהלך הבא שידחוף אותך מעלה?`
  }
  return `${prefix}מה הדבר האחד הכי חשוב לך השבוע?`
}

// ─── Identity Reinforcement ───────────────────────────────────────────────────
export function getIdentityReinforcement(user = {}) {
  const identity = user?.annualGoals?.identity
  if (identity) return `אתה ${identity}`

  const revenue = user?.annualGoals?.revenueTarget
  if (revenue) {
    const label = revenue >= 1000000
      ? `מיליון ₪`
      : `${Math.round(revenue / 1000)}K ₪`
    return `אתה בונה עסק של ${label} — פעל מהמקום הזה`
  }

  return 'אתה מתאמן שסוגר עסקאות — פעל מהמקום הזה'
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────
export const URGENCY_STYLE = {
  high:   { bg: 'bg-red-600',    border: 'border-red-500',   text: 'text-white',       label: 'דחוף' },
  medium: { bg: 'bg-amber-500',  border: 'border-amber-400', text: 'text-white',       label: 'חשוב' },
  low:    { bg: 'bg-brand-600',  border: 'border-brand-500', text: 'text-white',       label: 'הבא' },
}
