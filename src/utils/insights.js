/**
 * Pace projections and smart coaching insights.
 * Language is direct, first-person, action-oriented — coach voice, not analyst voice.
 */

export function calcPaceProjection(allWeeks, annualTarget) {
  if (!allWeeks || allWeeks.length === 0) return null

  const totalRevenue = allWeeks.reduce((s, w) => s + (w.revenue || 0), 0)
  const weeksElapsed = allWeeks.length
  const weeklyPace = totalRevenue / weeksElapsed
  const projectedAnnual = Math.round(weeklyPace * 52)
  const pct = annualTarget > 0 ? Math.round((projectedAnnual / annualTarget) * 100) : 0
  const gapPct = pct - 100

  return { projectedAnnual, weeklyPace: Math.round(weeklyPace), pct, annualTarget, gapPct }
}

/**
 * calcSmartInsight — coaching-voice insight, one sentence + one action.
 * Priority: burnout → great week → big3 stuck → revenue drop → habits → default
 * Returns { text, type }
 */
export function calcSmartInsight(weekData, allWeeks, score) {
  if (!weekData) return null

  const weeksElapsed = allWeeks?.length || 1
  const totalRevenue = allWeeks?.reduce((s, w) => s + (w.revenue || 0), 0) || 0
  const avgWeeklyRevenue = weeksElapsed > 0 ? totalRevenue / weeksElapsed : 0

  const bigThreePct  = (weekData.bigThreeCompleted || 0) / 3
  const mentalAvg    = ((weekData.energy || 0) + (weekData.commitment || 0) + (weekData.selfControl || 0)) / 3
  const improvementOk = (weekData.improvementDays || 0) >= 4
  const preservationOk = (weekData.preservationDays || 0) >= 4
  const revenueTrend = weekData.revenue > avgWeeklyRevenue ? 'up'
    : weekData.revenue < avgWeeklyRevenue * 0.75 ? 'down' : 'flat'

  // Burnout signal — address it before anything else
  if ((weekData.load || 0) >= 8 && mentalAvg < 5) {
    return {
      text: 'אתה רץ על ריק — עומס גבוה ואנרגיה נמוכה. לפני שדוחף יותר, עצור לשעה ואזן.',
      type: 'alert',
    }
  }

  // Excellent week
  if (score >= 85) {
    return {
      text: revenueTrend === 'up'
        ? `ציון ${score} — שבוע יוצא מן הכלל. המומנטום עולה, שמור על הקצב הזה בדיוק.`
        : `ציון ${score} — שבוע מצוין. מה עשית שונה? בנה על זה שבוע הבא.`,
      type: 'success',
    }
  }

  // Big 3 — highest leverage
  if (bigThreePct < 0.34) {
    return {
      text: '3 הגדולים שלך לא הושלמו — כל השאר שנעשה הוא שינוי קוסמטי. מה עצר אותך?',
      type: 'warning',
    }
  }

  // Revenue drop
  if (revenueTrend === 'down' && weeksElapsed > 1) {
    return {
      text: 'הכנסות מתחת לממוצע שלך — הצינור מתרוקן. מה נמצא בפייפליין שאפשר לסגור עכשיו?',
      type: 'warning',
    }
  }

  // Habits both broken
  if (!improvementOk && !preservationOk) {
    return {
      text: 'גם שיפור וגם שימור נשברו השבוע — ההרגלים הם הבסיס לכל השאר. מה מנע?',
      type: 'warning',
    }
  }

  // Good — push for great
  if (score >= 65) {
    return {
      text: `ציון ${score} — טוב, אבל אתה יכול יותר. מה פעולה אחת שהייתה מעלה את הציון?`,
      type: 'neutral',
    }
  }

  // Mental state low
  if (mentalAvg < 5) {
    return {
      text: 'המצב המנטלי נמוך — לדחוף יותר מאמץ עכשיו לא יעזור. מה עוצר אותך בפנים?',
      type: 'alert',
    }
  }

  return {
    text: `ציון ${score} — שבוע קשה. זה קורה. מה שינוי אחד יכול לשפר את השבוע הבא?`,
    type: 'alert',
  }
}

/**
 * getCoachingMessage — short action prompt based on trainee state.
 * Used in places that need a push, not an analysis.
 */
export function getCoachingMessage(weekData, score) {
  if (!weekData) return 'מלא את היומן השבועי — זה המצפן שלך.'

  const big3 = weekData.bigThreeCompleted || 0
  const revenue = weekData.revenue || 0

  if (big3 === 0) return 'אפס מ-3 הגדולים — עצור הכל ועשה אחד עכשיו.'
  if (big3 === 1) return 'השלמת אחד מ-3 הגדולים — עוד שניים ואתה סוגר שבוע חזק.'
  if (revenue === 0) return 'אפס הכנסות עד עכשיו — מי מחכה להצעה שלך?'
  if (score >= 80) return 'אתה על גל — אל תעצור עכשיו.'
  if (score < 40) return 'שבוע קשה. פעולה אחת קטנה עכשיו מחזירה את המומנטום.'

  return 'תמשיך — אתה על המסלול.'
}

export function getInsightStyle(type) {
  switch (type) {
    case 'success': return { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  dot: '#22c55e' }
    case 'warning': return { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  dot: '#f59e0b' }
    case 'alert':   return { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    dot: '#ef4444' }
    default:        return { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   dot: '#3b82f6' }
  }
}
