import { create } from 'zustand';
import { createBoard, applyShot, randomPlacement, allShipsSunk, canPlace, placeShip, CellState } from '../engine/board.js';
import { getInitialFleet } from '../engine/ships.js';
import { createAIState, aiChooseShot, aiOnResult, cheaterChooseAbility, DIFFICULTIES } from '../engine/ai.js';
import { computeReward, INITIAL_CREDITS } from '../engine/economy.js';
import { WEATHERS, TURNS_PER_CHANGE, rollWeather, maybeApplyFog } from '../engine/weather.js';
import { ABILITIES, radarCells, airstrikeCells, torpedoCells } from '../engine/abilities.js';
import { loadProgression, saveCoins, saveAchievement, unlockSkin, unlockMinigame, checkAchievements, ACHIEVEMENTS } from '../engine/progression.js';

const SCREENS = { MENU: 'menu', SETUP: 'setup', BATTLE: 'battle', END: 'end' };
export { SCREENS };

const initialBattleStats = () => ({
  sinksInRow: 0,
  totalHitsStreak: 0,
  usedAbilities: false,
  turnCount: 0
});

const getFirstUnplacedShipUid = (fleet) => fleet.find(ship => ship.cells.length === 0)?.uid ?? null;

const initialState = () => {
  const prog = loadProgression();
  const initialFleet = getInitialFleet();
  return {
    screen: SCREENS.MENU,
    mode: 'classic',
    difficulty: 'admiral',
    muted: localStorage.getItem('bn-muted') === '1',
    activeSkin: 'navy',

    // Boards & fleets
    playerBoard: createBoard(),
    enemyBoard: createBoard(),
    playerFleet: initialFleet,
    enemyFleet: getInitialFleet(),

    // Setup
    selectedShipUid: getFirstUnplacedShipUid(initialFleet),
    orientation: 'horizontal',

    // Battle
    turn: 'player',
    ai: createAIState('admiral'),
    events: [],
    shotAnims: [],

    // Advanced
    credits: INITIAL_CREDITS,
    weatherId: 'calm',
    turnCount: 0,
    shieldActive: false,
    activeAbility: null,
    radarReveals: [],
    winner: null,

    // Visual FX triggers
    zoomTarget: null,
    newAchievements: [],
    showConfetti: false,

    // Progression (persisted)
    coins: prog.coins,
    skins: prog.skins,
    minigames: prog.minigames,
    unlockedAchievements: prog.unlockedAchievements,

    // In-battle stats for achievement tracking
    battleStats: initialBattleStats(),

    // ── 2-player local mode ──────────────────────────────
    isLocal2P: false,
    setupPhase: null,        // 'p1' | 'handoff' | 'p2'
    p1SetupBoard: null,
    p1SetupFleet: null,
    handoffPending: false,
    local2pAttacker: 'p1',   // 'p1' | 'p2'
  };
};

let eventIdCounter = 0;
const newId = () => `ev-${++eventIdCounter}`;

export const useGameStore = create((set, get) => ({
  ...initialState(),

  // ============ NAVIGATION ============
  goToMenu: () => set(initialState()),

  startMode: (mode) => {
    const current = get();
    const state = initialState();
    state.screen = SCREENS.SETUP;
    state.difficulty = current.difficulty;
    state.activeSkin = current.activeSkin;
    state.coins = current.coins;
    state.skins = current.skins;
    state.minigames = current.minigames;
    state.unlockedAchievements = current.unlockedAchievements;

    if (mode === 'local2p') {
      state.mode = 'classic';
      state.isLocal2P = true;
      state.setupPhase = 'p1';
      state.handoffPending = false;
      state.local2pAttacker = 'p1';
    } else {
      state.mode = mode;
    }

    // If entering tetris mode, create fleets using tetris shapes
    if (state.mode === 'tetris') {
      state.playerFleet = getInitialFleet('tetris');
      state.enemyFleet = getInitialFleet('tetris');
      state.playerBoard = createBoard();
      state.enemyBoard = createBoard();
      state.selectedShipUid = getFirstUnplacedShipUid(state.playerFleet);
      state.orientation = 0;
    }

    set(state);
  },

  setDifficulty: (d) => set({ difficulty: d }),

  startBattle: () => {
    const s = get();

    if (s.isLocal2P) {
      set({
        screen: SCREENS.BATTLE,
        playerBoard: s.p1SetupBoard,
        playerFleet: s.p1SetupFleet,
        enemyBoard: s.playerBoard,
        enemyFleet: s.playerFleet,
        turn: 'player',
        local2pAttacker: 'p1',
        setupPhase: null,
        p1SetupBoard: null,
        p1SetupFleet: null,
        handoffPending: false,
        battleStats: initialBattleStats(),
      });
      setTimeout(() => get().pushEvent('Flotas desplegadas. Jugador 1 inicia el ataque.', 'radio'), 200);
      return;
    }

    const { enemyFleet, difficulty } = s;
    const enemyBoard = randomPlacement(enemyFleet);
    set({
      screen: SCREENS.BATTLE,
      enemyBoard,
      turn: 'player',
      ai: createAIState(difficulty),
      battleStats: initialBattleStats(),
    });
    setTimeout(() => get().pushEvent('Flota desplegada. Esperando órdenes de ataque.', 'radio'), 200);
  },

  toggleMute: () => set(s => {
    const muted = !s.muted;
    localStorage.setItem('bn-muted', muted ? '1' : '0');
    return { muted };
  }),

  setActiveSkin: (id) => set({ activeSkin: id }),

  // ============ 2P SETUP FLOW ============
  finishSetupP1: () => {
    const s = get();
    const freshFleet = getInitialFleet(s.mode);
    set({
      p1SetupBoard: s.playerBoard.map(r => [...r]),
      p1SetupFleet: s.playerFleet.map(sh => ({ ...sh, cells: [...sh.cells] })),
      playerBoard: createBoard(),
      playerFleet: freshFleet,
      selectedShipUid: getFirstUnplacedShipUid(freshFleet),
      setupPhase: 'handoff',
      handoffPending: true,
    });
  },

  confirmHandoff: () => {
    const s = get();

    if (s.setupPhase === 'handoff') {
      // P2's turn to place ships
      set({ handoffPending: false, setupPhase: 'p2' });
      return;
    }

    // Battle handoff: swap boards so the new attacker sees their own fleet
    set({
      playerBoard: s.enemyBoard,
      playerFleet: s.enemyFleet,
      enemyBoard: s.playerBoard,
      enemyFleet: s.playerFleet,
      local2pAttacker: s.local2pAttacker === 'p1' ? 'p2' : 'p1',
      handoffPending: false,
      turn: 'player',
    });
  },

  // ============ SETUP ============
  selectShip: (uid) => set({ selectedShipUid: uid }),
  setOrientation: (o) => set({ orientation: o }),
  rotateOrientation: () => set(s => {
    if (s.mode === 'tetris') {
      const cur = typeof s.orientation === 'number' ? s.orientation : 0;
      return { orientation: (cur + 90) % 360 };
    }
    return { orientation: s.orientation === 'horizontal' ? 'vertical' : 'horizontal' };
  }),

  tryPlaceSelected: (x, y) => {
    const { selectedShipUid, playerFleet, playerBoard, orientation } = get();
    if (!selectedShipUid) return false;
    const ship = playerFleet.find(s => s.uid === selectedShipUid);
    if (!ship || ship.cells.length > 0) return false;
    const board = playerBoard.map(r => [...r]);
    if (!canPlace(board, x, y, ship.size, orientation, ship.shape || null)) return false;
    placeShip(board, ship, x, y, orientation);
    const nextSelectedShipUid = getFirstUnplacedShipUid(playerFleet);
    set({ playerBoard: board, selectedShipUid: nextSelectedShipUid });
    return true;
  },

  clearPlacements: () => {
    const s = get();
    const freshFleet = getInitialFleet(s.mode);
    set({ playerBoard: createBoard(), playerFleet: freshFleet, selectedShipUid: getFirstUnplacedShipUid(freshFleet) });
  },

  randomizePlayer: () => {
    const s = get();
    const fleet = getInitialFleet(s.mode);
    const board = randomPlacement(fleet);
    set({ playerBoard: board, playerFleet: fleet, selectedShipUid: getFirstUnplacedShipUid(fleet) });
  },

  allPlaced: () => get().playerFleet.every(s => s.cells.length > 0),

  // ============ ANIMS ============
  pushAnim: (anim) => set(s => ({ shotAnims: [...s.shotAnims, { ...anim, id: newId() }] })),
  consumeAnim: (id) => set(s => ({ shotAnims: s.shotAnims.filter(a => a.id !== id) })),
  pushEvent: (msg, category = 'shot') => set(s => ({
    events: [{ id: newId(), msg, ts: Date.now(), category }, ...s.events].slice(0, 14)
  })),
  clearZoomTarget: () => set({ zoomTarget: null }),
  clearConfetti: () => set({ showConfetti: false }),
  clearNewAchievements: () => set({ newAchievements: [] }),

  // ============ PLAYER SHOT ============
  playerShoot: (x, y) => {
    const s = get();
    if (s.turn !== 'player' || s.winner) return null;
    if (s.enemyBoard[x][y] === CellState.HIT || s.enemyBoard[x][y] === CellState.MISS) return null;

    const board = s.enemyBoard.map(r => [...r]);
    const fleet = s.enemyFleet.map(f => ({ ...f, cells: [...f.cells] }));
    let { result, sunkShip } = applyShot(board, fleet, x, y);

    if (s.mode === 'advanced') {
      const adj = maybeApplyFog(result, s.weatherId);
      if (adj !== result && result === 'hit') {
        board[x][y] = CellState.MISS;
        if (sunkShip) sunkShip.hits--;
        sunkShip = null;
        result = 'miss';
      }
    }

    const zoomTarget = result === 'hit' ? { side: 'enemy', x, y } : null;
    const update = { enemyBoard: board, enemyFleet: fleet, zoomTarget };
    const bs = { ...s.battleStats };

    if (result === 'hit') {
      bs.totalHitsStreak++;
      if (sunkShip) bs.sinksInRow++;
      if (s.mode === 'advanced') {
        const mult = WEATHERS[s.weatherId].creditMult;
        update.credits = s.credits + computeReward(result, sunkShip, mult);
      }
    } else {
      bs.totalHitsStreak = 0;
      bs.sinksInRow = 0;
    }

    if (allShipsSunk(fleet)) {
      update.winner = 'player';
      update.screen = SCREENS.END;
      update.showConfetti = true;
      bs.turnCount = s.turnCount;
      update.battleStats = bs;
      get()._handleVictory('player', bs);
    } else {
      update.battleStats = bs;
    }

    set(update);
    get().pushAnim({ side: 'enemy', x, y, type: result, sunk: !!sunkShip });

    if (result === 'hit') {
      if (sunkShip) {
        get().pushEvent(`¡Hundiste el ${sunkShip.name}!`);
        get().pushEvent('¡Barco enemigo hundido! Zona despejada.', 'radio');
      } else {
        get().pushEvent('Impacto confirmado.');
        if (s.battleStats.totalHitsStreak === 0) {
          get().pushEvent('¡Tenemos contacto con objetivo! Ajusten puntería.', 'radio');
        }
      }
    } else {
      get().pushEvent('Disparo al agua.');
    }

    if (update.winner) {
      get().pushEvent('Enemigo neutralizado. El océano es nuestro.', 'radio');
    } else if (result === 'miss') {
      setTimeout(() => get().endPlayerTurn(), 700);
    }
    return { result, sunkShip };
  },

  endPlayerTurn: () => {
    const s = get();
    if (s.winner) return;

    if (s.isLocal2P) {
      // Show handoff overlay instead of running AI
      set({ handoffPending: true });
      return;
    }

    set({ turn: 'enemy' });
    setTimeout(() => get().enemyTurn(), 900);
  },

  // ============ ENEMY TURN ============
  enemyTurn: () => {
    const s = get();
    if (s.winner) return;

    if (s.mode === 'advanced' && s.difficulty === 'cheater') {
      const abilityId = cheaterChooseAbility(s.turnCount, s.credits, s.enemyFleet.filter(f => !f.sunk).length);
      if (abilityId) {
        const rndX = Math.floor(Math.random() * 10);
        const rndY = Math.floor(Math.random() * 10);
        get()._enemyUseAbility(abilityId, rndX, rndY);
        return;
      }
    }

    const remainingSizes = s.enemyFleet.filter(f => !f.sunk).map(f => f.size);
    const [x, y] = aiChooseShot(s.playerBoard, s.ai, remainingSizes);

    if (s.mode === 'advanced' && s.shieldActive && s.playerBoard[x][y] === CellState.SHIP) {
      const board = s.playerBoard.map(r => [...r]);
      board[x][y] = CellState.MISS;
      set({ playerBoard: board, shieldActive: false });
      get().pushAnim({ side: 'player', x, y, type: 'shield' });
      get().pushEvent('¡Escudo absorbió el impacto!');
      aiOnResult(s.ai, x, y, 'miss', false);
      setTimeout(() => get().endEnemyTurn('miss'), 700);
      return;
    }

    const board = s.playerBoard.map(r => [...r]);
    const fleet = s.playerFleet.map(f => ({ ...f, cells: [...f.cells] }));
    const { result, sunkShip } = applyShot(board, fleet, x, y);
    aiOnResult(s.ai, x, y, result, !!sunkShip);

    const update = { playerBoard: board, playerFleet: fleet };
    if (allShipsSunk(fleet)) {
      update.winner = 'enemy';
      update.screen = SCREENS.END;
    }
    set(update);
    get().pushAnim({ side: 'player', x, y, type: result, sunk: !!sunkShip });

    if (result === 'hit') {
      if (sunkShip) {
        get().pushEvent(`Hundieron tu ${sunkShip.name}.`, 'alert');
        get().pushEvent('¡Daños críticos! Solicitamos refuerzos.', 'alert');
      } else {
        get().pushEvent('Impacto recibido en nuestra flota.', 'alert');
      }
    } else {
      get().pushEvent('Disparo enemigo al agua.');
    }

    if (!update.winner) setTimeout(() => get().endEnemyTurn(result), 800);
  },

  endEnemyTurn: (lastResult) => {
    const s = get();
    if (s.winner) return;
    if (lastResult === 'hit') { setTimeout(() => get().enemyTurn(), 700); return; }
    const update = { turn: 'player', turnCount: s.turnCount + 1 };
    if (s.mode === 'advanced' && (s.turnCount + 1) % TURNS_PER_CHANGE === 0) {
      const next = rollWeather(s.weatherId);
      update.weatherId = next;
      get().pushEvent(`Clima cambia: ${WEATHERS[next].name}.`, 'system');
    }
    set(update);
  },

  _enemyUseAbility: (id, x, y) => {
    const s = get();
    let board = s.playerBoard.map(r => [...r]);
    let fleet = s.playerFleet.map(f => ({ ...f, cells: [...f.cells] }));
    let cells = [];
    if (id === 'torpedo') cells = torpedoCells(x, y);
    else if (id === 'airstrike') cells = airstrikeCells(x, y, Math.random() < 0.5 ? 'horizontal' : 'vertical');

    for (const [cx, cy] of cells) {
      if (board[cx][cy] === CellState.HIT || board[cx][cy] === CellState.MISS) continue;
      const { result, sunkShip } = applyShot(board, fleet, cx, cy);
      get().pushAnim({ side: 'player', x: cx, y: cy, type: result, sunk: !!sunkShip });
    }
    const update = { playerBoard: board, playerFleet: fleet };
    if (allShipsSunk(fleet)) { update.winner = 'enemy'; update.screen = SCREENS.END; }
    set(update);
    get().pushEvent(`El tramposo usó ${ABILITIES[id]?.name}!`);
    if (!update.winner) setTimeout(() => get().endEnemyTurn('miss'), 1200);
  },

  // ============ PLAYER ABILITIES ============
  selectAbility: (id) => {
    const s = get();
    if (s.mode !== 'advanced' || s.turn !== 'player' || s.winner) return;
    const ab = ABILITIES[id];
    if (!ab || s.credits < ab.cost) return;
    set({ activeAbility: s.activeAbility === id ? null : id });
  },

  useAbilityAt: (x, y, dir = 'horizontal') => {
    const s = get();
    if (!s.activeAbility || s.turn !== 'player' || s.winner) return;
    const ab = ABILITIES[s.activeAbility];
    if (s.credits < ab.cost) return;

    if (ab.id === 'shield') {
      set({ credits: s.credits - ab.cost, shieldActive: true, activeAbility: null, battleStats: { ...s.battleStats, usedAbilities: true } });
      get().pushEvent('Escudo activado.');
      return;
    }
    if (ab.id === 'radar') {
      const cells = radarCells(x, y);
      const expiresAt = Date.now() + 3000;
      set({
        credits: s.credits - ab.cost,
        activeAbility: null,
        radarReveals: [...s.radarReveals, { cells, expiresAt }],
        battleStats: { ...s.battleStats, usedAbilities: true }
      });
      get().pushEvent('Radar barriendo zona.');
      setTimeout(() => set(st => ({ radarReveals: st.radarReveals.filter(r => r.expiresAt > Date.now()) })), 3100);
      return;
    }

    const cells = ab.id === 'airstrike' ? airstrikeCells(x, y, dir) : torpedoCells(x, y);
    set({ credits: s.credits - ab.cost, activeAbility: null, battleStats: { ...s.battleStats, usedAbilities: true } });
    get().pushEvent(`${ab.name} lanzado.`);

    let board = s.enemyBoard.map(r => [...r]);
    let fleet = s.enemyFleet.map(f => ({ ...f, cells: [...f.cells] }));
    let earned = 0;

    for (const [cx, cy] of cells) {
      if (board[cx][cy] === CellState.HIT || board[cx][cy] === CellState.MISS) continue;
      const { result, sunkShip } = applyShot(board, fleet, cx, cy);
      const mult = WEATHERS[s.weatherId].creditMult;
      if (result === 'hit') earned += computeReward(result, sunkShip, mult);
      get().pushAnim({ side: 'enemy', x: cx, y: cy, type: result, sunk: !!sunkShip });
    }

    const update = { enemyBoard: board, enemyFleet: fleet, credits: get().credits + earned };
    if (allShipsSunk(fleet)) {
      update.winner = 'player';
      update.screen = SCREENS.END;
      update.showConfetti = true;
      get()._handleVictory('player', s.battleStats);
    }
    set(update);
    if (!update.winner) setTimeout(() => get().endPlayerTurn(), 1200);
  },

  cancelAbility: () => set({ activeAbility: null }),

  // ============ PROGRESSION ============
  _handleVictory: (winner, bs) => {
    const s = get();
    if (winner !== 'player') return;

    const coinReward = s.mode === 'advanced'
      ? (s.difficulty === 'cheater' ? 200 : s.difficulty === 'admiral' ? 120 : 60)
      : 40;
    const newCoins = s.coins + coinReward;
    saveCoins(newCoins);

    const newAchievIds = checkAchievements({
      sinksInRow: bs.sinksInRow,
      totalHitsStreak: bs.totalHitsStreak,
      usedAbilities: bs.usedAbilities,
      winner: 'player',
      difficulty: s.difficulty,
      turnCount: bs.turnCount
    }, s.unlockedAchievements);

    let rewardFromAchievs = 0;
    for (const id of newAchievIds) {
      saveAchievement(id);
      const def = ACHIEVEMENTS.find(a => a.id === id);
      if (def) rewardFromAchievs += def.reward;
    }
    const totalCoins = newCoins + rewardFromAchievs;
    if (rewardFromAchievs > 0) saveCoins(totalCoins);

    set({
      coins: totalCoins,
      unlockedAchievements: [...s.unlockedAchievements, ...newAchievIds],
      newAchievements: newAchievIds
    });
  },

  buySkin: (id) => {
    const s = get();
    const skin = s.skins.find(sk => sk.id === id);
    if (!skin || skin.unlocked || s.coins < skin.price) return false;
    const newCoins = s.coins - skin.price;
    saveCoins(newCoins);
    unlockSkin(id);
    set({
      coins: newCoins,
      skins: s.skins.map(sk => sk.id === id ? { ...sk, unlocked: true } : sk)
    });
    return true;
  },

  buyMinigame: (id) => {
    const s = get();
    const minigame = s.minigames?.find(mg => mg.id === id);
    if (!minigame || minigame.unlocked || s.coins < minigame.price) return false;
    const newCoins = s.coins - minigame.price;
    saveCoins(newCoins);
    unlockMinigame(id);
    set({
      coins: newCoins,
      minigames: s.minigames.map(mg => mg.id === id ? { ...mg, unlocked: true } : mg)
    });
    return true;
  }

  ,setCoins: (amount, showToast = true) => {
    const val = Math.max(0, Math.floor(Number(amount) || 0));
    saveCoins(val);
    set({ coins: val });
    if (showToast) {
      // small system event so the UI shows feedback
      get().pushEvent(`Monedas establecidas: ${val}`, 'system');
    }
  }
}));
