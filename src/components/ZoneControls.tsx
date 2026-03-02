import type { Zone } from '../types/zone';

interface Props {
  closeZone: () => void;
  clearAll: () => void;
  activeZone: Zone | null;
  completedZoneCount: number;
}

function statusMessage(activeZone: Zone | null, completedZoneCount: number): string {
  if (!activeZone) {
    if (completedZoneCount === 0) return 'Click the map to place your first point';
    return `${completedZoneCount} zone${completedZoneCount > 1 ? 's' : ''} saved — click the map to draw a new one`;
  }
  if (activeZone.isClosed) {
    return 'Editing zone — click anywhere to insert points, or press Close Zone to finish';
  }
  const count = activeZone.markers.length;
  if (count <= 1) return 'Keep clicking to add more points';
  if (count === 2) return 'Add 1 more point to close the zone';
  return 'Click the first point or press Close Zone to finish';
}

export function ZoneControls({ closeZone, clearAll, activeZone, completedZoneCount }: Props) {
  const hasAnything = completedZoneCount > 0 || activeZone !== null;

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
        {statusMessage(activeZone, completedZoneCount)}
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={closeZone}
          disabled={!activeZone || activeZone.markers.length < 3}
          style={buttonStyle}
        >
          Close Zone
        </button>
<button
          onClick={clearAll}
          disabled={!hasAnything}
          style={buttonStyle}
        >
          Clear All
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
