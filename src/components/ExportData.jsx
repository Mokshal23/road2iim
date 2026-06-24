import { downloadCSV, entriesToRows, aeonToRows, mocksToRows } from '../utils/csv';
import { todayStr } from '../utils/dates';

export default function ExportData({ entries, articles, mocks }) {
  return (
    <div className="card">
      <h3>Export data</h3>
      <p className="empty" style={{ marginBottom: 10 }}>Plain CSV files — for backup, or to hand to another mentor.</p>
      <div className="export-row">
        <button
          className="btn btn--ghost btn--sm"
          disabled={entries.length === 0}
          onClick={() => downloadCSV(entriesToRows(entries), `road2iim-entries-${todayStr()}.csv`)}
        >
          Practice entries ({entries.length})
        </button>
        <button
          className="btn btn--ghost btn--sm"
          disabled={articles.length === 0}
          onClick={() => downloadCSV(aeonToRows(articles), `road2iim-aeon-${todayStr()}.csv`)}
        >
          Aeon articles ({articles.length})
        </button>
        <button
          className="btn btn--ghost btn--sm"
          disabled={mocks.length === 0}
          onClick={() => downloadCSV(mocksToRows(mocks), `road2iim-mocks-${todayStr()}.csv`)}
        >
          Mock tests ({mocks.length})
        </button>
      </div>
    </div>
  );
}
