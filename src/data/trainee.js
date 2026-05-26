// Trainee profiles + starting point data (from יומן מסע — one-time fill)

export const trainees = [
  {
    email: 'lior@example.com',
    name: 'ליאור כהן',
    phone: '054-1234567',
    startDate: '2026-01-15',
    status: 'active', // active | paused | completed
    track: 'ליווי פרימיום',
    coach: 'ניב בלי',
    cohort: 'קוהורט 5',
    notes: '',
    // Starting Point — one-time fill
    startingPoint: {
      avgMonthlyRevenue: 8000,
      avgMonthlyProfit: 6800,
      monthlyLeads: 20,
      monthlyCalls: 6,
      closingRate: 50,
      freeCashflow: 0,
      // Founder mental state at start
      confidence: 7,
      clarity: 8,
      discipline: 6,
      mentalResilience: 9,
      // Deep questions
      whereStuck: 'צריך לססטם את התהליך — מערכת פעולות שתייצר תוצאות בלי מעורבות גבוהה',
      mainPattern: 'מעמיס יותר מדי או לא מתקדם בכלל — יעדים לא נכונים ותיאום צפיות לקוי',
      escapePattern: 'בורח להתעסקות לא בפארטו כשלא נוח',
    },
    // Annual goals
    annualGoals: {
      revenueTarget: 240000, // 60 מתאמנים × 4000
      profitabilityTarget: 70,
      communityTarget: '15,000 עוקבים',
      identity: 'מנהיג שמשנה חיים — ממושמע, נוכח, מקצועי ברמה הגבוהה ביותר',
    },
  },
  {
    email: 'eden@example.com',
    name: 'עדן לוי',
    phone: '050-9876543',
    startDate: '2026-02-01',
    status: 'active',
    track: 'ליווי עסקי',
    coach: 'ניב בלי',
    cohort: 'קוהורט 5',
    notes: '',
    startingPoint: {
      avgMonthlyRevenue: 12000,
      avgMonthlyProfit: 9000,
      monthlyLeads: 30,
      monthlyCalls: 10,
      closingRate: 40,
      freeCashflow: 2000,
      confidence: 6,
      clarity: 7,
      discipline: 5,
      mentalResilience: 7,
      whereStuck: 'לא מצליחה להעלות מחירים — חוסר ביטחון בערך שלי',
      mainPattern: 'עובדת המון שעות אבל לא על הדברים שמייצרים כסף',
      escapePattern: 'נכנסת לעבודה אופרטיבית במקום אסטרטגית כשמרגישה לחץ',
    },
    annualGoals: {
      revenueTarget: 300000,
      profitabilityTarget: 60,
      communityTarget: '10,000 עוקבים',
      identity: 'בעלת עסק שמרוויחה כמו שהיא שווה — מנהלת ולא עובדת',
    },
  },
]

export function getTrainee(email) {
  return trainees.find(t => t.email === email) || null
}
