//! Single-file importer.
//!
//! The scanner turns *folders* into tapes. This turns one hand-picked file into
//! a tape of its own, so a stray MP3 — or an MP4 of a concert — can be dropped
//! into the rack without tidying it into an album folder first.

use crate::scanner::{clean, find_cover, split_artist_album, strip_track_number};
use crate::store::{is_audio_file, stable_hash, Tape, Track};
use std::path::Path;

/// Folder names that describe a place, not an artist.
const GENERIC_FOLDERS: &[&str] = &[
    "music",
    "musique",
    "musik",
    "audio",
    "songs",
    "singles",
    "downloads",
    "desktop",
    "documents",
    "videos",
    "movies",
    "media",
    "albums",
    "tracks",
    "mixes",
    "cassettes",
    "new folder",
    "temp",
    "tmp",
];

fn artist_from_folder(dir: &Path) -> String {
    let name = dir.file_name().and_then(|s| s.to_str()).unwrap_or("");
    let cleaned = clean(name);
    if cleaned.is_empty() || GENERIC_FOLDERS.contains(&cleaned.to_ascii_lowercase().as_str()) {
        return "Singles".to_string();
    }
    cleaned
}

/// Build a one-track tape around a single audio or video file.
pub fn tape_from_file(path: &Path) -> Option<Tape> {
    if !path.is_file() || !is_audio_file(path) {
        return None;
    }

    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled");
    let (track_no, stripped) = strip_track_number(stem);
    let title = if stripped.is_empty() {
        clean(stem)
    } else {
        stripped
    };

    // "Artist - Title" in the filename beats anything the folder can tell us.
    let mut artist = String::new();
    let mut album = title.clone();
    if let Some((a, b)) = split_artist_album(stem) {
        artist = a;
        album = b;
    }

    let dir = path.parent().map(Path::to_path_buf).unwrap_or_default();
    if artist.is_empty() {
        artist = artist_from_folder(&dir);
    }
    if album.is_empty() {
        album = title;
    }

    let folder = dir.to_string_lossy().to_string();
    let cover = find_cover(&dir);
    let file_key = path.to_string_lossy().to_string();

    let track = Track {
        id: format!("trk-{:x}", stable_hash(&file_key)),
        path: file_key.clone(),
        title: album.clone(),
        artist: artist.clone(),
        album: album.clone(),
        track_no: track_no.unwrap_or(1),
        disc_no: 1,
        duration_ms: 0,
        side: "A".to_string(),
        side_index: 1,
    };

    Some(Tape {
        // Prefixing the key keeps file-tapes from ever colliding with the
        // folder-tapes the scanner produces.
        id: format!("tape-{:x}", stable_hash(&format!("file:{file_key}"))),
        folder,
        artist,
        album,
        cover_source: if cover.is_some() {
            "file".to_string()
        } else {
            "none".to_string()
        },
        cover_path: cover.map(|p| p.to_string_lossy().to_string()),
        tracks: vec![track],
        ..Default::default()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_single_file_becomes_a_one_track_tape() {
        let dir = std::env::temp_dir().join("foldman-import-test");
        let _ = std::fs::create_dir_all(&dir);
        let file = dir.join("Daft Punk - One More Time.mp3");
        std::fs::write(&file, b"not really audio").unwrap();

        let tape = tape_from_file(&file).expect("a tape");
        assert_eq!(tape.artist, "Daft Punk");
        assert_eq!(tape.album, "One More Time");
        assert_eq!(tape.tracks.len(), 1);
        assert_eq!(tape.tracks[0].side, "A");
        assert_eq!(tape.tracks[0].side_index, 1);
        assert!(tape.id.starts_with("tape-"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn video_containers_are_tapes_too() {
        let dir = std::env::temp_dir().join("foldman-import-test-video");
        let _ = std::fs::create_dir_all(&dir);
        let file = dir.join("03. Basement Session.mp4");
        std::fs::write(&file, b"not really video").unwrap();

        let tape = tape_from_file(&file).expect("a tape");
        assert_eq!(tape.album, "Basement Session");
        assert_eq!(tape.tracks[0].track_no, 3);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn non_audio_files_are_rejected() {
        let dir = std::env::temp_dir().join("foldman-import-test-txt");
        let _ = std::fs::create_dir_all(&dir);
        let file = dir.join("notes.txt");
        std::fs::write(&file, b"hello").unwrap();
        assert!(tape_from_file(&file).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
