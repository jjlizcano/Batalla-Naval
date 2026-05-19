// Absolute grid overlay inside Board's grid div.
// Renders ShipSVG silhouettes spanning their occupied cells.
// On own board: shows all placed ships.
// On enemy board: shows only sunk ships (revealed after sinking).

import ShipSVG from './ShipSVG.jsx';

export default function ShipLayer({ fleet, isOwn }) {
  if (!fleet) return null;
  const ships = fleet.filter(s => s.cells?.length > 0 && (isOwn || s.sunk));
  if (ships.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gridTemplateRows: 'repeat(10, 1fr)',
        gap: '2px',
        padding: '4px',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {ships.map(ship => {
        const cells = ship.cells;
        const xs = cells.map(([x]) => x);
        const ys = cells.map(([, y]) => y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const vertical = ship.orientation === 'vertical' || ship.orientation === 90 || ship.orientation === 270;

        if (ship.typeId === 'tetris') {
          const base = ship.colors?.base ?? '#7dd3fc';
          const accent = ship.colors?.accent ?? '#e0f2fe';
          return (
            <div
              key={ship.uid}
              style={{
                gridRow: `${minX + 1} / ${maxX + 2}`,
                gridColumn: `${minY + 1} / ${maxY + 2}`,
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: `repeat(${maxY - minY + 1}, 1fr)`,
                gridTemplateRows: `repeat(${maxX - minX + 1}, 1fr)`,
                gap: '2px',
                padding: '1px',
              }}
            >
              {cells.map(([x, y]) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    gridColumn: `${y - minY + 1}`,
                    gridRow: `${x - minX + 1}`,
                    borderRadius: '4px',
                    background: `linear-gradient(135deg, ${base}, ${accent})`,
                    boxShadow: 'inset 0 0 8px rgba(255,255,255,0.18), 0 0 8px rgba(0,0,0,0.18)',
                    border: '1px solid rgba(255,255,255,0.18)'
                  }}
                />
              ))}
            </div>
          );
        }

        return (
          <div
            key={ship.uid}
            style={{
              gridRow: `${minX + 1} / ${maxX + 2}`,
              gridColumn: `${minY + 1} / ${maxY + 2}`,
              position: 'relative',
            }}
          >
            <ShipSVG typeId={ship.typeId} vertical={vertical} sunk={ship.sunk} />
          </div>
        );
      })}
    </div>
  );
}
