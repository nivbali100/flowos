// Journey Journal goals — Quarterly + Monthly (from יומן מסע)

export const quarterlyGoals = {
  'lior@example.com': [
    {
      quarter: 'Q2',
      year: 2026,
      status: 'active',
      revenueTarget: 52500, // 15 מתאמנים × 3500
      leadsTarget: 70, // per month
      callsTarget: 17, // per month
      closuresTarget: 5, // per month
      threeKeyMoves: [
        'מנגנון פניות אורגני קבוע — סרטון ביום + מסע לקוח איכותי',
        'ייעול ואופטימיזציה של תהליך השירות — מעקב + הקלטות',
        '2 תכנים ארוכים בחודש למשך 3 חודשים',
      ],
      habit: 'חשיבה כמרתון וכחברה שמשנה חיים — לא כספרינט',
      risk: 'פרפקציוניזם מעכב במוצר + תוכן לא מדויק + לא לעמוד בהתחייבויות',
    },
  ],
  'eden@example.com': [
    {
      quarter: 'Q2',
      year: 2026,
      status: 'active',
      revenueTarget: 60000,
      leadsTarget: 25,
      callsTarget: 10,
      closuresTarget: 4,
      threeKeyMoves: [
        'להשיק קמפיין ממומן שמייצר לידים באופן יציב',
        'לבנות תהליך מכירה שממיר 40%+',
        'לסגור 2 שיתופי פעולה אסטרטגיים',
      ],
      habit: 'לקיים 2 שיחות מכירה ביום — לא לדחות',
      risk: 'שחיקה — עובדת יותר מדי שעות על דברים לא נכונים',
    },
  ],
}

export const monthlyGoals = {
  'lior@example.com': [
    {
      month: 'אפריל',
      year: 2026,
      quarter: 'Q2',
      status: 'active',
      revenueTarget: 17500, // 5 × 3500
      leadsTarget: 70,
      callsTarget: 17,
      closuresTarget: 5,
      threeKeyMoves: [
        'סרטון ביום ברילס — בנייה של מנגנון אורגני',
        'לסגור 5 מתאמנים חדשים',
        'לצלם ולהקליט כל אינטראקציה עם לקוח',
      ],
      habit: 'סקירת יעדים כל בוקר — 15 דקות',
      mentalEntry: 'נכנס עם אנרגיה גבוהה אחרי חופשת פסח. צריך לשמור על מומנטום.',
      whatCouldFail: 'אם לא אשלח הודעות קרות עד שבוע 3, היעד בסכנה',
      // Month-end analysis (filled at end of month)
      monthEndActualRevenue: null,
      monthEndActualLeads: null,
      monthEndWhatWorked: null,
      monthEndWhatDidnt: null,
      monthEndPatternRepeated: null,
      monthEndWhatToDoDifferently: null,
    },
  ],
  'eden@example.com': [
    {
      month: 'אפריל',
      year: 2026,
      quarter: 'Q2',
      status: 'active',
      revenueTarget: 20000,
      leadsTarget: 25,
      callsTarget: 10,
      closuresTarget: 4,
      threeKeyMoves: [
        'להעלות קמפיין ממומן עד סוף שבוע 1',
        'לקיים 10 שיחות מכירה',
        'לשלוח ניוזלטר שבועי',
      ],
      habit: '2 שיחות מכירה ביום — לא לדחות',
      mentalEntry: 'מרגישה שחיקה מהחודש הקודם. צריכה להאט קצת ולהתמקד.',
      whatCouldFail: 'אם השחיקה תמשיך — אפול על ביצוע',
      monthEndActualRevenue: null,
      monthEndActualLeads: null,
      monthEndWhatWorked: null,
      monthEndWhatDidnt: null,
      monthEndPatternRepeated: null,
      monthEndWhatToDoDifferently: null,
    },
  ],
}

export function getQuarterlyGoals(email) {
  return quarterlyGoals[email] || []
}

export function getMonthlyGoals(email) {
  return monthlyGoals[email] || []
}

export function getCurrentMonthGoals(email) {
  const goals = monthlyGoals[email] || []
  return goals.find(g => g.status === 'active') || goals[0] || null
}
