// Audio effects: each has an on/off state and a level 1-10 (default 5). Several can be on at once; compose() merges them
// into one Lavalink v4 filter object (equalizer gains add up, timescale factors multiply).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const curve = (shape, k) => shape.map((x) => x * k);
const Z = (n = 15) => Array(n).fill(0);
const shape = (from, vals) => { const a = Z(); vals.forEach((v, i) => { a[from + i] = v; }); return a; };

export const EFFECTS = {
  bassboost: { label: 'Bass boost', emoji: '🔊', blurb: 'Deeper low end', build: (l) => ({ eq: curve(shape(0, [1, 0.9, 0.75, 0.5, 0.25, 0.1]), l * 0.06), volume: 1 - l * 0.02 }) },
  treble: { label: 'Treble boost', emoji: '✨', blurb: 'Brighter highs', build: (l) => ({ eq: curve(shape(8, [0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.5]), l * 0.07) }) },
  vocal: { label: 'Vocal boost', emoji: '🎤', blurb: 'Pushes voices forward', build: (l) => ({ eq: curve(shape(4, [0.3, 0.5, 0.7, 0.7, 0.5, 0.3]), l * 0.06) }) },
  pop: { label: 'Pop', emoji: '🎵', blurb: 'Pop EQ curve', build: (l) => ({ eq: curve([-0.1, 0.1, 0.15, 0.2, 0.15, 0.05, 0, -0.05, -0.05, 0, 0, 0, 0, 0, 0], l / 5) }) },
  soft: { label: 'Soft', emoji: '🌙', blurb: 'Rolls off the highs', build: (l) => ({ eq: curve([0, 0, 0, 0, 0, 0, 0, 0, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4, -0.45], l / 5) }) },
  radio: { label: 'Radio', emoji: '📻', blurb: 'Mid-range radio sound', build: (l) => ({ eq: curve([-0.25, -0.2, -0.1, 0.05, 0.15, 0.2, 0.2, 0.15, 0.1, 0, -0.1, -0.2, -0.3, -0.4, -0.5], l / 5) }) },
  nightcore: { label: 'Nightcore', emoji: '⚡', blurb: 'Faster and higher', build: (l) => ({ timescale: { speed: 1 + l * 0.04, pitch: 1 + l * 0.04 } }) },
  vaporwave: { label: 'Vaporwave', emoji: '🌴', blurb: 'Slower and lower', build: (l) => ({ timescale: { speed: 1 - l * 0.025, pitch: 1 - l * 0.03 } }) },
  speed: { label: 'Speed', emoji: '⏩', blurb: 'Faster, same pitch', build: (l) => ({ timescale: { speed: 1 + l * 0.05 } }) },
  slowmo: { label: 'Slow motion', emoji: '🐌', blurb: 'Slower, same pitch', build: (l) => ({ timescale: { speed: 1 - l * 0.035 } }) },
  chipmunk: { label: 'Chipmunk', emoji: '🐿️', blurb: 'High squeaky pitch', build: (l) => ({ timescale: { pitch: 1 + l * 0.06 } }) },
  '8d': { label: '8D audio', emoji: '🎧', blurb: 'Sound circles your head', build: (l) => ({ rotation: { rotationHz: l * 0.04 } }) },
  karaoke: { label: 'Karaoke', emoji: '🎙️', blurb: 'Removes centre vocals', build: (l) => ({ karaoke: { level: l / 10, monoLevel: l / 10, filterBand: 220, filterWidth: 100 } }) },
  tremolo: { label: 'Tremolo', emoji: '〰️', blurb: 'Wobbling volume', build: (l) => ({ tremolo: { frequency: 1 + l * 0.5, depth: clamp(l * 0.08, 0.05, 0.95) } }) },
  vibrato: { label: 'Vibrato', emoji: '🎻', blurb: 'Wobbling pitch', build: (l) => ({ vibrato: { frequency: 1 + l * 0.6, depth: clamp(l * 0.07, 0.05, 0.95) } }) }
};
export const EFFECT_NAMES = Object.keys(EFFECTS);
export const DEFAULT_LEVEL = 5;

export const effectState = (settings, name) => settings.effects?.[name] || { on: false, level: DEFAULT_LEVEL };
export const activeEffects = (settings) => EFFECT_NAMES.filter((n) => settings.effects?.[n]?.on);

export function compose(settings) {
  const eq = Z(); let volume = 1; const ts = { speed: 1, pitch: 1, rate: 1 }; const out = {}; let usedTs = false;
  for (const name of activeEffects(settings)) {
    const p = EFFECTS[name].build(effectState(settings, name).level);
    if (p.eq) p.eq.forEach((g, i) => { eq[i] += g; });
    if (p.volume) volume *= p.volume;
    if (p.timescale) { usedTs = true; for (const k of ['speed', 'pitch', 'rate']) if (p.timescale[k]) ts[k] *= p.timescale[k]; }
    for (const k of ['rotation', 'karaoke', 'tremolo', 'vibrato']) if (p[k]) out[k] = p[k];
  }
  const bands = eq.map((g, band) => ({ band, gain: clamp(g, -0.25, 1) })).filter((b) => b.gain !== 0);
  if (bands.length) out.equalizer = bands;
  if (usedTs) out.timescale = { speed: clamp(ts.speed, 0.5, 2), pitch: clamp(ts.pitch, 0.5, 2), rate: ts.rate };
  if (volume !== 1) out.volume = clamp(volume, 0.5, 1);
  return out;
}
