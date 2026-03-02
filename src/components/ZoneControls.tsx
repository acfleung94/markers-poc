interface Props {
  closeZone: () => void;
  clearZone: () => void;
  undoLast: () => void;
  isClosed: boolean;
  markerCount: number;
}

function statusMessage(markerCount: number, isClosed: boolean): string {
  if (isClosed) return 'Zone created! Click an edge to add a point, or drag points to reshape';
  if (markerCount === 0) return 'Click the map to place your first point';
  if (markerCount < 3) return 'Add at least 3 points to create a zone';
  return 'Click the first point or press Close Zone to finish';
}

export function ZoneControls({ closeZone, clearZone, undoLast, isClosed, markerCount }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      background: 'white',
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 220,
      zIndex: 1,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
        {statusMessage(markerCount, isClosed)}
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={closeZone}
          disabled={isClosed || markerCount < 3}
          style={buttonStyle}
        >
          Close Zone
        </button>
        <button
          onClick={undoLast}
          disabled={markerCount === 0}
          style={buttonStyle}
        >
          Undo
        </button>
        <button
          onClick={clearZone}
          disabled={markerCount === 0}
          style={buttonStyle}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#f9fafb',
  cursor: 'pointer',
  flex: 1,
};
