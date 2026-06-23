import { SECTION_LIST } from '../constants';

export default function SectionTabs({ value, onChange, includeAll = false }) {
  return (
    <div className="section-tabs">
      {includeAll && (
        <button
          type="button"
          className={`section-tab ${value === 'ALL' ? 'section-tab--active' : ''}`}
          onClick={() => onChange('ALL')}
        >
          All
        </button>
      )}
      {SECTION_LIST.map((s) => (
        <button
          key={s.key}
          type="button"
          className={`section-tab ${value === s.key ? 'section-tab--active' : ''}`}
          style={value === s.key ? { background: s.color, borderColor: s.color } : { borderColor: s.color }}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
