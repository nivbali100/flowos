/**
 * flowBrain.js — FlowOS Flow Brain Engine
 *
 * getFlowBrainState({ profile, quarterly, monthly, tasks, weeklySummaries, now? })
 * Returns a rich state object used by Dashboard, Weekly, and Admin to drive
 * personalised action, risk, coaching, and identity messaging.
 *
 * Eight user modes:
 *   NoDirection | PlanningReady | Scattered | Executing |
 *   Stuck | NearWin | Momentum | ReviewNeeded
 *
 * Rule: NEVER import from components — pure data utilities only.
 */

import { normPriority } from './tasks.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(dateString) {
  if (!dateString) return Infinity
  return (Date.now() - new Date(dateString).getTime()) / 3_600_000
}

function dayOfWeek(now = new Date()) {
  // 0=Sun,1=Mon,...,6=Sat  → in Israel Sunday is start of work week
  return now.getDay()
}

function isEndOfWeek(now = new Date()) {
  const d = dayOfWeek(now)
  // Thursday (4) or Friday (5) = end of Israeli work week
  return d === 4 || d === 5
}

// ─── Task Analysis ────────────────────────────────────────────────────────────

function analyseTasksRaw(tasks = []) {
  const active   = tasks.filter(t => t.status !== 'done')
  const done     = tasks.filter(t => t.status === 'done')
  const big3All  = tasks.filter(t => t.isBigThree)
  const big3Done = big3All.filter(t => t.status === 'done')
  const doing    = tasks.filter(t => t.status === 'doing')
  const stuck    = doing.filter(t => hoursAgo(t.doingStartedAt || t.updatedAt) > 3)
  const unlinked = active.filter(t => !t.goalRef)
  const critical = active.filter(t => normPriority(t.priority) === 'critical')
  const today    = active.filter(t => t.status === 'today')

  const totalPct   = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0
  const big3Pct    = big3All.length > 0 ? Math.round((big3Done.length / big3All.length) * 100) : 0
  const unlinkedPct = active.length > 0 ? Math.round((unlinked.length / active.length) * 100) : 0

  // big3Complete = all assigned Big3 tasks are done (not hardcoded to 3)
  const big3Complete = big3All.length > 0 && big3Done.length >= big3All.length
  // big3NearDone = exactly 1 Big3 task remaining (and at least 2 exist so progress is visible)
  const big3NearDone = big3All.length >= 2 && (big3All.length - big3Done.length) === 1

  return {
    total: tasks.length,
    active,
    done,
    big3All,
    big3Done,
    doing,
    stuck,
    unlinked,
    critical,
    today,
    totalPct,
    big3Pct,
    unlinkedPct,
    hasBig3: big3All.length > 0,
    big3Complete,
    big3NearDone,
  }
}

// ─── Execution Pattern ────────────────────────────────────────────────────────
//  Describes HOW the user is working this week (used in Weekly board + Admin)

function computeExecutionPattern(ta) {
  if (ta.total === 0)              return { id: 'empty',        label: 'ריק',          emoji: '⬜', color: 'text-slate-400' }
  if (ta.stuck.length >= 2)        return { id: 'stagnant',     label: 'תקוע',         emoji: '🚧', color: 'text-red-600'   }
  if (ta.doing.length >= 3)        return { id: 'multitasking', label: 'מולטיטסקינג',  emoji: '🌀', color: 'text-amber-600' }
  if (ta.totalPct >= 70 && ta.big3Pct >= 50)
                                   return { id: 'sprint',       label: 'ספרינט',       emoji: '⚡', color: 'text-green-600' }
  if (ta.doing.length === 1)       return { id: 'linear',       label: 'מיקוד יחיד',   emoji: '🎯', color: 'text-brand-600' }
  if (ta.unlinkedPct >= 60)        return { id: 'scattered',    label: 'מפוזר',        emoji: '💨', color: 'text-orange-500'}
  if (ta.today.length > 0 && ta.done.length > 0)
                                   return { id: 'flowing',      label: 'זורם',         emoji: '🌊', color: 'text-blue-600'  }
  return                                   { id: 'planning',    label: 'תכנון',        emoji: '📋', color: 'text-slate-500' }
}

// ─── Risk Level ───────────────────────────────────────────────────────────────

function computeRiskLevel({ ta, monthly, profile, isEndOfWeek: eow }) {
  const mRevenue = monthly?.revenueTarget || 0
  const hasGoal  = mRevenue > 0

  // Red conditions
  if (!hasGoal)                                    return { level: 'red',    label: 'ללא כיוון',  hex: '#ef4444' }
  if (ta.stuck.length >= 2)                        return { level: 'red',    label: 'תקוע',       hex: '#ef4444' }
  if (eow && !ta.big3Complete && ta.hasBig3)       return { level: 'red',    label: 'Big 3 פתוח', hex: '#ef4444' }
  if (ta.total > 0 && ta.unlinkedPct >= 70)        return { level: 'red',    label: 'רעש גבוה',   hex: '#ef4444' }

  // Yellow conditions
  if (ta.stuck.length === 1)                       return { level: 'yellow', label: 'משימה תקועה', hex: '#eab308' }
  if (ta.unlinkedPct >= 40)                        return { level: 'yellow', label: 'רעש בינוני',  hex: '#eab308' }
  if (ta.hasBig3 && ta.big3Pct < 33 && eow)       return { level: 'yellow', label: 'Big 3 מאחור', hex: '#eab308' }
  if (ta.critical.length >= 2)                     return { level: 'yellow', label: 'קריטיות פתוחות', hex: '#eab308' }

  return                                           { level: 'green',  label: 'על המסלול',   hex: '#22c55e' }
}

// ─── User Mode ────────────────────────────────────────────────────────────────

function computeUserMode({ ta, monthly, profile, isEndOfWeek: eow }) {
  const hasGoal     = !!(monthly?.revenueTarget)
  const hasTasks    = ta.total > 0
  const hasWeekWork = ta.today.length > 0 || ta.active.filter(t => t.status === 'week').length > 0

  // 1. NoDirection — no monthly goal and no tasks
  if (!hasGoal && !hasTasks) {
    return {
      id: 'NoDirection',
      label: 'ללא כיוון',
      emoji: '🧭',
      description: 'אין יעד חודשי ואין משימות — המערכת לא יכולה לנתח.',
    }
  }

  // 2. PlanningReady — has goal but no tasks yet
  if (hasGoal && !hasTasks) {
    return {
      id: 'PlanningReady',
      label: 'מוכן לתכנון',
      emoji: '🗺️',
      description: 'יש יעד — עכשיו צריך להפוך אותו למשימות שבועיות.',
    }
  }

  // 3. Momentum — great week, Big 3 complete (or near-complete) + high completion
  if (ta.big3Complete && ta.totalPct >= 70) {
    return {
      id: 'Momentum',
      label: 'מומנטום',
      emoji: '🚀',
      description: 'Big 3 מושלם ושבוע מעל 70% — זה שבוע מנצח.',
    }
  }

  // 4. NearWin — 2/3 Big 3 done, or ≥60% total completion
  if (ta.big3NearDone || (ta.totalPct >= 60 && ta.hasBig3 && ta.big3Pct >= 50)) {
    return {
      id: 'NearWin',
      label: 'קרוב לניצחון',
      emoji: '🏁',
      description: 'שבוע כמעט מושלם — עוד מהלך אחד סוגר אותו.',
    }
  }

  // 5. ReviewNeeded — end of week and not closing
  if (eow && ta.total > 0 && ta.totalPct < 50 && !ta.big3Complete) {
    return {
      id: 'ReviewNeeded',
      label: 'נדרש סקירה',
      emoji: '🔍',
      description: 'סוף שבוע ועדיין מחצית פתוחה — הגיע הזמן לסגור שבוע.',
    }
  }

  // 6. Stuck — tasks in doing >3h or multiple critical open
  if (ta.stuck.length >= 1 || (ta.critical.length >= 2 && ta.doing.length === 0)) {
    return {
      id: 'Stuck',
      label: 'תקוע',
      emoji: '🚧',
      description: 'יש חסמים פתוחים שמונעים מהשבוע להסתיים בהצלחה.',
    }
  }

  // 7. Scattered — more than 60% tasks unlinked, no Big 3
  if (!ta.hasBig3 || ta.unlinkedPct >= 60) {
    return {
      id: 'Scattered',
      label: 'מפוזר',
      emoji: '💨',
      description: 'הרבה רעש — משימות ללא יעד ו/או אין Big 3.',
    }
  }

  // 8. Executing — normal focused execution
  return {
    id: 'Executing',
    label: 'מבצע',
    emoji: '⚙️',
    description: 'בתנועה — עם יעד, עם משימות, עם Big 3.',
  }
}

// ─── Next Best Action ─────────────────────────────────────────────────────────
// Single most important action to take right now

function computeNextBestAction({ mode, ta, monthly, profile }) {
  const mRevTarget  = monthly?.revenueTarget || 0
  const sp          = profile?.startingPoint || {}

  switch (mode.id) {
    case 'NoDirection':
      return {
        icon: '🎯',
        actionLabel: 'הגדר יעד חודשי',
        reason: 'המערכת לא יכולה לנתח ביצועים ללא יעד. זה לוקח 30 שניות.',
        urgency: 'high',
        estimatedTime: '2 דקות',
        path: '/',
        section: 'monthly',
      }

    case 'PlanningReady':
      return {
        icon: '📋',
        actionLabel: 'בנה את השבוע',
        reason: `יש לך יעד של ${mRevTarget ? `₪${mRevTarget.toLocaleString()}` : 'X'} — עכשיו תרגם אותו ל-3 Big משימות.`,
        urgency: 'high',
        estimatedTime: '10 דקות',
        path: '/weekly',
        section: null,
      }

    case 'Stuck': {
      if (ta.stuck.length > 0) {
        // Triggered by tasks stuck in "doing" too long
        const stuckTask = ta.stuck[0]
        return {
          icon: '🔓',
          actionLabel: stuckTask?.title ? `פתור חסם: "${stuckTask.title}"` : 'פתור משימה תקועה',
          reason: `${ta.stuck.length} משימ${ta.stuck.length === 1 ? 'ה תקועה' : 'ות תקועות'} מעל 3 שעות — סגור, פרק, או בטל. כל דקה שם היא רעש.`,
          urgency: 'high',
          estimatedTime: '15 דקות',
          path: '/weekly',
          section: null,
        }
      } else {
        // Triggered by multiple critical open tasks
        const critTask = ta.critical[0]
        return {
          icon: '🔴',
          actionLabel: critTask?.title ? `סגור קריטי: "${critTask.title}"` : 'סגור משימות קריטיות',
          reason: `${ta.critical.length} משימות קריטיות פתוחות בלי שמישהו בביצוע — בחר אחת ותתחיל עכשיו.`,
          urgency: 'high',
          estimatedTime: '30 דקות',
          path: '/weekly',
          section: null,
        }
      }
    }

    case 'Scattered': {
      if (ta.unlinked.length > 0) {
        // Scattered because tasks have no goal
        const firstUnlinked = ta.unlinked[0]
        return {
          icon: '🔗',
          actionLabel: firstUnlinked?.title ? `חבר ליעד: "${firstUnlinked.title}"` : 'חבר משימות ליעד',
          reason: `${ta.unlinked.length} משימות ללא יעד — הן מונעות ממך למצוא את המהלך הבא הנכון.`,
          urgency: 'medium',
          estimatedTime: '5 דקות',
          path: '/weekly',
          section: null,
        }
      } else {
        // Scattered because no Big 3 (all tasks linked, but no priority signal)
        return {
          icon: '⭐',
          actionLabel: 'סמן 3 משימות כ-Big 3',
          reason: 'כל המשימות מחוברות ליעד — אבל אין Big 3. בחר 3 שאם תסיים אותן השבוע, המספרים ישתנו.',
          urgency: 'medium',
          estimatedTime: '3 דקות',
          path: '/weekly',
          section: null,
        }
      }
    }

    case 'NearWin': {
      const openBig3 = ta.big3All.find(t => t.status !== 'done')
      return {
        icon: '🏁',
        actionLabel: openBig3?.title ? `סגור Big 3: "${openBig3.title}"` : 'דחף לסגירה — שבוע כמעט שלם',
        reason: `עוד מהלך אחד וזה נסגר. ${ta.big3Done.length}/${ta.big3All.length} Big 3 בוצעו — הסוף כבר נראה.`,
        urgency: 'high',
        estimatedTime: '30–60 דקות',
        path: '/weekly',
        section: null,
      }
    }

    case 'Momentum': {
      const nextTask = ta.today[0] || ta.active[0]
      return {
        icon: '🚀',
        actionLabel: nextTask ? `המשך: "${nextTask.title}"` : 'פתח שבוע חדש עם אנרגיה',
        reason: 'שבוע מנצח! Big 3 הושלם — עכשיו תסגור עוד משימה ותמנף את המומנטום.',
        urgency: 'low',
        estimatedTime: '30 דקות',
        path: '/weekly',
        section: null,
      }
    }

    case 'ReviewNeeded':
      return {
        icon: '🔍',
        actionLabel: 'סגור שבוע — עשה סקירה',
        reason: 'סוף שבוע. רשום מה עבד, מה לא, ומה אתה לוקח לשבוע הבא.',
        urgency: 'high',
        estimatedTime: '15 דקות',
        path: '/weekly',
        section: null,
      }

    case 'Executing':
    default: {
      // Find the single best open task
      const openBig3 = ta.big3All.find(t => t.status !== 'done')
      if (openBig3) {
        return {
          icon: '⭐',
          actionLabel: `Big 3: "${openBig3.title}"`,
          reason: 'הגדולים קודם — זה המהלך שמזיז הכי הרבה.',
          urgency: 'medium',
          estimatedTime: '45 דקות',
          path: '/weekly',
          section: null,
        }
      }
      const nextCritical = ta.critical[0]
      if (nextCritical) {
        return {
          icon: '🔴',
          actionLabel: `קריטי: "${nextCritical.title}"`,
          reason: 'משימה קריטית פתוחה — אל תתן לה לחכות עוד.',
          urgency: 'high',
          estimatedTime: '30 דקות',
          path: '/weekly',
          section: null,
        }
      }
      const todayTask = ta.today[0]
      if (todayTask) {
        return {
          icon: '📌',
          actionLabel: `היום: "${todayTask.title}"`,
          reason: 'המשימה הבאה בתור להיום — תסגור ואז הבא.',
          urgency: 'medium',
          estimatedTime: '30 דקות',
          path: '/weekly',
          section: null,
        }
      }
      return {
        icon: '📋',
        actionLabel: 'מה הפעולה הבאה שמניעה הכנסות?',
        reason: 'אין משימות ל"היום" — העבר אחת מהשבוע או הוסף חדשה.',
        urgency: 'medium',
        estimatedTime: '5 דקות',
        path: '/weekly',
        section: null,
      }
    }
  }
}

// ─── Near Win Hints ───────────────────────────────────────────────────────────
// List of "if you do X → week succeeds" hints

function computeNearWinHints({ ta, monthly }) {
  const hints = []
  const mRevTarget = monthly?.revenueTarget || 0

  if (ta.big3NearDone) {
    const openBig3 = ta.big3All.find(t => t.status !== 'done')
    hints.push({
      icon: '⭐',
      text: openBig3
        ? `סגור "` + openBig3.title + `" — ושלושת הגדולים הושלמו`
        : 'עוד Big 3 אחד ושבוע מושלם',
      impact: 'גבוה',
    })
  }

  if (ta.stuck.length > 0) {
    hints.push({
      icon: '🔓',
      text: `פתור ${ta.stuck.length} משימ${ta.stuck.length === 1 ? 'ה' : 'ות'} תקועות — הן מחסמות את הזרימה`,
      impact: 'גבוה',
    })
  }

  if (ta.critical.length > 0 && ta.critical.length <= 2) {
    hints.push({
      icon: '🔴',
      text: `${ta.critical.length} משימה קריטית ממתינה — שעה אחת יכולה לסגור אותה`,
      impact: 'גבוה',
    })
  }

  if (ta.unlinked.length > 0 && ta.unlinked.length <= 3) {
    hints.push({
      icon: '🔗',
      text: `חבר ${ta.unlinked.length} משימות ליעד — כך תדע שאתה עובד על הדברים הנכונים`,
      impact: 'בינוני',
    })
  }

  if (ta.totalPct >= 50 && ta.totalPct < 80) {
    hints.push({
      icon: '📈',
      text: `${ta.totalPct}% ביצוע — עוד ${80 - ta.totalPct}% ותגיע ל-80% שבוע חזק`,
      impact: 'בינוני',
    })
  }

  return hints.slice(0, 3)
}

// ─── Coach Message ────────────────────────────────────────────────────────────

function computeCoachMessage({ mode, ta, monthly, profile, riskLevel, weeklySummaries = [] }) {
  const name  = profile?.name?.split(' ')[0] || ''
  const prefix = name ? `${name}, ` : ''
  const mRevTarget = monthly?.revenueTarget || 0

  // Last week's retro — use it to personalise the message
  const lastRetro = weeklySummaries[0] || null
  const lastChange = lastRetro?.whatChange?.trim()
  const lastWin    = lastRetro?.mainWin?.trim()

  // Stuck message: differentiate "doing >3h" vs "critical open, nothing started"
  const stuckMsg = ta.stuck.length > 0
    ? `${prefix}${ta.stuck.length} משימ${ta.stuck.length === 1 ? 'ה תקועה' : 'ות תקועות'} בביצוע. בחר אחת: סגור בלי פרפקציוניזם, פרק לפעולה ב-15 דקות, או בטל לחלוטין.`
    : `${prefix}${ta.critical.length} משימות קריטיות פתוחות ולא התחלת אף אחת. עצור הכל — בחר אחת ותתחיל עכשיו.`

  // Scattered message: differentiate no-goal-links vs no-Big3
  const scatteredMsg = ta.unlinked.length > 0
    ? `${prefix}${ta.unlinked.length} משימות ללא יעד. פנה 10 דקות: חבר כל משימה ליעד, או מחק — הרעש עולה לך ביוקר.`
    : `${prefix}כל המשימות מחוברות ליעד — אבל אין Big 3. סמן 3 משימות שאם תסיים אותן, השבוע הצליח.`

  const messages = {
    NoDirection:    `${prefix}לפני שנזוז — נגדיר לאן. הגדר יעד חודשי ריאלי ותן למערכת לנתח את הפוטנציאל שלך.`,
    PlanningReady:  `${prefix}יש יעד — חסרות משימות. בנה 3 מהלכים שאם תסיים אותם, ${mRevTarget ? `₪${mRevTarget.toLocaleString()}` : 'היעד'} יגיע.`,
    Scattered:      scatteredMsg,
    Executing:      lastChange
      ? `${prefix}שבוע שעבר החלטת: "${lastChange.slice(0, 50)}${lastChange.length > 50 ? '...' : ''}". אתה עושה את זה השבוע?`
      : `${prefix}אתה בתנועה. ${ta.big3All.length > 0 ? `Big 3: ${ta.big3Done.length}/${ta.big3All.length} — ` : ''}תמשיך ברצף, אל תפסיק בין משימות.`,
    Stuck:          stuckMsg,
    NearWin:        `${prefix}שבוע כמעט מושלם! עוד מהלך אחד וזה נסגר. אל תפסיק עכשיו — תסיים.`,
    Momentum:       lastWin
      ? `${prefix}בנית על "${lastWin.slice(0, 40)}${lastWin.length > 40 ? '...' : ''}" — המשך את הגל.`
      : `${prefix}שבוע מנצח — Big 3 הושלם ו-${ta.totalPct}% ביצוע. תמנף את האנרגיה הזו לשבוע הבא.`,
    ReviewNeeded:   `${prefix}סוף שבוע. לפני שאתה מתחיל חדש — כתוב: מה עבד, מה לא, ומה אחד אתה לוקח קדימה.`,
  }

  return messages[mode.id] || messages.Executing
}

// ─── Identity Sentence ────────────────────────────────────────────────────────

function computeIdentitySentence({ mode, profile, ta }) {
  const name     = profile?.name?.split(' ')[0] || ''
  const identity = profile?.annualGoals?.identity || ''
  const vision   = profile?.annualGoals?.visionStatement || ''

  // Priority 1: user's own identity statement (Setup → "זהות")
  if (identity && identity.length > 5) {
    return identity.slice(0, 70) + (identity.length > 70 ? '...' : '')
  }
  // Priority 2: vision statement
  if (vision && vision.length > 5) {
    return vision.slice(0, 70) + (vision.length > 70 ? '...' : '')
  }

  // Priority 3: mode-aware sentence personalised with first name
  const n = name || 'אתה'
  const byMode = {
    Momentum:      `${n} מוכיח כל שבוע מחדש — זה מה שמייחד מנצחים`,
    NearWin:       `הקו הסיום כבר נראה — מי שמגיע לכאן, מסיים`,
    Executing:     `${n} לא מחכה להרגשה הנכונה — פשוט זז`,
    Stuck:         `כל חסם הוא מידע — מי שמזהה ופותר, מנצח`,
    Scattered:     `בהירות עולה ביצועים — בחר אחת ורק אחת`,
    PlanningReady: `הכוח הגדול ביותר הוא לדעת לאן הולכים`,
    NoDirection:   `הצעד הראשון הוא לבחור כיוון — ואז ללכת`,
    ReviewNeeded:  `מי שלומד מהשבוע שעבר, ניצח את השבוע הבא`,
    Overloaded:    `${n} יודע מה עושים עם עומס — בוחרים אחד ומסיימים`,
  }

  return byMode[mode.id] || `${n} בונה כל יום — זה מה שמייצר תוצאות`
}

// ─── Weekly Status ────────────────────────────────────────────────────────────

function computeWeeklyStatus({ ta }) {
  if (ta.total === 0) return { label: 'ריק', color: 'slate' }
  if (ta.totalPct >= 80 && ta.big3Complete) return { label: '🏆 שבוע מנצח', color: 'green' }
  if (ta.totalPct >= 60 && ta.big3Pct >= 50) return { label: '📈 על המסלול', color: 'blue' }
  if (ta.stuck.length >= 1 || ta.totalPct < 30)  return { label: '🔴 צריך תשומת לב', color: 'red' }
  return { label: '⚠️ בתנועה', color: 'amber' }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * getFlowBrainState — compute full brain state from user data.
 *
 * @param {object} params
 * @param {object} params.profile          — from useStore().profile
 * @param {object} params.quarterly        — from useStore().quarterly
 * @param {object} params.monthly          — from useStore().monthly
 * @param {Array}  params.tasks            — from useStore().tasks
 * @param {Array}  params.weeklySummaries  — from localStorage flowos_weekly_summaries (optional)
 * @param {Date}   params.now              — override current date (for testing)
 * @returns {BrainState}
 */
export function getFlowBrainState({
  profile,
  quarterly,
  monthly,
  tasks = [],
  weeklySummaries = [],
  now = new Date(),
} = {}) {
  const eow = isEndOfWeek(now)
  const ta  = analyseTasksRaw(tasks ?? [])

  const mode             = computeUserMode({ ta, monthly, profile, isEndOfWeek: eow })
  const riskLevel        = computeRiskLevel({ ta, monthly, profile, isEndOfWeek: eow })
  const executionPattern = computeExecutionPattern(ta)
  const nextBestAction   = computeNextBestAction({ mode, ta, monthly, profile })
  const nearWinHints     = computeNearWinHints({ ta, monthly })
  const coachMessage     = computeCoachMessage({ mode, ta, monthly, profile, riskLevel, weeklySummaries })
  const identitySentence = computeIdentitySentence({ mode, profile, ta })
  const weeklyStatus     = computeWeeklyStatus({ ta })

  return {
    // Mode
    userMode:         mode.id,
    modeLabel:        mode.label,
    modeEmoji:        mode.emoji,
    modeDescription:  mode.description,

    // Risk
    riskLevel:        riskLevel.level,   // 'green' | 'yellow' | 'red'
    riskLabel:        riskLevel.label,
    riskHex:          riskLevel.hex,

    // Status
    weeklyStatus,

    // Action
    nextBestAction,   // { icon, actionLabel, reason, urgency, estimatedTime, path, section }

    // Pattern
    executionPattern, // { id, label, emoji, color }

    // Coaching
    coachMessage,
    identitySentence,

    // Recent retro — last closed week's reflection (for Dashboard / Nivos context)
    recentRetro: weeklySummaries[0] || null,

    // Near win
    nearWinHints,     // [{ icon, text, impact }]

    // Raw stats (for display)
    taskStats: {
      total:        ta.total,
      done:         ta.done.length,
      totalPct:     ta.totalPct,
      big3Total:    ta.big3All.length,
      big3Done:     ta.big3Done.length,
      big3Pct:      ta.big3Pct,
      stuckCount:   ta.stuck.length,
      unlinkedCount: ta.unlinked.length,
    },
  }
}
