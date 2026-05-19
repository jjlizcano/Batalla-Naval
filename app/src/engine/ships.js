export const SHIP_TYPES = [
  { id: 'carrier',    name: 'Portaviones', size: 5, count: 1 },
  { id: 'battleship', name: 'Acorazado',   size: 4, count: 1 },
  { id: 'submarine',  name: 'Submarino',   size: 3, count: 1 },
  { id: 'destroyer',  name: 'Destructor',  size: 2, count: 2 }
];

// Tetris piece definitions (relative offsets). Each piece is an array of [rowOffset, colOffset]
export const TETRIS_PIECES = {
  I: [[0,0],[1,0],[2,0],[3,0]],
  O: [[0,0],[0,1],[1,0],[1,1]],
  T: [[0,0],[0,1],[0,2],[1,1]],
  S: [[0,1],[0,2],[1,0],[1,1]],
  Z: [[0,0],[0,1],[1,1],[1,2]],
  J: [[0,0],[1,0],[2,0],[2,1]],
  L: [[0,1],[1,1],[2,1],[2,0]]
};

export const TETRIS_COLORS = {
  I: { base: '#12d7ff', accent: '#74f0ff' },
  O: { base: '#ffd93d', accent: '#fff1a6' },
  T: { base: '#b66bff', accent: '#d6b2ff' },
  S: { base: '#4ee07d', accent: '#b6f7c8' },
  Z: { base: '#ff6b6b', accent: '#ffb0b0' },
  J: { base: '#5b8cff', accent: '#b0c7ff' },
  L: { base: '#ff9a3c', accent: '#ffd1a6' }
};

export function getInitialFleet(mode = 'classic') {
  if (mode === 'tetris') {
    const pieces = Object.entries(TETRIS_PIECES);
    const fleet = [];
    let uid = 0;
    for (const [key, shape] of pieces) {
      fleet.push({
        uid: `tetris-${uid++}`,
        typeId: 'tetris',
        name: `Tetris ${key}`,
        pieceId: key,
        colors: TETRIS_COLORS[key],
        size: shape.length,
        shape,
        hits: 0,
        sunk: false,
        cells: []
      });
    }
    return fleet;
  }

  const fleet = [];
  let uid = 0;
  for (const t of SHIP_TYPES) {
    for (let i = 0; i < t.count; i++) {
      fleet.push({
        uid: `${t.id}-${uid++}`,
        typeId: t.id,
        name: t.name,
        size: t.size,
        hits: 0,
        sunk: false,
        cells: []
      });
    }
  }
  return fleet;
}

export const TOTAL_SHIP_CELLS = SHIP_TYPES.reduce(
  (acc, t) => acc + t.size * t.count,
  0
);
