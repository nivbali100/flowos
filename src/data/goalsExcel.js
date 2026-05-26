// Goals Excel mirror — per-domain weekly breakdown (קובץ הצבת יעדים)
// Each month has domains with monthly goals broken into 4 weeks

export const goalsExcel = {
  'lior@example.com': {
    'אפריל 2026': {
      domains: [
        {
          name: 'למידה',
          monthlyGoal: '2 ספרים + קורס שיווק דיגיטלי',
          weeks: [
            { goal: '100 עמודים + 5 פרקים קורס', execution: 'בוצע', notes: '' },
            { goal: '100 עמודים + 5 פרקים', execution: '', notes: '' },
            { goal: 'סיום ספר ראשון', execution: '', notes: '' },
            { goal: 'סיום ספר שני + סיכום קורס', execution: '', notes: '' },
          ],
        },
        {
          name: 'התפתחות אישית',
          monthlyGoal: '30 מדיטציות + כתיבת יומן יומית',
          weeks: [
            { goal: '7 מדיטציות + יומן כל יום', execution: '6/7 מדיטציות', notes: 'החמצתי יום שישי' },
            { goal: '7 מדיטציות + יומן', execution: '', notes: '' },
            { goal: '7 מדיטציות + יומן', execution: '', notes: '' },
            { goal: '7 מדיטציות + יומן', execution: '', notes: '' },
          ],
        },
        {
          name: 'שיווק ותוכן',
          monthlyGoal: '30 רילסים + 2 תכנים ארוכים + 10 סטוריז ביום',
          weeks: [
            { goal: '7 רילסים + 1 תוכן ארוך', execution: '5 רילסים', notes: 'פרפקציוניזם' },
            { goal: '8 רילסים + סטוריז', execution: '', notes: '' },
            { goal: '8 רילסים + 1 תוכן ארוך', execution: '', notes: '' },
            { goal: '7 רילסים + סיכום חודש', execution: '', notes: '' },
          ],
        },
        {
          name: 'מכירות',
          monthlyGoal: '17 שיחות מכירה + 5 סגירות',
          weeks: [
            { goal: '5 שיחות + 10 הודעות קרות', execution: '2 שיחות + 0 הודעות', notes: 'דחיינות' },
            { goal: '5 שיחות + 15 הודעות', execution: '3 שיחות + 15 הודעות', notes: '' },
            { goal: '4 שיחות', execution: '', notes: '' },
            { goal: '3 שיחות + סגירות', execution: '', notes: '' },
          ],
        },
        {
          name: 'ניהול עסק',
          monthlyGoal: 'ייעול תהליך שירות + הקלטות + CRM',
          weeks: [
            { goal: 'מיפוי תהליך שירות נוכחי', execution: 'בוצע', notes: '' },
            { goal: 'בניית תסריט שירות + הקלטה', execution: '', notes: '' },
            { goal: 'הטמעה ובדיקה', execution: '', notes: '' },
            { goal: 'סיכום + שיפורים', execution: '', notes: '' },
          ],
        },
      ],
    },
  },
}

export function getGoalsExcel(email, monthYear) {
  return goalsExcel[email]?.[monthYear] || null
}
