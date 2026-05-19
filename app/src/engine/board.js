export const BOARD_SIZE = 10;

export const CellState = {
  WATER: 'water',
  SHIP:  'ship',
  HIT:   'hit',
  MISS:  'miss'
};

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => CellState.WATER)
  );
}

export function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function getShipCells(x, y, size, orientation, shape = null) {
  // If a custom shape is provided (array of [rx, ry] offsets), compute cells
  if (shape && Array.isArray(shape)) {
    // rotation: support orientation as 'horizontal'|'vertical' or numeric degrees (0,90,180,270)
    let coords = shape.map(s => [s[0], s[1]]);
    const angle = typeof orientation === 'number' ? orientation : (orientation === 'vertical' ? 90 : 0);
    const normCoords = coords.map(([sx, sy]) => {
      switch ((angle % 360 + 360) % 360) {
        case 0: return [sx, sy];
        case 90: return [sy, -sx];
        case 180: return [-sx, -sy];
        case 270: return [-sy, sx];
        default: return [sx, sy];
      }
    });
    coords = normCoords;
    // normalize to have min offsets starting at 0
    const minR = Math.min(...coords.map(c => c[0]));
    const minC = Math.min(...coords.map(c => c[1]));
    const norm = coords.map(([sr, sc]) => [sr - minR, sc - minC]);
    return norm.map(([sr, sc]) => [x + sr, y + sc]);
  }

  const cells = [];
  for (let i = 0; i < size; i++) {
    const horiz = (typeof orientation === 'number') ? (orientation % 180 === 0) : (orientation === 'horizontal');
    const cx = horiz ? x : x + i;
    const cy = horiz ? y + i : y;
    cells.push([cx, cy]);
  }
  return cells;
}

export function canPlace(board, x, y, size, orientation, shape = null) {
  const cells = getShipCells(x, y, size, orientation, shape);
  for (const [cx, cy] of cells) {
    if (!inBounds(cx, cy)) return false;
    if (board[cx][cy] !== CellState.WATER) return false;
  }
  return true;
}

export function placeShip(board, ship, x, y, orientation) {
  const cells = getShipCells(x, y, ship.size, orientation, ship.shape || null);
  if (!cells.every(([cx, cy]) => inBounds(cx, cy) && board[cx][cy] === CellState.WATER)) {
    return false;
  }
  for (const [cx, cy] of cells) board[cx][cy] = CellState.SHIP;
  ship.cells = cells;
  ship.orientation = orientation;
  return true;
}

export function randomPlacement(fleet) {
  const board = createBoard();
  const orientations = ['horizontal', 'vertical'];
  for (const ship of fleet) {
    let placed = false, attempts = 0;
    while (!placed && attempts < 500) {
      const ori = orientations[Math.floor(Math.random() * 2)];
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      if (canPlace(board, x, y, ship.size, ori, ship.shape || null)) {
        placeShip(board, ship, x, y, ori);
        placed = true;
      }
      attempts++;
    }
  }
  return board;
}

/**
 * Apply a shot to a board.
 * Returns { result: 'hit'|'miss'|'invalid', sunkShip?: ship }
 */
export function applyShot(board, fleet, x, y) {
  if (!inBounds(x, y)) return { result: 'invalid' };
  const cur = board[x][y];
  if (cur === CellState.HIT || cur === CellState.MISS) {
    return { result: 'invalid' };
  }
  if (cur === CellState.SHIP) {
    board[x][y] = CellState.HIT;
    const ship = fleet.find(s => s.cells.some(([cx, cy]) => cx === x && cy === y));
    if (ship) {
      ship.hits += 1;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        return { result: 'hit', sunkShip: ship };
      }
    }
    return { result: 'hit' };
  }
  board[x][y] = CellState.MISS;
  return { result: 'miss' };
}

export function allShipsSunk(fleet) {
  return fleet.every(s => s.sunk);
}
