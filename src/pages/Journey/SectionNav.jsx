const SECTIONS = ['א', 'ב', 'ג', 'ד', 'ה']

export default function SectionNav({ refs }) {
  const scrollTo = (idx) => {
    refs[idx]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 z-40 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-1.5">
      {SECTIONS.map((letter, i) => (
        <button
          key={letter}
          onClick={() => scrollTo(i)}
          className="w-8 h-8 rounded-lg text-xs font-bold text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center justify-center"
          title={letter}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
