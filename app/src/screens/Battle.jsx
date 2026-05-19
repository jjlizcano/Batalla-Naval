import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore.js';
import Board from '../components/Board.jsx';
import HUD from '../components/HUD.jsx';
import AbilityBar from '../components/AbilityBar.jsx';
import WeatherOverlay from '../components/WeatherOverlay.jsx';
import PassPCOverlay from '../components/PassPCOverlay.jsx';
import TacticalLog from '../components/TacticalLog.jsx';
import { Burst } from '../components/ParticleFX.jsx';
import RadarSweep from '../components/RadarSweep.jsx';
import WaterTrail from '../components/WaterTrail.jsx';
import AchievementToast from '../components/AchievementToast.jsx';
import { ABILITIES, radarCells, airstrikeCells, torpedoCells } from '../engine/abilities.js';
import { playFx } from '../hooks/useAudio.js';
import { useConfetti } from '../hooks/useConfetti.js';

export default function Battle() {
  const mode             = useGameStore(s => s.mode);
  const turn             = useGameStore(s => s.turn);
  const playerBoard      = useGameStore(s => s.playerBoard);
  const enemyBoard       = useGameStore(s => s.enemyBoard);
  const playerFleet      = useGameStore(s => s.playerFleet);
  const enemyFleet       = useGameStore(s => s.enemyFleet);
  const playerShoot      = useGameStore(s => s.playerShoot);
  const useAbilityAt     = useGameStore(s => s.useAbilityAt);
  const activeAbility    = useGameStore(s => s.activeAbility);
  const shotAnims        = useGameStore(s => s.shotAnims);
  const consumeAnim      = useGameStore(s => s.consumeAnim);
  const radarReveals     = useGameStore(s => s.radarReveals);
  const zoomTarget       = useGameStore(s => s.zoomTarget);
  const clearZoomTarget  = useGameStore(s => s.clearZoomTarget);
  const activeSkin       = useGameStore(s => s.activeSkin);
  const difficulty       = useGameStore(s => s.difficulty);
  const isLocal2P        = useGameStore(s => s.isLocal2P);
  const handoffPending   = useGameStore(s => s.handoffPending);
  const local2pAttacker  = useGameStore(s => s.local2pAttacker);
  const confirmHandoff   = useGameStore(s => s.confirmHandoff);

  useConfetti();

  const [airstrikeDir, setAirstrikeDir] = useState('horizontal');
  const [hoverEnemy, setHoverEnemy]     = useState(null);
  const [tetrisCol, setTetrisCol]       = useState(null);
  const [tetrisRow, setTetrisRow]       = useState(0);
  const [shakePlayer, setShakePlayer]   = useState(false);
  const [shakeEnemy, setShakeEnemy]     = useState(false);
  const [zoomEnemy, setZoomEnemy]       = useState(false);
  const tetrisFallRef = useRef(null);

  const playerBoardRef = useRef(null);
  const enemyBoardRef  = useRef(null);

  const abilityPreview = useMemo(() => {
    if (!activeAbility || !hoverEnemy || activeAbility === 'shield') return null;
    let cells = [];
    if (activeAbility === 'radar')          cells = radarCells(hoverEnemy.x, hoverEnemy.y);
    else if (activeAbility === 'airstrike') cells = airstrikeCells(hoverEnemy.x, hoverEnemy.y, airstrikeDir);
    else if (activeAbility === 'torpedo')   cells = torpedoCells(hoverEnemy.x, hoverEnemy.y);
    return { cells };
  }, [activeAbility, hoverEnemy, airstrikeDir]);

  useEffect(() => {
    if (shotAnims.length === 0) return;
    const a = shotAnims[shotAnims.length - 1];
    if (a.type === 'hit') {
      playFx(a.sunk ? 'sink' : 'explosion');
      if (a.side === 'player') { setShakePlayer(true); setTimeout(() => setShakePlayer(false), 450); }
      if (a.side === 'enemy')  { setShakeEnemy(true);  setTimeout(() => setShakeEnemy(false),  450); }
    } else if (a.type === 'miss') {
      playFx('splash');
    } else if (a.type === 'shield') {
      playFx('alert');
    }
  }, [shotAnims.length]);

  useEffect(() => {
    if (zoomTarget && zoomTarget.side === 'enemy') {
      setZoomEnemy(true);
      const t = setTimeout(() => { setZoomEnemy(false); clearZoomTarget(); }, 600);
      return () => clearTimeout(t);
    }
  }, [zoomTarget]);

  useEffect(() => {
    if (mode !== 'tetris' || turn !== 'player') {
      setTetrisCol(null);
      setTetrisRow(0);
      if (tetrisFallRef.current) {
        clearInterval(tetrisFallRef.current);
        tetrisFallRef.current = null;
      }
      return;
    }

    if (hoverEnemy && typeof hoverEnemy.y === 'number') {
      setTetrisCol(hoverEnemy.y);
    } else {
      setTetrisCol(null);
    }
  }, [mode, turn, hoverEnemy]);

  useEffect(() => {
    if (mode !== 'tetris' || turn !== 'player' || tetrisCol === null) {
      if (tetrisFallRef.current) {
        clearInterval(tetrisFallRef.current);
        tetrisFallRef.current = null;
      }
      return;
    }

    if (tetrisFallRef.current) clearInterval(tetrisFallRef.current);
    tetrisFallRef.current = setInterval(() => {
      setTetrisRow(r => (r >= 9 ? 0 : r + 1));
    }, 170);

    return () => {
      if (tetrisFallRef.current) {
        clearInterval(tetrisFallRef.current);
        tetrisFallRef.current = null;
      }
    };
  }, [mode, turn, tetrisCol]);

  const handleEnemyClick = (x, y) => {
    if (turn !== 'player') return;
    playFx('shoot');
    if (mode === 'tetris' && tetrisCol !== null) {
      playerShoot(tetrisRow, tetrisCol);
      return;
    }
    if (activeAbility) useAbilityAt(x, y, airstrikeDir);
    else playerShoot(x, y);
  };

  const skinClass = `skin-${activeSkin}`;

  // Active/passive board classes — emphasize the board being targeted
  const playerBoardClass = turn === 'enemy' ? 'board-active' : 'board-passive';
  const enemyBoardClass  = turn === 'player' ? 'board-active' : 'board-passive';

  const ownLabel   = isLocal2P ? `Jugador ${local2pAttacker === 'p1' ? 1 : 2}` : 'Tu flota';
  const enemyLabel = isLocal2P ? `Jugador ${local2pAttacker === 'p1' ? 2 : 1}` : 'Aguas enemigas';

  return (
    <div className="relative w-full h-full flex flex-col items-center p-3 gap-2 overflow-auto">
      <WeatherOverlay />
      <AchievementToast />

      <div className="w-full max-w-[1600px] relative z-10">
        <HUD />
      </div>

      {!isLocal2P && (
        <div className="relative z-10">
          <span className={`diff-badge diff-${difficulty}`}>
            vs {difficulty === 'recruit' ? 'Recluta' : difficulty === 'admiral' ? 'Almirante' : 'Tramposo'}
          </span>
        </div>
      )}

      {/* Boards row */}
      <div className="w-full max-w-[1600px] flex flex-col lg:flex-row gap-3 relative z-10 items-start justify-center flex-1">
        {/* Own board */}
        <div className={`flex-1 flex flex-col items-center ${playerBoardClass}`}>
          <div className="title text-base mb-1 opacity-75">{ownLabel}</div>
          <div className={`relative ${skinClass} w-full`} ref={playerBoardRef}>
            <Board board={playerBoard} fleet={playerFleet} isOwn shaking={shakePlayer} overlay={<BurstLayer side="player" anims={shotAnims} onDone={consumeAnim} />} />
            <RadarSweep mode={mode} />
            <WaterTrail containerRef={playerBoardRef} />
          </div>
        </div>

        {/* Abilities column (advanced) */}
        {mode === 'advanced' && (
          <div className="flex flex-col gap-3 items-center self-stretch justify-center min-w-[210px]">
            <AbilityBar />
            {activeAbility === 'airstrike' && (
              <div className="panel p-2 flex gap-2 text-xs">
                <button className="btn !px-2 !py-1"
                  style={{ borderColor: airstrikeDir === 'horizontal' ? 'var(--accent)' : undefined }}
                  onClick={() => setAirstrikeDir('horizontal')}>↔</button>
                <button className="btn !px-2 !py-1"
                  style={{ borderColor: airstrikeDir === 'vertical' ? 'var(--accent)' : undefined }}
                  onClick={() => setAirstrikeDir('vertical')}>↕</button>
              </div>
            )}
            <TurnIndicator turn={turn} />
          </div>
        )}

        {mode !== 'advanced' && <TurnIndicator turn={turn} />}

        {/* Enemy board */}
        <div className={`flex-1 flex flex-col items-center ${enemyBoardClass}`}>
          <div className="title text-base mb-1 opacity-75">{enemyLabel}</div>
          <motion.div
            className={`relative w-full ${zoomEnemy ? 'zoom-hit' : ''}`}
            ref={enemyBoardRef}
            onMouseLeave={() => setHoverEnemy(null)}
          >
            <EnemyBoardWrapper onHover={setHoverEnemy}>
              <Board
                board={enemyBoard}
                fleet={enemyFleet}
                onCellClick={turn === 'player' ? handleEnemyClick : null}
                abilityPreview={abilityPreview}
                radarReveals={radarReveals}
                shaking={shakeEnemy}
                className={mode === 'tetris' ? 'board-tetris' : ''}
                overlay={(
                  <>
                    <BurstLayer side="enemy" anims={shotAnims} onDone={consumeAnim} />
                    {mode === 'tetris' && turn === 'player' && tetrisCol !== null && (
                      <TetrisAimOverlay row={tetrisRow} col={tetrisCol} />
                    )}
                  </>
                )}
              />
            </EnemyBoardWrapper>
            <WaterTrail containerRef={enemyBoardRef} />
          </motion.div>
          {activeAbility && (
            <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="mt-1 text-xs italic" style={{ color: 'var(--warning, var(--accent))' }}>
              ◈ {ABILITIES[activeAbility]?.name}: selecciona objetivo
            </motion.div>
          )}
        </div>
      </div>

      {/* Tactical Log */}
      <div className="w-full max-w-[1600px] relative z-10">
        <TacticalLog />
      </div>

      {/* 2P handoff overlay */}
      {isLocal2P && handoffPending && (
        <PassPCOverlay
          nextPlayer={local2pAttacker === 'p1' ? 2 : 1}
          phase="battle"
          onConfirm={confirmHandoff}
        />
      )}
    </div>
  );
}
function EnemyBoardWrapper({ children, onHover }) {
  return (
    <div
      onMouseMove={(e) => {
        const t = e.target;
        if (t?.classList?.contains('grid-cell')) {
          const allCells = t.parentElement.children;
          const idx = Array.from(allCells).indexOf(t);
          if (idx >= 0) onHover({ x: Math.floor(idx / 10), y: idx % 10 });
        }
      }}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </div>
  );
}

function TurnIndicator({ turn }) {
  return (
    <motion.div key={turn} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="panel px-4 py-2 text-center" style={{ minWidth: 130 }}>
      <div className="text-xs opacity-60">TURNO</div>
      <div className="text-base font-bold tracking-wider"
        style={{ color: turn === 'player' ? 'var(--accent)' : '#ff6a6a' }}>
        {turn === 'player' ? 'TUYO' : 'ENEMIGO'}
      </div>
    </motion.div>
  );
}

// ── Projectile → Burst animation ──────────────────────────────────────────────
function BurstLayer({ side, anims, onDone }) {
  const ours = anims.filter(a => a.side === side);
  if (ours.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 grid"
        style={{ gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', gap: '2px', padding: '4px' }}>
        {ours.map(b => (
          <div key={b.id}
            style={{ gridColumn: b.y + 1, gridRow: b.x + 1, position: 'relative', pointerEvents: 'none' }}>
            <AnimatedShot b={b} onDone={() => onDone(b.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TetrisAimOverlay({ row, col }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 6 }}
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: 'repeat(10, 1fr)',
          gridTemplateRows: 'repeat(10, 1fr)',
          gap: '2px',
          padding: '4px'
        }}
      >
        <motion.div
          key={`${col}-${row}`}
          className="rounded-[4px]"
          style={{
            gridColumn: col + 1,
            gridRow: row + 1,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.45))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.65), 0 0 14px rgba(255,255,255,0.95), inset 0 0 8px rgba(255,255,255,0.45)'
          }}
          initial={{ scale: 0.6, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function AnimatedShot({ b, onDone }) {
  const [phase, setPhase] = useState('projectile');

  useEffect(() => {
    const t = setTimeout(() => setPhase('burst'), 360);
    return () => clearTimeout(t);
  }, []);

  const dotColor = b.type === 'hit' ? '#ff6a00' : '#5588bb';
  const dotGlow  = b.type === 'hit' ? '0 0 10px #ff4400' : '0 0 8px #4477aa';

  if (phase === 'projectile') {
    return (
      <div className="projectile-incoming">
        <motion.div
          className="projectile-dot"
          style={{ background: dotColor, boxShadow: dotGlow }}
          initial={{ y: -36, scale: 0.35, opacity: 0.9 }}
          animate={{ y: 0, scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.36, ease: 'easeIn' }}
        />
      </div>
    );
  }

  return (
    <Burst
      type={b.type === 'hit' ? (b.sunk ? 'sink' : 'hit') : (b.type === 'shield' ? 'hit' : 'miss')}
      onDone={onDone}
    />
  );
}
