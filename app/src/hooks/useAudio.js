import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import tetristheme from '../song/tetristheme.mp3';
import { useGameStore, SCREENS } from '../store/gameStore.js';

// Generate procedural sounds via WebAudio (no external assets needed)
function genSynthSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const len = data.length;

  switch (type) {
    case 'shoot':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 12);
        data[i] = (Math.random() * 2 - 1) * env * 0.5;
      }
      break;
    case 'splash':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 4) * (1 - Math.exp(-t * 30));
        data[i] = (Math.random() * 2 - 1) * env * 0.3;
      }
      break;
    case 'explosion':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 3);
        const low = Math.sin(2 * Math.PI * 60 * t * (1 + t)) * 0.5;
        const noise = (Math.random() * 2 - 1) * env * 0.6;
        data[i] = (low * env + noise) * 0.7;
      }
      break;
    case 'sink':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 1.5);
        const tone = Math.sin(2 * Math.PI * (200 - t * 100) * t);
        data[i] = tone * env * 0.4;
      }
      break;
    case 'radar':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.sin(t * Math.PI / 0.6);
        const tone = Math.sin(2 * Math.PI * 880 * t);
        data[i] = tone * env * 0.2;
      }
      break;
    case 'alert':
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 5);
        const tone = Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 660 * t);
        data[i] = tone * env * 0.15;
      }
      break;
    default:
      break;
  }
  return { ctx, buffer };
}

let audioContext = null;
const sfxBuffers = {};

function ensureCtx() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    for (const t of ['shoot', 'splash', 'explosion', 'sink', 'radar', 'alert']) {
      sfxBuffers[t] = genSynthSound(t).buffer;
    }
  }
}

export function playFx(name) {
  if (useGameStore.getState().muted) return;
  ensureCtx();
  const buf = sfxBuffers[name];
  if (!buf) return;
  const src = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  gain.gain.value = 0.6;
  src.buffer = buf;
  src.connect(gain).connect(audioContext.destination);
  try { src.start(0); } catch (_) {}
}

export function useAudio() {
  const muted = useGameStore(s => s.muted);
  const mode = useGameStore(s => s.mode);
  const screen = useGameStore(s => s.screen);
  const oscRef = useRef(null);
  const howlRef = useRef(null);

  // Ambient pad — synthesized, looped
  useEffect(() => {
    if (muted || screen === SCREENS.MENU) {
      if (oscRef.current) {
        try { oscRef.current.gain.gain.exponentialRampToValueAtTime(0.0001, oscRef.current.ctx.currentTime + 0.5); } catch (_) {}
        try { oscRef.current.stop && oscRef.current.stop(); } catch (_) {}
        oscRef.current = null;
      }
      return;
    }
    ensureCtx();
    const ctx = audioContext;
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const freqs = mode === 'advanced' ? [55, 110, 165, 220] : [49, 73, 98, 147];
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.04 : 0.025;
      o.connect(g).connect(master);
      o.start();
      return { o, g };
    });

    // LFO on master for slow swell
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.04;
    lfo.connect(lfoG).connect(master.gain);
    lfo.start();

    master.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 2);

    oscRef.current = {
      gain: master,
      stop: () => {
        oscs.forEach(({ o }) => { try { o.stop(); } catch (_) {} });
        try { lfo.stop(); } catch (_) {}
      },
      ctx
    };

    return () => {
      try { master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4); } catch (_) {}
      setTimeout(() => oscRef.current && oscRef.current.stop(), 500);
    };
  }, [muted, mode, screen]);

  // Tetris theme: play external tetristheme.mp3 in loop when entering tetris mode
  useEffect(() => {
    // stop/unload any existing theme first
    if (howlRef.current) {
      try { howlRef.current.stop(); } catch (_) {}
      try { howlRef.current.unload && howlRef.current.unload(); } catch (_) {}
      howlRef.current = null;
    }
    if (muted) return;
    if (mode !== 'tetris') return;

    try {
      const h = new Howl({
        src: [tetristheme],
        loop: true,
        volume: 0.6,
        html5: true
      });
      howlRef.current = h;
      h.play();
    } catch (e) {
      // fail silently if asset not present
      // console.warn('Tetris theme failed to play', e);
    }

    return () => {
      if (howlRef.current) {
        try { howlRef.current.stop(); } catch (_) {}
        try { howlRef.current.unload && howlRef.current.unload(); } catch (_) {}
        howlRef.current = null;
      }
    };
  }, [muted, mode]);
}
