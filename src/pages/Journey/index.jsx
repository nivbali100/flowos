import { useRef } from 'react'
import TopBar from '../../components/layout/TopBar.jsx'
import { useData } from '../../hooks/useData.js'
import { useStore } from '../../hooks/useStore.js'

import OpeningRules from './OpeningRules.jsx'
import SectionHeader from './SectionHeader.jsx'
import SectionNav from './SectionNav.jsx'
import StartingPoint from './StartingPoint.jsx'
import AnnualVision from './AnnualVision.jsx'
import QuarterlySection from './QuarterlySection.jsx'
import MonthlySection from './MonthlySection.jsx'
import WeeklySection from './WeeklySection.jsx'

export default function Journey() {
  // Read-only historical data (still from useData)
  const latest   = useData('raw.latest')
  const previous = useData('raw.previous')
  const allWeeks = useData('raw.allWeeks')
  // Monthly goals from useStore — real user data, not seed data
  const { monthly } = useStore()

  // Refs for section navigation
  const refA = useRef(null)
  const refB = useRef(null)
  const refC = useRef(null)
  const refD = useRef(null)
  const refE = useRef(null)
  const sectionRefs = [refA, refB, refC, refD, refE]

  return (
    <div>
      <TopBar title="יומן מסע" />
      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto">

        {/* Opening Rules — collapsible */}
        <OpeningRules />

        {/* א. נקודת פתיחה */}
        <SectionHeader ref={refA} letter="א" title="נקודת פתיחה" subtitle="מצב העסק והיזם בתחילת הדרך" />
        <StartingPoint />

        {/* ב. יעד שנתי */}
        <SectionHeader ref={refB} letter="ב" title="יעד שנתי" subtitle="לאן אני הולך השנה" />
        <AnnualVision />

        {/* ג. יעדים רבעוניים */}
        <SectionHeader ref={refC} letter="ג" title="יעדים רבעוניים" subtitle="פירוק היעד השנתי לרבעונים" />
        <QuarterlySection />

        {/* ד. יעדים חודשיים */}
        <SectionHeader ref={refD} letter="ד" title="יעדים חודשיים" subtitle="מה חייב לקרות החודש" />
        <MonthlySection />

        {/* ה. ניהול שבועי */}
        <SectionHeader ref={refE} letter="ה" title="ניהול שבועי" subtitle="בקרה, ביצוע, התבוננות" />
        <WeeklySection
          latest={latest}
          previous={previous}
          allWeeks={allWeeks}
          monthlyGoals={monthly}
        />

        {/* Bottom padding for BottomNav */}
        <div className="h-8" />
      </div>

      {/* Floating section navigator */}
      <SectionNav refs={sectionRefs} />
    </div>
  )
}
