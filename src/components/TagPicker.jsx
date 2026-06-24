export default function TagPicker({ value = [], onChange, options, max = 3, good = false }) {
  function toggle(tag) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      if (value.length >= max) return;
      onChange([...value, tag]);
    }
  }

  return (
    <div className="tagpicker">
      {options.map((tag) => {
        const active = value.includes(tag);
        const disabled = !active && value.length >= max;
        return (
          <button
            type="button"
            key={tag}
            className={`tag ${good ? 'tag--good' : ''} ${active ? 'tag--active' : ''}`}
            onClick={() => toggle(tag)}
            disabled={disabled}
            title={disabled ? `Max ${max} tags` : tag}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
