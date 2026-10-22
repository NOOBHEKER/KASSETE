//! Folder scanner.
//!
//! Walks the user's music folders and turns every folder that contains audio
//! files into a "tape" (Foldman's word for an album). Metadata comes from the
//! folder/filename layout, which is exactly how a real cassette collection is
//! organised anyway — no heavyweight tag parser, no external binaries.

use crate::store::{is_audio_file, stable_hash, ScanPath, Tape, Track};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct ScanOutcome {
    pub tapes: Vec<Tape>,
    pub skipped_dirs: usize,
}

/// Image files we will happily use as an album cover / J-card picture.
const COVER_CANDIDATES: &[&str] = &[
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "folder.jpg",
    "folder.jpeg",
    "folder.png",
    "front.jpg",
    "front.jpeg",
    "front.png",
    "album.jpg",
    "albumart.jpg",
    "artwork.jpg",
];

pub(crate) fn clean(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut last_space = false;
    for ch in text.chars() {
        let c = if ch == '_' || ch == '\u{00a0}' { ' ' } else { ch };
        if c.is_whitespace() {
            if !last_space {
                out.push(' ');
                last_space = true;
            }
        } else {
            out.push(c);
            last_space = false;
        }
    }
    out.trim().to_string()
}

/// "01 - Nightfall" -> "Nightfall",  "03. Amber" -> "Amber"
pub(crate) fn strip_track_number(stem: &str) -> (Option<u32>, String) {
    let trimmed = stem.trim_start();
    let digits: String = trimmed.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() || digits.len() > 3 {
        return (None, clean(stem));
    }
    let rest = &trimmed[digits.len()..];
    let rest = rest.trim_start_matches([' ', '.', '-', '_', ')', ']']);
    if rest.is_empty() {
        return (None, clean(stem));
    }
    let number = digits.parse::<u32>().ok();
    (number, clean(rest))
}

/// Split "Artist - Album" into its two halves.
pub(crate) fn split_artist_album(name: &str) -> Option<(String, String)> {
    let cleaned = clean(name);
    let separators = [" - ", " – ", " — "];
    for sep in separators {
        if let Some(idx) = cleaned.find(sep) {
            let artist = cleaned[..idx].trim();
            let album = cleaned[idx + sep.len()..].trim();
            if !artist.is_empty() && !album.is_empty() {
                return Some((artist.to_string(), album.to_string()));
            }
        }
    }
    None
}

fn looks_like_disc_folder(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    let trimmed = lower.trim();
    for prefix in ["cd", "disc", "disk", "dvd", "vol", "volume"] {
        if let Some(rest) = trimmed.strip_prefix(prefix) {
            let rest = rest.trim_start_matches([' ', '-', '_', '.']);
            if !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit()) {
                return true;
            }
        }
    }
    trimmed.len() <= 3 && trimmed.chars().all(|c| c.is_ascii_digit())
}

pub(crate) fn find_cover(dir: &Path) -> Option<PathBuf> {
    for candidate in COVER_CANDIDATES {
        let path = dir.join(candidate);
        if path.is_file() {
            return Some(path);
        }
    }
    // Fall back to any single image sitting in the folder.
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext = ext.to_ascii_lowercase();
                if matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp") {
                    return Some(path);
                }
            }
        }
    }
    None
}

fn build_tape(dir: &Path, files: Vec<PathBuf>, order: i64) -> Option<Tape> {
    if files.is_empty() {
        return None;
    }

    let mut tracks: Vec<Track> = Vec::with_capacity(files.len());

    for file in files {
        let stem = file
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled");
        let (track_no, title) = strip_track_number(stem);
        let title = if title.is_empty() {
            clean(stem)
        } else {
            title
        };
        tracks.push(Track {
            id: format!("trk-{:x}", stable_hash(&file.to_string_lossy())),
            path: file.to_string_lossy().to_string(),
            title,
            track_no: track_no.unwrap_or(0),
            duration_ms: 0,
            ..Default::default()
        });
    }

    // Natural order: numeric prefixes first, then alphabetical.
    tracks.sort_by(|a, b| {
        let an = if a.track_no == 0 { u32::MAX } else { a.track_no };
        let bn = if b.track_no == 0 { u32::MAX } else { b.track_no };
        an.cmp(&bn)
            .then_with(|| a.title.to_lowercase().cmp(&b.title.to_lowercase()))
    });

    // Work out artist / album from the folder tree.
    let album_dir = dir.to_path_buf();
    let folder_name = album_dir
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();

    let mut album = clean(&folder_name);
    let mut artist = String::new();

    if let Some((a, b)) = split_artist_album(&folder_name) {
        artist = a;
        album = b;
    }

    if artist.is_empty() {
        if looks_like_disc_folder(&folder_name) {
            // Multi-disc release: the album folder is one level up.
            if let Some(parent) = album_dir.parent() {
                let parent_name = parent
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string();
                if !parent_name.is_empty() {
                    if let Some((a, b)) = split_artist_album(&parent_name) {
                        artist = a;
                        album = b;
                    } else {
                        album = clean(&parent_name);
                    }
                }
            }
        }
        if artist.is_empty() {
            if let Some(grandparent) = album_dir.parent().and_then(|p| p.file_name()) {
                let name = grandparent.to_string_lossy().to_string();
                if !name.is_empty() && clean(&name) != album {
                    artist = clean(&name);
                }
            }
        }
    }

    if artist.is_empty() {
        artist = "Unknown Artist".to_string();
    }
    if album.is_empty() {
        album = "Untitled".to_string();
    }

    // Sides: split the running order down the middle, the way an album gets
    // divided across a C60's two sides.
    let total = tracks.len();
    let side_a_count = (total + 1) / 2;
    let mut side_a_index = 0u32;
    let mut side_b_index = 0u32;
    for (index, track) in tracks.iter_mut().enumerate() {
        track.artist = artist.clone();
        track.album = album.clone();
        if index < side_a_count {
            track.side = "A".to_string();
            side_a_index += 1;
            track.side_index = side_a_index;
        } else {
            track.side = "B".to_string();
            side_b_index += 1;
            track.side_index = side_b_index;
        }
    }

    let cover = find_cover(&album_dir);
    let folder_string = album_dir.to_string_lossy().to_string();

    Some(Tape {
        id: format!("tape-{:x}", stable_hash(&folder_string)),
        folder: folder_string,
        artist,
        album,
        cover_source: if cover.is_some() { "file".into() } else { "none".into() },
        cover_path: cover.map(|p| p.to_string_lossy().to_string()),
        tracks,
        rack_order: order,
        ..Default::default()
    })
}

pub fn scan(paths: &[ScanPath]) -> ScanOutcome {
    let mut buckets: BTreeMap<PathBuf, Vec<PathBuf>> = BTreeMap::new();
    let mut skipped = 0usize;
    let mut seen: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();

    for root in paths.iter().filter(|p| p.enabled) {
        let root_path = PathBuf::from(&root.path);
        if !root_path.exists() {
            skipped += 1;
            continue;
        }
        let walker = if root.recursive {
            WalkDir::new(&root_path).follow_links(false)
        } else {
            WalkDir::new(&root_path)
                .max_depth(1)
                .follow_links(false)
        };

        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.into_path();
            if !is_audio_file(&path) {
                continue;
            }
            // Guard against the same file being reached through two roots.
            if !seen.insert(path.clone()) {
                continue;
            }
            if let Some(parent) = path.parent() {
                buckets
                    .entry(parent.to_path_buf())
                    .or_default()
                    .push(path);
            }
        }
    }

    let mut tapes = Vec::new();
    let mut order = 0i64;
    for (dir, files) in buckets {
        if let Some(tape) = build_tape(&dir, files, {
            order += 1;
            order
        }) {
            tapes.push(tape);
        }
    }

    tapes.sort_by(|a, b| {
        a.artist
            .to_lowercase()
            .cmp(&b.artist.to_lowercase())
            .then_with(|| a.album.to_lowercase().cmp(&b.album.to_lowercase()))
    });
    for (index, tape) in tapes.iter_mut().enumerate() {
        tape.rack_order = index as i64 + 1;
    }

    ScanOutcome {
        tapes,
        skipped_dirs: skipped,
    }
}
