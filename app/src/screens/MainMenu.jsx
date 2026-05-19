import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore.js';
import { DIFFICULTIES } from '../engine/ai.js';
import { ACHIEVEMENTS, SHIP_SKINS } from '../engine/progression.js';

export default function MainMenu() {
  const startMode = useGameStore(s => s.startMode);
  const muted = useGameStore(s => s.muted);
  const toggleMute = useGameStore(s => s.toggleMute);
  const difficulty = useGameStore(s => s.difficulty);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const coins = useGameStore(s => s.coins);
  const unlockedAchievements = useGameStore(s => s.unlockedAchievements);
  const skins = useGameStore(s => s.skins);
  const buySkin = useGameStore(s => s.buySkin);
  const minigames = useGameStore(s => s.minigames);
  const buyMinigame = useGameStore(s => s.buyMinigame);
  const activeSkin = useGameStore(s => s.activeSkin);
  const setActiveSkin = useGameStore(s => s.setActiveSkin);

  const [showCollection, setShowCollection] = useState(false);
  const tetrisUnlocked = minigames?.some(mg => mg.id === 'tetris' && mg.unlocked);

  return (
    <div className="theme-classic w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated wave background */}
      <div className="wave-bg">
        {[0, 1, 2].map(i => (
          <svg key={i} className="absolute w-[200%] left-[-50%]"
            style={{ bottom: `${10 + i * 12}%`, opacity: 0.18 - i * 0.04,
              animation: `wave ${8 + i * 2}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }}
            viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,30 Q150,5 300,30 T600,30 T900,30 T1200,30 V60 H0 Z"
              fill={i === 0 ? '#c9a96e' : '#475a6b'} />
          </svg>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-6 z-20">
        <motion.button
          className="panel px-3 py-1.5 text-sm flex items-center gap-2"
          onClick={() => setShowCollection(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span style={{ color: 'var(--accent)' }}>◈</span>
          <span className="font-bold" style={{ color: 'var(--accent)' }}>{coins}</span>
          <span className="opacity-60 text-xs">monedas</span>
        </motion.button>
        <button className="text-xs opacity-60 hover:opacity-100 transition-opacity" onClick={toggleMute}>
          {muted ? '🔇 Audio OFF' : '🔊 Audio ON'}
        </button>
      </div>

      <motion.h1 className="title text-6xl md:text-8xl mb-2 relative z-10"
        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}>
        BATALLA NAVAL
      </motion.h1>
      <motion.p className="text-classic-brass/70 italic text-lg mb-8 tracking-widest relative z-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
        — Premium Edition —
      </motion.p>

      {/* Difficulty selector */}
      <motion.div className="flex gap-2 mb-8 relative z-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        {Object.values(DIFFICULTIES).map(d => (
          <button key={d.id} onClick={() => setDifficulty(d.id)}
            className="panel px-4 py-2 text-sm transition-all"
            style={{
              borderColor: difficulty === d.id ? 'var(--accent)' : 'transparent',
              color: difficulty === d.id ? 'var(--accent)' : 'var(--text)',
              boxShadow: difficulty === d.id ? '0 0 12px var(--accent)' : 'none',
              opacity: difficulty === d.id ? 1 : 0.6
            }}>
            {d.label}
          </button>
        ))}
      </motion.div>

      <motion.div className="flex flex-col md:flex-row gap-6 relative z-10 flex-wrap justify-center"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}>
        <ModeCard title="Modo Clásico" subtitle="Naval realista — 10×10 tradicional"
          accent="#c9a96e" theme="classic" onClick={() => startMode('classic')} />
        <ModeCard title="Modo Avanzado" subtitle="Sci-Fi — habilidades, créditos, clima"
          accent="#00e5ff" theme="advanced" onClick={() => startMode('advanced')} />
        <ModeCard title="2 Jugadores" subtitle="Pasa el PC — mismo dispositivo"
          accent="#8b5cf6" theme="classic" onClick={() => startMode('local2p')} />
        {tetrisUnlocked && (
          <ModeCard
            title="Tetris"
            subtitle="Modo Tetris — piezas especiales, dispara cuando confirmes"
            accent="#9cff7a"
            theme="classic"
            onClick={() => startMode('tetris')}
          />
        )}
      </motion.div>

      {/* Achievements strip */}
      <motion.div className="flex gap-3 mt-8 relative z-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        {ACHIEVEMENTS.slice(0, 6).map(a => {
          const unlocked = unlockedAchievements.includes(a.id);
          return (
            <div key={a.id} title={`${a.name}: ${a.desc}`}
              className="text-xl" style={{ opacity: unlocked ? 1 : 0.2, filter: unlocked ? 'none' : 'grayscale(1)' }}>
              {a.icon}
            </div>
          );
        })}
      </motion.div>

      <motion.div className="absolute bottom-6 text-xs opacity-40 tracking-widest"
        initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1, duration: 1 }}>
        SELECCIONA UN MODO PARA COMENZAR
      </motion.div>

      {/* Collection modal */}
      <AnimatePresence>
        {showCollection && (
          <CollectionModal
            coins={coins} skins={skins} minigames={minigames} activeSkin={activeSkin}
            achievements={ACHIEVEMENTS} unlocked={unlockedAchievements}
            onBuySkin={buySkin} onBuyMinigame={buyMinigame} onSelect={setActiveSkin}
            onClose={() => setShowCollection(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeCard({ title, subtitle, accent, theme, onClick, disabled = false }) {
  const isAdvanced = theme === 'advanced';
  return (
    <motion.button onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`panel relative px-10 py-8 min-w-[280px] text-left overflow-hidden ${isAdvanced ? 'theme-advanced' : ''}`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 30px ${accent}33, inset 0 0 20px ${accent}11`,
        opacity: disabled ? 0.72 : 1,
        cursor: disabled ? 'default' : 'pointer'
      }}
      whileHover={disabled ? undefined : { scale: 1.03, y: -4, boxShadow: `0 10px 40px ${accent}55` }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <div className="text-2xl font-bold mb-2 tracking-wider"
        style={{ color: accent, textShadow: isAdvanced ? `0 0 10px ${accent}` : 'none',
                 fontFamily: isAdvanced ? 'Orbitron, monospace' : 'Cormorant Garamond, serif' }}>
        {title}
      </div>
      <div className="text-sm opacity-70" style={{ color: '#cbd5e1' }}>{subtitle}</div>
      {disabled && <div className="mt-3 text-[10px] uppercase tracking-[0.3em] opacity-50">Próximamente</div>}
      {isAdvanced && <div className="scanline" />}
    </motion.button>
  );
}

function CollectionModal({ coins, skins, minigames, activeSkin, achievements, unlocked, onBuySkin, onBuyMinigame, onSelect, onClose }) {
  const [tab, setTab] = useState('skins');
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="panel max-w-xl w-full mx-4 p-6 relative"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="title text-xl">Colección</div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--accent)' }}>◈ {coins}</span>
            <button className="btn !px-3 !py-1 text-xs" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['skins', 'minijuegos', 'logros'].map(t => (
            <button key={t} className="btn !px-4 !py-1 text-sm capitalize"
              style={{ borderColor: tab === t ? 'var(--accent)' : 'transparent' }}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'skins' && (
          <div className="grid grid-cols-2 gap-3">
            {skins.map(s => (
              <motion.div key={s.id} className="panel p-3 flex flex-col gap-2"
                style={{ borderColor: activeSkin === s.id ? 'var(--accent)' : 'transparent' }}
                whileHover={{ scale: 1.02 }}>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 rounded-sm flex gap-0.5 items-center px-1"
                    style={{ background: s.colors.base, border: `1px solid ${s.colors.accent}` }}>
                    {Array.from({length:4}).map((_,i) => (
                      <div key={i} className="flex-1 h-3 rounded-sm" style={{ background: s.colors.accent }} />
                    ))}
                  </div>
                  <span className="text-sm">{s.name}</span>
                </div>
                {s.unlocked ? (
                  <button className="btn !py-0.5 text-xs"
                    style={{ borderColor: activeSkin === s.id ? 'var(--accent)' : undefined }}
                    onClick={() => onSelect(s.id)}>
                    {activeSkin === s.id ? '✓ Activo' : 'Usar'}
                  </button>
                ) : (
                  <button className="btn !py-0.5 text-xs" onClick={() => onBuySkin(s.id)}>
                    ◈ {s.price}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'minijuegos' && (
          <div className="flex flex-col gap-3">
            {minigames.map(game => {
              const unlockedGame = !!game.unlocked;
              return (
                <motion.div key={game.id} className="panel p-4 flex items-center justify-between gap-3"
                  style={{ borderColor: unlockedGame ? game.accent : 'transparent' }}
                  whileHover={{ scale: 1.01 }}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: game.accent }}>{game.name}</div>
                    <div className="text-xs opacity-60 mt-1">{game.desc}</div>
                  </div>
                  {unlockedGame ? (
                    <span className="text-xs uppercase tracking-[0.2em]" style={{ color: game.accent }}>Desbloqueado</span>
                  ) : (
                    <button className="btn !py-0.5 text-xs" onClick={() => onBuyMinigame(game.id)}>
                      ◈ {game.price}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === 'logros' && (
          <div className="flex flex-col gap-2">
            {achievements.map(a => {
              const done = unlocked.includes(a.id);
              return (
                <div key={a.id} className="panel p-3 flex items-center gap-3"
                  style={{ opacity: done ? 1 : 0.45 }}>
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{a.name}</div>
                    <div className="text-xs opacity-60">{a.desc}</div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--accent)' }}>+{a.reward}◈</span>
                  {done && <span className="text-xs opacity-60">✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
