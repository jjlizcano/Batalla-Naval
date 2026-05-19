import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore.js';
import Board from '../components/Board.jsx';
import PassPCOverlay from '../components/PassPCOverlay.jsx';
import { SHIP_TYPES } from '../engine/ships.js';

export default function Setup() {
  const playerBoard      = useGameStore(s => s.playerBoard);
  const playerFleet      = useGameStore(s => s.playerFleet);
  const selectedShipUid  = useGameStore(s => s.selectedShipUid);
  const orientation      = useGameStore(s => s.orientation);
  const mode             = useGameStore(s => s.mode);
  const isLocal2P        = useGameStore(s => s.isLocal2P);
  const setupPhase       = useGameStore(s => s.setupPhase);
  const handoffPending   = useGameStore(s => s.handoffPending);

  const selectShip       = useGameStore(s => s.selectShip);
  const rotateOrientation= useGameStore(s => s.rotateOrientation);
  const tryPlaceSelected = useGameStore(s => s.tryPlaceSelected);
  const randomizePlayer  = useGameStore(s => s.randomizePlayer);
  const clearPlacements  = useGameStore(s => s.clearPlacements);
  const startBattle      = useGameStore(s => s.startBattle);
  const finishSetupP1    = useGameStore(s => s.finishSetupP1);
  const confirmHandoff   = useGameStore(s => s.confirmHandoff);
  const goToMenu         = useGameStore(s => s.goToMenu);
  const allPlaced        = useGameStore(s => s.allPlaced());

  const selectedShip = playerFleet.find(s => s.uid === selectedShipUid);
  const placementPreview = selectedShip ? { size: selectedShip.size, orientation, shape: selectedShip.shape || null } : null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'r' || e.key === 'R') rotateOrientation(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotateOrientation]);

  const titleText = isLocal2P
    ? (setupPhase === 'p1' ? 'Jugador 1: Despliega tu flota' : 'Jugador 2: Despliega tu flota')
    : (mode === 'advanced' ? 'PROTOCOLO DE DESPLIEGUE' : 'Despliega tu flota');

  return (
    <div className="w-full h-full flex flex-col items-center p-6 gap-4 overflow-auto">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between flex-shrink-0">
        <button className="btn" onClick={goToMenu}>← Menú</button>
        <h2 className="title text-3xl md:text-4xl">{titleText}</h2>
        <div className="w-20" />
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Board */}
        <div className="flex-1">
          <Board
            board={playerBoard}
            isOwn
            fleet={playerFleet}
            placementPreview={placementPreview}
            onCellClick={(x, y) => tryPlaceSelected(x, y)}
          />
        </div>

        {/* Controls panel */}
        <div className="panel p-5 min-w-[280px] max-w-sm flex flex-col gap-3">
          <h3 className="title text-xl mb-2">Naves disponibles</h3>

          {mode === 'tetris' ? (
            playerFleet.map(s => {
              const placed = s.cells.length > 0;
              const selected = s.uid === selectedShipUid;
              const base = s.colors?.base ?? '#7dd3fc';
              const accent = s.colors?.accent ?? '#e0f2fe';
              return (
                <motion.button
                  key={s.uid}
                  onClick={() => !placed && selectShip(s.uid)}
                  onDragStart={() => !placed && selectShip(s.uid)}
                  draggable={!placed}
                  disabled={placed}
                  className="flex items-center gap-1 px-2 py-1 panel"
                  style={{
                    borderColor: selected ? 'var(--accent)' : undefined,
                    opacity: placed ? 0.35 : 1,
                    boxShadow: selected ? '0 0 12px var(--accent)' : undefined
                  }}
                  whileHover={!placed ? { scale: 1.04 } : undefined}
                  whileTap={!placed ? { scale: 0.96 } : undefined}
                >
                  {Array.from({ length: s.size }).map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        background: placed ? '#444' : `linear-gradient(135deg, ${base}, ${accent})`,
                        boxShadow: placed ? 'none' : 'inset 0 0 4px rgba(255,255,255,0.35)'
                      }}
                    />
                  ))}
                  <div className="text-xs opacity-70 ml-2">{s.name}</div>
                  {placed && <span className="text-[10px] opacity-60 ml-1">✓</span>}
                </motion.button>
              );
            })
          ) : (
            SHIP_TYPES.map(type => {
              const ships = playerFleet.filter(s => s.typeId === type.id);
              return (
                <div key={type.id} className="flex flex-col gap-1">
                  <div className="text-xs opacity-70">{type.name} (tam. {type.size})</div>
                  <div className="flex gap-2">
                    {ships.map(s => {
                      const placed   = s.cells.length > 0;
                      const selected = s.uid === selectedShipUid;
                      return (
                        <motion.button
                          key={s.uid}
                          onClick={() => !placed && selectShip(s.uid)}
                          onDragStart={() => !placed && selectShip(s.uid)}
                          draggable={!placed}
                          disabled={placed}
                          className="flex items-center gap-1 px-2 py-1 panel"
                          style={{
                            borderColor: selected ? 'var(--accent)' : undefined,
                            opacity: placed ? 0.35 : 1,
                            boxShadow: selected ? '0 0 12px var(--accent)' : undefined
                          }}
                          whileHover={!placed ? { scale: 1.04 } : undefined}
                          whileTap={!placed ? { scale: 0.96 } : undefined}
                        >
                          {Array.from({ length: type.size }).map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-sm"
                              style={{ background: placed ? '#444' : 'var(--accent)' }}
                            />
                          ))}
                          {placed && <span className="text-[10px] opacity-60 ml-1">✓</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex flex-col gap-2 mt-4">
            <div className="text-xs opacity-70">
              Orientación: <strong>{typeof orientation === 'number' ? `${orientation}°` : (orientation === 'horizontal' ? 'Horizontal →' : 'Vertical ↓')}</strong>
              <div className="text-[10px] opacity-50">Tecla R para rotar</div>
            </div>
            <button className="btn" onClick={rotateOrientation}>Rotar (R)</button>
            <button className="btn" onClick={randomizePlayer}>Aleatorio</button>
            <button className="btn" onClick={clearPlacements}>Limpiar</button>

            {/* 2P: P1 passes to P2; otherwise start battle */}
            {isLocal2P && setupPhase === 'p1' ? (
              <button
                className="btn"
                onClick={finishSetupP1}
                disabled={!allPlaced}
                style={{
                  background: allPlaced ? 'linear-gradient(180deg, var(--accent), var(--accent-soft))' : undefined,
                  color: allPlaced ? '#000' : undefined,
                  fontWeight: 700
                }}
              >
                → Pasar a Jugador 2
              </button>
            ) : (
              <button
                className="btn"
                onClick={startBattle}
                disabled={!allPlaced}
                style={{
                  background: allPlaced ? 'linear-gradient(180deg, var(--accent), var(--accent-soft))' : undefined,
                  color: allPlaced ? '#000' : undefined,
                  fontWeight: 700
                }}
              >
                ⚓ Comenzar batalla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Handoff overlay — shown between P1→P2 setup */}
      {isLocal2P && handoffPending && (
        <PassPCOverlay nextPlayer={2} phase="setup" onConfirm={confirmHandoff} />
      )}
    </div>
  );
}
