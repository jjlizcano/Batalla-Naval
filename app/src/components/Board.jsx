import { useState, useMemo } from 'react';
import Cell from './Cell.jsx';
import ShipLayer from './ShipLayer.jsx';
import { BOARD_SIZE, getShipCells, canPlace } from '../engine/board.js';

const LABEL_COLS = 'ABCDEFGHIJ'.split('');

export default function Board({
  board, isOwn = false, onCellClick, fleet,
  placementPreview = null,
  abilityPreview = null,
  radarReveals = [],
  shaking = false,
  className = '',
  overlay = null
}) {
  const [hover, setHover] = useState(null);

  const previewCells = useMemo(() => {
    if (!placementPreview || !hover) return null;
    const { size, orientation, shape } = placementPreview;
    const cells = getShipCells(hover.x, hover.y, size, orientation, shape || null);
    const valid = canPlace(board, hover.x, hover.y, size, orientation, shape || null);
    return { cells, valid };
  }, [placementPreview, hover, board]);

  const isRevealed = (x, y) => radarReveals.some(r => r.cells.some(([rx, ry]) => rx === x && ry === y));

  const previewMap = new Map();
  if (previewCells) {
    for (const [cx, cy] of previewCells.cells) {
      previewMap.set(`${cx},${cy}`, previewCells.valid ? 'valid' : 'invalid');
    }
  }
  if (abilityPreview) {
    for (const [cx, cy] of abilityPreview.cells) {
      previewMap.set(`${cx},${cy}`, 'valid');
    }
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}
    >
      {/* Column labels */}
      <div className="flex" style={{ paddingLeft: '28px' }}>
        {LABEL_COLS.map(l => (
          <div key={l} className="flex-1 text-center text-xs opacity-60 select-none">{l}</div>
        ))}
      </div>

      <div className={`flex ${shaking ? 'animate-shake' : ''}`} style={{ width: '100%' }}>
        {/* Row labels */}
        <div className="flex flex-col" style={{ width: '28px' }}>
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div key={i} className="flex-1 flex items-center justify-center text-xs opacity-60 select-none">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Grid + ship layer */}
        <div
          className="relative grid panel"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            gap: '2px',
            padding: '4px',
            aspectRatio: '1 / 1',
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          {board.map((row, x) =>
            row.map((val, y) => (
              <Cell
                key={`${x}-${y}`}
                x={x}
                y={y}
                value={val}
                isOwn={isOwn}
                preview={previewMap.get(`${x},${y}`)}
                revealedByRadar={!isOwn && isRevealed(x, y)}
                onClick={onCellClick}
                onHover={(x, y) => setHover({ x, y })}
                onLeave={() => setHover(null)}
                disabled={!onCellClick}
              />
            ))
          )}

          {/* Ship silhouette overlay */}
          <ShipLayer fleet={fleet} isOwn={isOwn} />

          {overlay}
        </div>
      </div>
    </div>
  );
}
