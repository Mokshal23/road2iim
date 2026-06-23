import { MISTAKE_TAGS, MAX_MISTAKE_TAGS } from '../constants';

export default function MistakeTagPicker({ value = [], onChange }) {
  function toggle(tag) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      if (value.length >= MAX_MISTAKE_TAGS) return;
      onChange([...value, tag]);
    }
  }

  return (
    <div className="tagpicker">
      {MISTAKE_TAGS.map((tag) => {
        const active = value.includes(tag);
        const disabled = !active && value.length >= MAX_MISTAKE_TAGS;
        return (
          <button
            type="button"
            key={tag}
            className={`tag ${active ? 'tag--active' : ''}`}
            onClick={() => toggle(tag)}
            disabled={disabled}
            title={disabled ? `Max ${MAX_MISTAKE_TAGS} tags` : tag}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
