import { open, save } from '@tauri-apps/plugin-dialog';
import { isTauri } from './api';

/** Native folder picker (the dialog plugin returns a plain path string). */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const result = await open({
    directory: true,
    multiple: false,
    title: 'Choose a music folder',
  });
  return typeof result === 'string' ? result : null;
}

/** Native file picker restricted to the given extensions. */
export async function pickFile(
  filters: { name: string; extensions: string[] }[]
): Promise<string | null> {
  if (!isTauri()) return null;
  const result = await open({ multiple: false, filters, title: 'Choose a file' });
  return typeof result === 'string' ? result : null;
}

/** Everything KASSETE can turn into a tape. */
export const AUDIO_FILE_FILTERS = [
  {
    name: 'Music & video',
    extensions: [
      'mp3',
      'm4a',
      'm4b',
      'aac',
      'flac',
      'ogg',
      'oga',
      'opus',
      'wav',
      'aiff',
      'aif',
      'weba',
      'mp4',
      'm4v',
      'webm',
      'mov',
      'wma',
    ],
  },
  { name: 'All files', extensions: ['*'] },
];

/** Pick one or more audio/video files to turn into tapes. */
export async function pickAudioFiles(): Promise<string[]> {
  if (!isTauri()) return [];
  const result = await open({
    multiple: true,
    directory: false,
    title: 'Add music to the rack',
    filters: AUDIO_FILE_FILTERS,
  });
  if (Array.isArray(result)) return result;
  return typeof result === 'string' ? [result] : [];
}

/** Native save dialog. Returns the chosen path, or null if cancelled. */
export async function pickSavePath(defaultName: string): Promise<string | null> {
  if (!isTauri()) return null;
  const result = await save({
    defaultPath: defaultName,
    filters: [{ name: 'KASSETE library', extensions: ['json'] }],
    title: 'Export the KASSETE library',
  });
  return typeof result === 'string' ? result : null;
}
