const TABS = ['Annual', 'Q1', 'Q2', 'Q3', 'Q4']

export default function GoalHierarchyNav({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
            active === tab
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
