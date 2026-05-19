import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, SCREENS } from './store/gameStore.js';
import MainMenu from './screens/MainMenu.jsx';
import Setup from './screens/Setup.jsx';
import Battle from './screens/Battle.jsx';
import EndScreen from './screens/EndScreen.jsx';
import { useAudio } from './hooks/useAudio.js';

const SCREEN_COMPONENTS = {
  [SCREENS.MENU]:   MainMenu,
  [SCREENS.SETUP]:  Setup,
  [SCREENS.BATTLE]: Battle,
  [SCREENS.END]:    EndScreen
};

export default function App() {
  const screen = useGameStore(s => s.screen);
  const mode = useGameStore(s => s.mode);
  useAudio();

  const setCoins = useGameStore(s => s.setCoins);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const val = params.get('debug_coins') || params.get('coins');
      if (val !== null) {
        const n = Number(val);
        if (!Number.isNaN(n)) {
          setCoins(n, true);
        }
        // remove the debug param so it doesn't reapply on navigation
        params.delete('debug_coins');
        params.delete('coins');
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (e) {
      // ignore in environments without window
    }
  }, [setCoins]);

  const themeClass = mode === 'advanced' ? 'theme-advanced' : 'theme-classic';
  const Current = SCREEN_COMPONENTS[screen] || MainMenu;

  return (
    <div className={`${themeClass} relative w-full h-full overflow-hidden`}>
      <motion.div
        key={screen}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Current />
      </motion.div>
    </div>
  );
}
