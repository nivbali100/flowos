// RAW Sheet mirror — Google Form responses (one row per trainee per week)
// This is what n8n fills automatically from the weekly form

export const rawFormData = [
  // === ליאור כהן — Week 1-4 April ===
  {
    email: 'lior@example.com',
    name: 'ליאור כהן',
    month: 'אפריל',
    year: 2026,
    week: 1,
    filledAt: '2026-04-04T18:00:00Z',
    // KPIs — targets (set by coach at start of month)
    targetsLeads: 18,
    targetsCalls: 8,
    targetsClosures: 3,
    targetsRevenue: 14000,
    // KPIs — actuals this week
    leads: 5,
    calls: 2,
    closures: 1,
    revenue: 3500,
    // 3 Big Things
    bigThree: [
      'ליצור 2 סרטונים לרילס',
      'לסגור לקוח מהשיחה עם דני',
      'לשלוח 10 הודעות קרות',
    ],
    bigThreeCompleted: 2, // out of 3
    // Improvement & Preservation
    improvementCommitment: 'לצאת מאזור הנוחות ולפרסם תוכן כל יום',
    improvementDays: 5, // out of 7
    preservationCommitment: 'לשמור על שגרת בוקר',
    preservationDays: 6, // out of 7
    // Mental State (1-10)
    energy: 7,
    commitment: 8,
    load: 6,
    selfControl: 7,
    // Weekly Close
    biggestWin: 'סגרתי לקוח חדש אחרי שיחה של 20 דקות — מוצר חד.',
    whatWasntDone: 'לא שלחתי את 10 ההודעות הקרות',
    whyNot: 'דחיינות — פחד מדחייה',
    mostImportantNextWeek: 'לשלוח 15 הודעות קרות עד יום רביעי',
  },
  {
    email: 'lior@example.com',
    name: 'ליאור כהן',
    month: 'אפריל',
    year: 2026,
    week: 2,
    filledAt: '2026-04-11T17:30:00Z',
    targetsLeads: 18,
    targetsCalls: 8,
    targetsClosures: 3,
    targetsRevenue: 14000,
    leads: 7,
    calls: 3,
    closures: 1,
    revenue: 3500,
    bigThree: [
      'לשלוח 15 הודעות קרות',
      'לפרסם 3 סטוריז',
      'להכין מצגת מכירה חדשה',
    ],
    bigThreeCompleted: 3,
    improvementCommitment: 'לפרסם תוכן כל יום',
    improvementDays: 6,
    preservationCommitment: 'שגרת בוקר',
    preservationDays: 7,
    energy: 8,
    commitment: 9,
    load: 5,
    selfControl: 8,
    biggestWin: 'שלחתי את כל ההודעות הקרות — 3 ענו חיובי!',
    whatWasntDone: 'המצגת לא הושלמה — רק 70%',
    whyNot: 'חוסר זמן בגלל לקוח דחוף',
    mostImportantNextWeek: 'להשלים מצגת + 2 שיחות מכירה',
  },
  // === עדן לוי ===
  {
    email: 'eden@example.com',
    name: 'עדן לוי',
    month: 'אפריל',
    year: 2026,
    week: 1,
    filledAt: '2026-04-04T19:00:00Z',
    targetsLeads: 25,
    targetsCalls: 10,
    targetsClosures: 4,
    targetsRevenue: 20000,
    leads: 8,
    calls: 4,
    closures: 2,
    revenue: 8000,
    bigThree: [
      'להשיק קמפיין ממומן חדש',
      'לסגור 2 עסקאות מהפייפליין',
      'לכתוב 2 פוסטים ללינקדאין',
    ],
    bigThreeCompleted: 2,
    improvementCommitment: 'להפסיק לדחות שיחות מכירה',
    improvementDays: 4,
    preservationCommitment: 'לסיים עבודה עד 18:00',
    preservationDays: 3,
    energy: 6,
    commitment: 7,
    load: 8,
    selfControl: 5,
    biggestWin: 'סגרתי 2 עסקאות — ₪8,000 בשבוע!',
    whatWasntDone: 'הקמפיין הממומן לא עלה',
    whyNot: 'לא הכנתי את הקריאייטיב — תקוע על פרפקציוניזם',
    mostImportantNextWeek: 'להעלות קמפיין ביום ראשון — בלי תירוצים',
  },
  {
    email: 'eden@example.com',
    name: 'עדן לוי',
    month: 'אפריל',
    year: 2026,
    week: 2,
    filledAt: '2026-04-11T20:00:00Z',
    targetsLeads: 25,
    targetsCalls: 10,
    targetsClosures: 4,
    targetsRevenue: 20000,
    leads: 10,
    calls: 3,
    closures: 1,
    revenue: 4000,
    bigThree: [
      'להעלות קמפיין ממומן',
      'לקיים 4 שיחות מכירה',
      'לשלוח ניוזלטר',
    ],
    bigThreeCompleted: 1,
    improvementCommitment: 'לא לדחות שיחות מכירה',
    improvementDays: 3,
    preservationCommitment: 'לסיים עד 18:00',
    preservationDays: 2,
    energy: 5,
    commitment: 6,
    load: 9,
    selfControl: 4,
    biggestWin: 'הקמפיין עלה סוף סוף!',
    whatWasntDone: 'רק שיחה אחת מתוך 4',
    whyNot: 'עומס נפשי — הרגשתי שחוקה',
    mostImportantNextWeek: 'לקחת יום מנוחה ואז לקיים 3 שיחות',
  },
  // === ניב בלי (the coach — also has his own data) ===
  {
    email: 'niv@example.com',
    name: 'ניב בלי',
    month: 'אפריל',
    year: 2026,
    week: 1,
    filledAt: '2026-04-05T08:00:00Z',
    targetsLeads: 70,
    targetsCalls: 17,
    targetsClosures: 5,
    targetsRevenue: 17500,
    leads: 20,
    calls: 5,
    closures: 1,
    revenue: 3500,
    bigThree: [
      'מנגנון פניות אורגני — סרטון ביום',
      'ייעול תהליך שירות של ליאור',
      'תוכן ארוך ראשון לחודש',
    ],
    bigThreeCompleted: 2,
    improvementCommitment: 'חשיבה כמרתון ולא כספרינט',
    improvementDays: 5,
    preservationCommitment: 'לשמור על מדיטציה יומית',
    preservationDays: 6,
    energy: 8,
    commitment: 9,
    load: 7,
    selfControl: 7,
    biggestWin: 'סרטון ויראלי — 15K צפיות אורגני',
    whatWasntDone: 'תוכן ארוך לא הושלם',
    whyNot: 'פרפקציוניזם — רציתי שיהיה מושלם במקום להוציא',
    mostImportantNextWeek: 'להוציא את התוכן הארוך — done is better than perfect',
  },
]

// Helper: get latest data for a trainee
export function getLatestWeek(email) {
  const rows = rawFormData.filter(r => r.email === email)
  return rows[rows.length - 1] || null
}

// Helper: get previous week (for targets comparison)
export function getPreviousWeek(email) {
  const rows = rawFormData.filter(r => r.email === email)
  return rows.length >= 2 ? rows[rows.length - 2] : null
}

// Helper: get all weeks for a trainee
export function getWeeksForTrainee(email) {
  return rawFormData.filter(r => r.email === email)
}

// Helper: get all unique trainees
export function getAllTrainees() {
  const seen = new Map()
  rawFormData.forEach(r => {
    if (!seen.has(r.email)) {
      seen.set(r.email, { email: r.email, name: r.name })
    }
  })
  return [...seen.values()]
}
