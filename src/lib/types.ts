// Mirrors the Rust structs in src-tauri/src/store.rs — field names are
// snake_case because that is exactly what serde sends over the bridge.

export type Side = 'A' | 'B';

export interface Track {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  track_no: number;
  disc_no: number;
  duration_ms: number;
  side: Side;
  side_index: number;
}

export interface Tape {
  id: string;
  folder: string;
  artist: string;
  album: string;
  year: string;
  cover_path: string | null;
  cover_source: string;
  tracks: Track[];
  current_side: Side;
  reel_position: number;
  wear: number;
  dirt: number;
  stretch: number;
  play_count: number;
  last_played_at: number | null;
  label_artist: string | null;
  label_album: string | null;
  label_style: string;
  label_color: string;
  shell: string;
  case_color: string;
  skin_id: string;
  finish: number;
  rack_order: number;
  hidden: boolean;
  favorite: boolean;
  created_at: number;
  updated_at: number;
}

export interface ScanPath {
  path: string;
  recursive: boolean;
  enabled: boolean;
  last_scanned_at: number | null;
}

export interface Settings {
  hinge_breakpoint: number;
  auto_reverse: boolean;
  tape_wear_enabled: boolean;
  tape_stretch_enabled: boolean;
  key_sounds: boolean;
  volume: number;
  current_skin: string;
  current_finish: number;
  show_mini_player: boolean;
  mode_lock: string;
  theme: string;
  reduce_motion: boolean;
  recent: string[];
}

export interface Library {
  version: number;
  tapes: Tape[];
  scan_paths: ScanPath[];
  settings: Settings;
  updated_at: number;
}

export interface ScanReport {
  tapes: number;
  tracks: number;
  skipped_paths: number;
  duration_ms: number;
}

export interface ImportReport {
  tapes_added: number;
  tapes_merged: number;
  tracks: number;
  message: string;
}

export interface FileImportReport {
  added: string[];
  skipped: number;
  library: Library;
  message: string;
}

export interface AppInfo {
  name: string;
  version: string;
  library_path: string;
}

export type DeckMode = 'cover' | 'inner';
