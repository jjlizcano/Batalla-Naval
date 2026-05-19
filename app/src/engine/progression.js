// ──────────────────────────────────────────────────────────────
// Persistence keys
// ──────────────────────────────────────────────────────────────
const K = {
  COINS:     'bn-coins',
  SKINS:     'bn-skins',
  MINIGAMES: 'bn-minigames',
  ACHIEVS:   'bn-achievements',
  STATS:     'bn-stats'
};

// ──────────────────────────────────────────────────────────────
// Achievements catalogue
// ──────────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_blood',   name: 'Primera Sangre',  desc: 'Hunde tu primer barco.',          reward: 30,  icon: '⚔' },
  { id: 'triple_sink',   name: 'Triple Hundimiento', desc: 'Hunde 3 barcos seguidos.',     reward: 60,  icon: '💀' },
  { id: 'pure_victory',  name: 'Victoria Pura',   desc: 'Gana sin usar habilidades.',      reward: 100, icon: '✦' },
  { id: 'sharpshooter',  name: 'Francotirador',   desc: '10 impactos seguidos sin fallar.',reward: 80,  icon: '🎯' },
  { id: 'first_win',     name: 'Primer Triunfo',  desc: 'Gana tu primera partida.',         reward: 50,  icon: '★' },
  { id: 'admiral_win',   name: 'Vence al Almirante', desc: 'Gana al nivel Almirante.',     reward: 120, icon: '⚓' },
  { id: 'cheater_win',   name: 'Vence al Tramposo',  desc: 'Gana al nivel Tramposo.',      reward: 200, icon: '🏆' },
  { id: 'speed_demon',   name: 'Velocidad Pura',  desc: 'Gana en menos de 20 turnos.',     reward: 150, icon: '⚡' }
];

// ──────────────────────────────────────────────────────────────
// Ship skins catalogue
// ──────────────────────────────────────────────────────────────
export const SHIP_SKINS = [
  { id: 'navy',    name: 'Marina',      price: 0,   unlocked: true,  colors: { base: '#475a6b', accent: '#c9a96e' } },
  { id: 'pirate',  name: 'Pirata',      price: 150, unlocked: false, colors: { base: '#1a0f08', accent: '#d4a017' } },
  { id: 'space',   name: 'Nave Espacial', price: 250, unlocked: false, colors: { base: '#1a0a2e', accent: '#00e5ff' } },
  { id: 'paper',   name: 'Barco de Papel', price: 100, unlocked: false, colors: { base: '#e8d9b0', accent: '#8b6914' } },
  { id: 'stealth', name: 'Sigilo',       price: 350, unlocked: false, colors: { base: '#0d0d0d', accent: '#444' } }
];

export const MINIGAMES = [
  {
    id: 'tetris',
    name: 'Tetris',
    desc: 'Modo Tetris: las naves usan piezas Tetris y el disparo desciende hasta confirmación.',
    price: 420,
    unlocked: false,
    accent: '#9cff7a'
  }
];

// ──────────────────────────────────────────────────────────────
// Load / save helpers
// ──────────────────────────────────────────────────────────────
export function loadProgression() {
  const coins     = parseInt(localStorage.getItem(K.COINS) || '0', 10);
  const skinIds   = JSON.parse(localStorage.getItem(K.SKINS)  || '["navy"]');
  const minigameIds= JSON.parse(localStorage.getItem(K.MINIGAMES) || '[]');
  const achievIds = JSON.parse(localStorage.getItem(K.ACHIEVS) || '[]');
  const stats     = JSON.parse(localStorage.getItem(K.STATS)   || '{}');
  const skins = SHIP_SKINS.map(s => ({ ...s, unlocked: s.unlocked || skinIds.includes(s.id) }));
  const minigames = MINIGAMES.map(m => ({ ...m, unlocked: m.unlocked || minigameIds.includes(m.id) }));
  return { coins, skins, minigames, unlockedAchievements: achievIds, stats };
}

export function saveCoins(coins) {
  localStorage.setItem(K.COINS, String(coins));
}

export function saveAchievement(id) {
  const prev = JSON.parse(localStorage.getItem(K.ACHIEVS) || '[]');
  if (!prev.includes(id)) {
    prev.push(id);
    localStorage.setItem(K.ACHIEVS, JSON.stringify(prev));
  }
}

export function unlockSkin(id) {
  const prev = JSON.parse(localStorage.getItem(K.SKINS) || '["navy"]');
  if (!prev.includes(id)) {
    prev.push(id);
    localStorage.setItem(K.SKINS, JSON.stringify(prev));
  }
}

export function unlockMinigame(id) {
  const prev = JSON.parse(localStorage.getItem(K.MINIGAMES) || '[]');
  if (!prev.includes(id)) {
    prev.push(id);
    localStorage.setItem(K.MINIGAMES, JSON.stringify(prev));
  }
}

export function saveStats(stats) {
  localStorage.setItem(K.STATS, JSON.stringify(stats));
}

// ──────────────────────────────────────────────────────────────
// Achievement checker (call after each game action)
// ──────────────────────────────────────────────────────────────
export function checkAchievements({ sinksInRow, totalHitsStreak, usedAbilities, winner, difficulty, turnCount }, alreadyUnlocked) {
  const newOnes = [];
  const unlock = (id) => {
    if (!alreadyUnlocked.includes(id)) {
      newOnes.push(id);
    }
  };
  if (sinksInRow >= 1) unlock('first_blood');
  if (sinksInRow >= 3) unlock('triple_sink');
  if (winner === 'player' && !usedAbilities) unlock('pure_victory');
  if (winner === 'player') unlock('first_win');
  if (winner === 'player' && difficulty === 'admiral') unlock('admiral_win');
  if (winner === 'player' && difficulty === 'cheater') { unlock('admiral_win'); unlock('cheater_win'); }
  if (winner === 'player' && turnCount < 20) unlock('speed_demon');
  if (totalHitsStreak >= 10) unlock('sharpshooter');
  return newOnes;
}
