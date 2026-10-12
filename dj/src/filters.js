// Lavalink v4 filter presets. `clear` resets everything.
const eq = (bands) => ({ equalizer: bands.map((gain, band) => ({ band, gain })) });
export const FILTERS = {
  clear: {},
  '8d': { rotation: { rotationHz: 0.2 } },
  bassboost: eq([0.25, 0.25, 0.2, 0.15, 0.1, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  nightcore: { timescale: { speed: 1.25, pitch: 1.25, rate: 1 } },
  slowmo: { timescale: { speed: 0.75, pitch: 1, rate: 1 } },
  chipmunk: { timescale: { speed: 1.05, pitch: 1.35, rate: 1.25 } },
  speed: { timescale: { speed: 1.5, pitch: 1, rate: 1 } },
  karaoke: { karaoke: { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 } },
  pop: eq([-0.1, 0.1, 0.15, 0.2, 0.15, 0.05, 0, -0.05, -0.05, 0, 0, 0, 0, 0, 0]),
  soft: eq([0, 0, 0, 0, 0, 0, 0, 0, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4, -0.45]),
  treblebass: eq([0.3, 0.25, 0.2, 0.05, -0.05, -0.1, 0, 0, 0.1, 0.2, 0.25, 0.3, 0.3, 0.3, 0.3]),
  earrape: { ...eq(Array(15).fill(0.25)) },
  radio: eq([-0.25, -0.2, -0.1, 0.05, 0.15, 0.2, 0.2, 0.15, 0.1, 0, -0.1, -0.2, -0.3, -0.4, -0.5]),
  equalizer: eq([0.1, 0.1, 0.05, 0, -0.05, 0, 0.05, 0.1, 0.1, 0.1, 0.05, 0, 0, 0, 0])
};
export const FILTER_NAMES = Object.keys(FILTERS);
