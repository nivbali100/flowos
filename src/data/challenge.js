// Challenge file mirror — daily habit tracking (קובץ אתגר)

export const challengeConfig = {
  'lior@example.com': {
    habits: [
      'הקראת מטרות בקול רם',
      'קריאה בספר',
      '30 דקות למידה קלוד',
      'אימון כוח',
      'עמידה בהתחייבויות יומיות ללקוחות',
    ],
  },
  'eden@example.com': {
    habits: [
      'מודה אני',
      'קריאה 10-20 עמודים',
      'פיזיו',
      'הליכה',
      'בלי וויד',
      'מדיטציה',
      'סרטון לרשתות',
      '30 דק למידה',
      'סמן וי',
      'לשתות 1.5 ליטר מים',
    ],
  },
}

// Daily tracking data — array of days
export const challengeData = {
  'lior@example.com': [
    { date: '2026-04-05', day: 'יום ראשון', results: [true, true, true, true, true] },
    { date: '2026-04-06', day: 'יום שני', results: [true, true, true, false, true] },
    { date: '2026-04-07', day: 'יום שלישי', results: [true, false, true, true, true] },
    { date: '2026-04-08', day: 'יום רביעי', results: [true, true, true, true, true] },
    { date: '2026-04-09', day: 'יום חמישי', results: [true, true, false, true, true] },
    { date: '2026-04-10', day: 'יום שישי', results: [true, true, true, false, true] },
    { date: '2026-04-11', day: 'יום שבת', results: [false, true, false, false, true] },
    { date: '2026-04-12', day: 'יום ראשון', results: [true, true, true, true, true] },
    { date: '2026-04-13', day: 'יום שני', results: [true, true, true, true, true] },
    { date: '2026-04-14', day: 'יום שלישי', results: [true, false, true, true, true] },
    { date: '2026-04-15', day: 'יום רביעי', results: [true, true, true, true, false] },
  ],
  'eden@example.com': [
    { date: '2026-04-05', day: 'יום ראשון', results: [true, true, true, true, true, true, true, true, true, true] },
    { date: '2026-04-06', day: 'יום שני', results: [true, true, true, true, true, true, true, true, true, true] },
    { date: '2026-04-07', day: 'יום שלישי', results: [true, true, true, true, true, true, false, true, true, true] },
    { date: '2026-04-08', day: 'יום רביעי', results: [true, false, true, true, true, true, false, false, true, true] },
    { date: '2026-04-09', day: 'יום חמישי', results: [true, true, true, true, false, true, true, true, true, true] },
    { date: '2026-04-10', day: 'יום שישי', results: [true, true, true, true, true, true, false, false, true, false] },
    { date: '2026-04-11', day: 'יום שבת', results: [true, true, true, true, true, true, true, true, true, true] },
  ],
}

export function getChallengeConfig(email) {
  return challengeConfig[email] || null
}

export function getChallengeData(email) {
  return challengeData[email] || []
}

export function calcDaySuccessRate(results) {
  if (!results || results.length === 0) return 0
  return results.filter(Boolean).length / results.length
}

export function calcCurrentStreak(data) {
  let streak = 0
  for (let i = data.length - 1; i >= 0; i--) {
    if (calcDaySuccessRate(data[i].results) === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}
