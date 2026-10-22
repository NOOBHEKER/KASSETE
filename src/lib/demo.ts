import type { Library, Tape, Track } from './types';

/** A small, hand-written collection used when the UI is opened in a plain
 *  browser (design work, screenshots) rather than inside the desktop shell. */

interface Seed {
  artist: string;
  album: string;
  year: string;
  shell: string;
  label_style: string;
  label_color: string;
  case_color: string;
  titles: string[];
  favorite?: boolean;
  play_count: number;
  wear: number;
  position: number;
}

const SEEDS: Seed[] = [
  {
    artist: 'The Vellums',
    album: 'Late Night Drive',
    year: '1987',
    shell: 'A',
    label_style: 'handwriting',
    label_color: '#24303a',
    case_color: '#3b3f45',
    play_count: 34,
    wear: 0.32,
    position: 0.18,
    favorite: true,
    titles: [
      'Headlights',
      'The Long Way Round',
      'Service Station Coffee',
      'Radio Static',
      'Ninety Miles',
      'Back Seat Sleep',
      'Dawn Patrol',
      'Home Before Light',
      'Mile Marker 9',
      'Idle',
    ],
  },
  {
    artist: 'Marrow & Kite',
    album: 'Coastal Static',
    year: '1991',
    shell: 'C',
    label_style: 'typewriter',
    label_color: '#1e3a2f',
    case_color: '#2c4a44',
    play_count: 12,
    wear: 0.14,
    position: 0.46,
    titles: [
      'Salt Air',
      'Foghorn',
      'Tide Chart',
      'Gull',
      'Cold Water Swim',
      'Harbour Lights',
      'Weather Report',
      'Slack Water',
    ],
  },
  {
    artist: 'Alba Frost',
    album: 'Room Tone',
    year: '1994',
    shell: 'B',
    label_style: 'marker',
    label_color: '#3a2a55',
    case_color: '#242424',
    play_count: 61,
    wear: 0.58,
    position: 0.72,
    titles: [
      'Hum',
      'Carpet',
      'Afternoon Nap',
      'Radiator',
      'Door Left Open',
      'Four Walls',
      'Ceiling Fan',
      'Quiet Part',
      'Neighbours',
      'Small Hours',
      'Last Light',
    ],
  },
  {
    artist: 'Hollow Season',
    album: 'Everything Nearby',
    year: '1989',
    shell: 'A',
    label_style: 'handwriting',
    label_color: '#5a1f1f',
    case_color: '#5a3a2a',
    play_count: 7,
    wear: 0.09,
    position: 0.05,
    titles: [
      'Front Garden',
      'Postcode',
      'Bus Timetable',
      'Corner Shop',
      'Someone Else’s Dog',
      'Streetlamp',
      'Bin Day',
      'The Way Back',
    ],
  },
  {
    artist: 'Nami Okafor',
    album: 'Paper Suns',
    year: '1996',
    shell: 'D',
    label_style: 'thai',
    label_color: '#24303a',
    case_color: '#6b4416',
    play_count: 23,
    wear: 0.21,
    position: 0.33,
    titles: [
      'Origami',
      'Warm Paper',
      'Folded Light',
      'Ink Bleed',
      'Two Sheets',
      'Sundial',
      'Crease',
      'Unfold Slowly',
      'Paper Suns',
    ],
  },
  {
    artist: 'Delta Rain',
    album: 'Slow Traffic',
    year: '1982',
    shell: 'E',
    label_style: 'typewriter',
    label_color: '#2b2b2b',
    case_color: '#1d1d1d',
    play_count: 88,
    wear: 0.77,
    position: 0.61,
    favorite: true,
    titles: [
      'Junction 4',
      'Hard Shoulder',
      'Wipers',
      'Tail Lights',
      'Average Speed',
      'Lay-by',
      'Roadworks',
      'Exit Sign',
      'Slow Traffic',
      'Arrival',
    ],
  },
  {
    artist: 'The Hargroves',
    album: 'Kitchen Radio',
    year: '1979',
    shell: 'A',
    label_style: 'handwriting',
    label_color: '#6b4416',
    case_color: '#7a5a3a',
    play_count: 0,
    wear: 0.02,
    position: 0,
    titles: [
      'Kettle Whistle',
      'Toast',
      'Two Sugars',
      'Washing Up',
      'Window Open',
      'Sunday Roast',
      'Radio Four',
      'Plate Stack',
    ],
  },
  {
    artist: 'Ilse Verhoeven',
    album: 'Blue Hour',
    year: '1993',
    shell: 'C',
    label_style: 'marker',
    label_color: '#1e3a2f',
    case_color: '#26323d',
    play_count: 45,
    wear: 0.41,
    position: 0.55,
    titles: [
      'Six O’Clock',
      'Canal Light',
      'Bicycle Bell',
      'Blue Hour',
      'Windows Lit',
      'Cold Hands',
      'Last Tram',
      'Street Cleaner',
      'Early Ferry',
    ],
  },
];

const LENGTHS = [198000, 232000, 174000, 261000, 214000, 188000, 245000, 205000, 229000, 181000, 256000, 192000];

let seedOffset = 0;

function makeTape(seed: Seed, index: number): Tape {
  const total = seed.titles.length;
  const half = Math.ceil(total / 2);

  const tracks: Track[] = seed.titles.map((title, i) => {
    const onA = i < half;
    const side = onA ? 'A' : 'B';
    const sideIndex = onA ? i + 1 : i - half + 1;
    const duration = LENGTHS[(i + seedOffset) % LENGTHS.length];
    return {
      id: `demo-trk-${index}-${i}`,
      path: '',
      title,
      artist: seed.artist,
      album: seed.album,
      track_no: i + 1,
      disc_no: 1,
      duration_ms: duration,
      side,
      side_index: sideIndex,
    };
  });
  seedOffset += 3;

  return {
    id: `demo-tape-${index}`,
    folder: `C:\\Demo Music\\${seed.artist}\\${seed.album}`,
    artist: seed.artist,
    album: seed.album,
    year: seed.year,
    cover_path: null,
    cover_source: 'none',
    tracks,
    current_side: 'A',
    reel_position: seed.position,
    wear: seed.wear,
    dirt: Math.min(1, seed.wear * 0.6),
    stretch: Math.min(1, seed.wear * 0.25),
    play_count: seed.play_count,
    last_played_at: Math.floor(Date.now() / 1000) - 86400 * (index + 1),
    label_artist: null,
    label_album: null,
    label_style: seed.label_style,
    label_color: seed.label_color,
    shell: seed.shell,
    case_color: seed.case_color,
    skin_id: 'fm8-classic',
    finish: 0,
    rack_order: index + 1,
    hidden: false,
    favorite: seed.favorite ?? false,
    created_at: Math.floor(Date.now() / 1000) - 86400 * 120,
    updated_at: Math.floor(Date.now() / 1000) - 86400 * index,
  };
}

export const DEMO_LIBRARY: Library = {
  version: 1,
  tapes: SEEDS.map(makeTape),
  scan_paths: [{ path: 'C:\\Demo Music', recursive: true, enabled: true, last_scanned_at: null }],
  settings: {
    hinge_breakpoint: 800,
    auto_reverse: true,
    tape_wear_enabled: true,
    tape_stretch_enabled: true,
    key_sounds: false,
    volume: 0.72,
    current_skin: 'fm8-classic',
    current_finish: 0,
    show_mini_player: true,
    mode_lock: 'auto',
    theme: 'auto',
    reduce_motion: false,
    recent: [],
  },
  updated_at: Math.floor(Date.now() / 1000),
};
