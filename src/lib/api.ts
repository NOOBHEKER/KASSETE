import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type {
  AppInfo,
  FileImportReport,
  ImportReport,
  Library,
  ScanReport,
  Settings,
  Tape,
} from './types';

/** True when running inside the Tauri shell. Lets `vite dev` in a plain
 *  browser fall back to demo data instead of exploding on invoke(). */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(
      'KASSETE is running outside its desktop shell — start it with `npm run tauri dev`.'
    );
  }
  return invoke<T>(cmd, args);
}

export const api = {
  getLibrary: () => call<Library>('get_library'),
  appInfo: () => call<AppInfo>('app_info'),

  scanLibrary: () => call<ScanReport>('scan_library'),
  addScanPath: (path: string, recursive = true) =>
    call<Library>('add_scan_path', { path, recursive }),
  removeScanPath: (path: string) =>
    call<Library>('remove_scan_path', { path }),
  setScanPathEnabled: (path: string, enabled: boolean) =>
    call<Library>('set_scan_path_enabled', { path, enabled }),

  updateTape: (tape: Tape) => call<Tape>('update_tape', { tape }),
  patchTapeState: (patch: {
    id: string;
    currentSide?: string;
    reelPosition?: number;
    playCount?: number;
    wear?: number;
    dirt?: number;
    stretch?: number;
    lastPlayedAt?: number;
  }) =>
    call<void>('patch_tape_state', {
      id: patch.id,
      currentSide: patch.currentSide ?? null,
      reelPosition: patch.reelPosition ?? null,
      playCount: patch.playCount ?? null,
      wear: patch.wear ?? null,
      dirt: patch.dirt ?? null,
      stretch: patch.stretch ?? null,
      lastPlayedAt: patch.lastPlayedAt ?? null,
    }),
  setTrackDurations: (id: string, durations: [string, number][]) =>
    call<void>('set_track_durations', { id, durations }),
  deleteTape: (id: string) => call<Library>('delete_tape', { id }),
  reorderTapes: (ids: string[]) => call<Library>('reorder_tapes', { ids }),
  revealTapeFolder: (id: string) => call<void>('reveal_tape_folder', { id }),

  updateSettings: (settings: Settings) =>
    call<Settings>('update_settings', { settings }),
  setSkin: (skinId: string, finish?: number) =>
    call<Settings>('set_skin', { skinId, finish: finish ?? null }),

  importLibrary: (path: string) =>
    call<ImportReport>('import_library', { path }),
  importAudioFiles: (paths: string[]) =>
    call<FileImportReport>('import_audio_files', { paths }),
  exportLibrary: (destination: string) =>
    call<string>('export_library', { destination }),

  setWindowTheme: (theme: string) =>
    call<void>('set_window_theme', { theme }),

  readAudioBytes: (path: string) =>
    call<ArrayBuffer>('read_audio_bytes', { path }),
};

/** Turn an absolute Windows path into something an <audio> tag can load. */
export function mediaUrl(path: string): string {
  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
