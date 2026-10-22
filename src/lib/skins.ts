/** The ten cassette decks that ship with KASSETE.
 *
 *  Each entry is both a `data-skin` value in app.css (which supplies the CSS
 *  custom properties) and the card shown in the skin picker. */
export interface Skin {
  id: string;
  name: string;
  model: string;
  tagline: string;
  /** CSS background used for the little swatch in the picker. */
  swatch: string;
  /** Ink colour of the swatch caption text. */
  ink: string;
  finishes: string[];
}

export const SKINS: Skin[] = [
  {
    id: 'fm8-classic',
    name: 'FM-8 Classic',
    model: 'Fold-matic FM-8',
    tagline: 'Silver plastic, cream labels, orange TALK light.',
    swatch: 'linear-gradient(168deg,#d3cfc7 0%,#b3aea4 100%)',
    ink: '#232120',
    finishes: ['Brushed', 'Matte'],
  },
  {
    id: 'fc8-clear',
    name: 'FC-8 Clear',
    model: 'Fold-matic FC-8',
    tagline: 'See-through shell — you can watch the gears turn.',
    swatch: 'linear-gradient(168deg,rgba(226,238,244,.95),rgba(190,210,222,.95))',
    ink: '#1d2b33',
    finishes: ['Crystal', 'Frosted'],
  },
  {
    id: 'fx79-original',
    name: 'FX-79 Original',
    model: 'Fold-matic FX-79',
    tagline: 'The blue one from the poster. Chrome trim, warm amps.',
    swatch: 'linear-gradient(168deg,#2f6fa8 0%,#1c4a72 100%)',
    ink: '#eef5fb',
    finishes: ['Gloss', 'Satin'],
  },
  {
    id: 'fz90-glass',
    name: 'FZ-90 Glass',
    model: 'Fold-matic FZ-90',
    tagline: 'Borrowed from a premium phone — glass front, no screws.',
    swatch: 'linear-gradient(168deg,rgba(40,50,58,.95),rgba(10,13,16,.98))',
    ink: '#e2edf4',
    finishes: ['Black glass', 'White glass'],
  },
  {
    id: 'fh80-hifi',
    name: 'FH-80 Hi-Fi',
    model: 'Fold-matic FH-80',
    tagline: 'Brushed aluminium, twin needles, a proper volume wheel.',
    swatch: 'repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 1px,rgba(0,0,0,.06) 1px 2px),linear-gradient(168deg,#b9bcc1,#95999f)',
    ink: '#1f2226',
    finishes: ['Aluminium', 'Graphite'],
  },
  {
    id: 'fx85-mirror',
    name: 'FX-85 Mirror',
    model: 'Fold-matic FX-85',
    tagline: 'Smoked mirror lid that catches the room behind you.',
    swatch: 'linear-gradient(150deg,#8fa6b8 0%,#2d333a 45%,#12161a 100%)',
    ink: '#e7eff5',
    finishes: ['Smoked', 'Chrome'],
  },
  {
    id: 'fa82-car',
    name: 'FA-82 Car',
    model: 'Fold-matic FA-82',
    tagline: 'In-dash deck. Green digits, rubber keys, road noise.',
    swatch: 'linear-gradient(168deg,#1a1c1e,#0d0e10)',
    ink: '#35ff8b',
    finishes: ['Dash black', 'Walnut'],
  },
  {
    id: 'fj88-boombox',
    name: 'FJ-88 Boombox',
    model: 'Fold-matic FJ-88',
    tagline: 'Chrome handle, rainbow stripe, neighbours included.',
    swatch: 'linear-gradient(168deg,#d6dadd,#b3b8bc)',
    ink: '#212528',
    finishes: ['Silver', 'Red'],
  },
  {
    id: 'fd84-pro',
    name: 'FD-84 Pro',
    model: 'Fold-matic FD-84',
    tagline: 'Studio rack unit. Chunky keys, red LEDs, no apologies.',
    swatch: 'linear-gradient(168deg,#24272c,#14161a)',
    ink: '#e9ecef',
    finishes: ['Rack black', 'Rack grey'],
  },
  {
    id: 'fk84-stealth',
    name: 'FK-84 Stealth',
    model: 'Fold-matic FK-84',
    tagline: 'Matte black, a single green lamp, nothing else.',
    swatch: 'linear-gradient(168deg,#101113,#08090a)',
    ink: '#d8dce0',
    finishes: ['Matte', 'Soft-touch'],
  },
];

export const SKIN_IDS = SKINS.map((s) => s.id);

export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}

/** Push the active skin onto <html> so every descendant picks up the vars. */
export function applySkin(id: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.skin = skinById(id).id;
}

export const SHELLS: { id: string; name: string }[] = [
  { id: 'A', name: 'Cream' },
  { id: 'B', name: 'Smoked' },
  { id: 'C', name: 'Frosted blue' },
  { id: 'D', name: 'Clear' },
  { id: 'E', name: 'Black' },
];

export const LABEL_STYLES: { id: string; name: string }[] = [
  { id: 'typewriter', name: 'Typewriter' },
  { id: 'handwriting', name: 'Handwritten' },
  { id: 'thai', name: 'Printed' },
  { id: 'marker', name: 'Marker' },
];

export const LABEL_COLORS = [
  '#24303a',
  '#1e3a2f',
  '#5a1f1f',
  '#3a2a55',
  '#2b2b2b',
  '#6b4416',
];
