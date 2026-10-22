//! Tauri commands — the whole IPC surface of KASSETE.

use crate::store::{self, Library, ScanPath, Settings, Tape};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    pub library: Mutex<Library>,
}

#[derive(Debug, Serialize)]
pub struct ScanReport {
    pub tapes: usize,
    pub tracks: usize,
    pub skipped_paths: usize,
    pub duration_ms: u128,
}

#[derive(Debug, Serialize)]
pub struct ImportReport {
    pub tapes_added: usize,
    pub tapes_merged: usize,
    pub tracks: usize,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub library_path: String,
}

fn lock<'a>(state: &'a State<'_, AppState>) -> Result<std::sync::MutexGuard<'a, Library>, String> {
    state
        .library
        .lock()
        .map_err(|_| "The library lock was poisoned. Restart Foldman.".to_string())
}

fn persist(app: &AppHandle, lib: &Library) -> Result<(), String> {
    store::save(app, lib)
}

// ---------------------------------------------------------------- library ---

#[tauri::command]
pub fn get_library(state: State<'_, AppState>) -> Result<Library, String> {
    Ok(lock(&state)?.clone())
}

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<'_, AppState>) -> Result<AppInfo, String> {
    let _guard = lock(&state)?;
    Ok(AppInfo {
        name: "KASSETE".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        library_path: store::library_path(&app).to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn scan_library(app: AppHandle, state: State<'_, AppState>) -> Result<ScanReport, String> {
    let started = std::time::Instant::now();
    let mut lib = lock(&state)?;

    if lib.scan_paths.is_empty() {
        return Ok(ScanReport {
            tapes: lib.tapes.len(),
            tracks: lib.tapes.iter().map(|t| t.tracks.len()).sum(),
            skipped_paths: 0,
            duration_ms: 0,
        });
    }

    let outcome = crate::scanner::scan(&lib.scan_paths);
    let stamp = now();

    // Keep any per-tape state the user has built up (labels, wear, skin,
    // hidden flag) and graft the freshly scanned track list onto it.
    let mut merged: Vec<Tape> = Vec::with_capacity(outcome.tapes.len());
    for mut fresh in outcome.tapes {
        if let Some(existing) = lib.tapes.iter().find(|t| t.id == fresh.id) {
            fresh.reel_position = existing.reel_position;
            fresh.wear = existing.wear;
            fresh.dirt = existing.dirt;
            fresh.stretch = existing.stretch;
            fresh.play_count = existing.play_count;
            fresh.last_played_at = existing.last_played_at;
            fresh.label_artist = existing.label_artist.clone();
            fresh.label_album = existing.label_album.clone();
            fresh.label_style = existing.label_style.clone();
            fresh.label_color = existing.label_color.clone();
            fresh.shell = existing.shell.clone();
            fresh.case_color = existing.case_color.clone();
            fresh.skin_id = existing.skin_id.clone();
            fresh.finish = existing.finish;
            fresh.rack_order = existing.rack_order;
            fresh.hidden = existing.hidden;
            fresh.favorite = existing.favorite;
            fresh.created_at = existing.created_at;
            fresh.current_side = existing.current_side.clone();
            if fresh.cover_path.is_none() {
                fresh.cover_path = existing.cover_path.clone();
                fresh.cover_source = existing.cover_source.clone();
            }
        }
        fresh.updated_at = stamp;
        merged.push(fresh);
    }

    merged.sort_by(|a, b| a.rack_order.cmp(&b.rack_order));
    // Anything brand new lands at the end of the rack.
    let mut next_order = merged.iter().map(|t| t.rack_order).max().unwrap_or(0);
    let known: std::collections::HashSet<String> =
        lib.tapes.iter().map(|t| t.id.clone()).collect();
    for tape in merged.iter_mut() {
        if !known.contains(&tape.id) {
            next_order += 1;
            tape.rack_order = next_order;
        }
    }
    merged.sort_by(|a, b| a.rack_order.cmp(&b.rack_order));

    lib.tapes = merged;
    for path in lib.scan_paths.iter_mut() {
        path.last_scanned_at = Some(stamp);
    }
    lib.updated_at = stamp;
    let report = ScanReport {
        tapes: lib.tapes.len(),
        tracks: lib.tapes.iter().map(|t| t.tracks.len()).sum(),
        skipped_paths: outcome.skipped_dirs,
        duration_ms: started.elapsed().as_millis(),
    };
    persist(&app, &lib)?;
    Ok(report)
}

#[tauri::command]
pub fn add_scan_path(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    recursive: Option<bool>,
) -> Result<Library, String> {
    let mut lib = lock(&state)?;
    let trimmed = path.trim().to_string();
    if trimmed.is_empty() {
        return Err("That folder path is empty.".into());
    }
    if !Path::new(&trimmed).exists() {
        return Err(format!("That folder does not exist:\n{trimmed}"));
    }
    if let Some(existing) = lib.scan_paths.iter_mut().find(|p| p.path == trimmed) {
        existing.enabled = true;
        if let Some(rec) = recursive {
            existing.recursive = rec;
        }
    } else {
        lib.scan_paths.push(ScanPath {
            path: trimmed,
            recursive: recursive.unwrap_or(true),
            enabled: true,
            last_scanned_at: None,
        });
    }
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(lib.clone())
}

#[tauri::command]
pub fn remove_scan_path(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<Library, String> {
    let mut lib = lock(&state)?;
    lib.scan_paths.retain(|p| p.path != path);
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(lib.clone())
}

#[tauri::command]
pub fn set_scan_path_enabled(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    enabled: bool,
) -> Result<Library, String> {
    let mut lib = lock(&state)?;
    if let Some(entry) = lib.scan_paths.iter_mut().find(|p| p.path == path) {
        entry.enabled = enabled;
    }
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(lib.clone())
}

// ----------------------------------------------------------------- tapes ---

#[tauri::command]
pub fn update_tape(app: AppHandle, state: State<'_, AppState>, tape: Tape) -> Result<Tape, String> {
    let mut lib = lock(&state)?;
    let index = lib
        .tapes
        .iter()
        .position(|t| t.id == tape.id)
        .ok_or_else(|| "That tape is no longer in the rack.".to_string())?;
    let mut next = tape;
    next.updated_at = now();
    next.reel_position = next.reel_position.clamp(0.0, 1.0);
    next.wear = next.wear.clamp(0.0, 1.0);
    next.dirt = next.dirt.clamp(0.0, 1.0);
    next.stretch = next.stretch.clamp(0.0, 1.0);
    if next.current_side != "B" {
        next.current_side = "A".into();
    }
    lib.tapes[index] = next.clone();
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(next)
}

/// Cheap partial update used while the deck is running, so we are not shipping
/// a whole tape (and its track list) across the IPC bridge every few seconds.
#[tauri::command]
pub fn patch_tape_state(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    current_side: Option<String>,
    reel_position: Option<f64>,
    play_count: Option<u32>,
    wear: Option<f64>,
    dirt: Option<f64>,
    stretch: Option<f64>,
    last_played_at: Option<i64>,
) -> Result<(), String> {
    let mut lib = lock(&state)?;
    let Some(tape) = lib.tapes.iter_mut().find(|t| t.id == id) else {
        return Ok(());
    };
    if let Some(side) = current_side {
        tape.current_side = if side == "B" { "B".into() } else { "A".into() };
    }
    if let Some(pos) = reel_position {
        tape.reel_position = pos.clamp(0.0, 1.0);
    }
    if let Some(count) = play_count {
        tape.play_count = count;
    }
    if let Some(value) = wear {
        tape.wear = value.clamp(0.0, 1.0);
    }
    if let Some(value) = dirt {
        tape.dirt = value.clamp(0.0, 1.0);
    }
    if let Some(value) = stretch {
        tape.stretch = value.clamp(0.0, 1.0);
    }
    if let Some(stamp) = last_played_at {
        tape.last_played_at = Some(stamp);
    }
    tape.updated_at = now();
    lib.updated_at = now();
    persist(&app, &lib)
}

#[tauri::command]
pub fn set_track_durations(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    durations: Vec<(String, u64)>,
) -> Result<(), String> {
    let mut lib = lock(&state)?;
    let Some(tape) = lib.tapes.iter_mut().find(|t| t.id == id) else {
        return Ok(());
    };
    let mut changed = false;
    for (track_id, ms) in durations {
        if let Some(track) = tape.tracks.iter_mut().find(|t| t.id == track_id) {
            if track.duration_ms != ms {
                track.duration_ms = ms;
                changed = true;
            }
        }
    }
    if changed {
        tape.updated_at = now();
        lib.updated_at = now();
        persist(&app, &lib)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_tape(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<Library, String> {
    let mut lib = lock(&state)?;
    lib.tapes.retain(|t| t.id != id);
    for (index, tape) in lib.tapes.iter_mut().enumerate() {
        tape.rack_order = index as i64 + 1;
    }
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(lib.clone())
}

#[tauri::command]
pub fn reorder_tapes(
    app: AppHandle,
    state: State<'_, AppState>,
    ids: Vec<String>,
) -> Result<Library, String> {
    let mut lib = lock(&state)?;
    for (index, id) in ids.iter().enumerate() {
        if let Some(tape) = lib.tapes.iter_mut().find(|t| &t.id == id) {
            tape.rack_order = index as i64 + 1;
        }
    }
    lib.tapes.sort_by(|a, b| a.rack_order.cmp(&b.rack_order));
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(lib.clone())
}

#[tauri::command]
pub fn reveal_tape_folder(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let lib = lock(&state)?;
    let tape = lib
        .tapes
        .iter()
        .find(|t| t.id == id)
        .ok_or_else(|| "That tape is no longer in the rack.".to_string())?;
    let folder = tape.folder.clone();
    drop(lib);
    let _ = &app;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Could not open that folder: {e}"))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&folder)
            .spawn()
            .map_err(|e| format!("Could not open that folder: {e}"))?;
    }
    Ok(())
}

// -------------------------------------------------------------- settings ---

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<Settings, String> {
    let mut lib = lock(&state)?;
    let mut next = settings;
    next.volume = next.volume.clamp(0.0, 1.0);
    if next.hinge_breakpoint < 320 {
        next.hinge_breakpoint = 320;
    }
    if next.mode_lock.is_empty() {
        next.mode_lock = "auto".into();
    }
    lib.settings = next.clone();
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(next)
}

#[tauri::command]
pub fn set_skin(
    app: AppHandle,
    state: State<'_, AppState>,
    skin_id: String,
    finish: Option<u32>,
) -> Result<Settings, String> {
    let mut lib = lock(&state)?;
    lib.settings.current_skin = skin_id;
    if let Some(value) = finish {
        lib.settings.current_finish = value;
    }
    let settings = lib.settings.clone();
    lib.updated_at = now();
    persist(&app, &lib)?;
    Ok(settings)
}

// ------------------------------------------------------------ audio bytes ---

/// Fallback path for playback: hand the raw file to the WebView when the asset
/// protocol is unavailable. Bypasses JSON entirely via a raw IPC response.
#[tauri::command]
pub fn read_audio_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    let file = Path::new(&path);
    if !file.is_file() {
        return Err(format!("File not found:\n{path}"));
    }
    let bytes = std::fs::read(file).map_err(|e| format!("Could not read {path}: {e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub fn read_image_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    let file = Path::new(&path);
    if !file.is_file() {
        return Err(format!("File not found:\n{path}"));
    }
    let bytes = std::fs::read(file).map_err(|e| format!("Could not read {path}: {e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

// ---------------------------------------------------------------- import ---

/// Import either a Foldman PC export or an Android Foldman export folder.
#[tauri::command]
pub fn import_library(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<ImportReport, String> {
    let target = Path::new(&path);
    if !target.exists() {
        return Err(format!("Nothing at that path:\n{path}"));
    }

    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    if target.is_dir() {
        for entry in std::fs::read_dir(target).map_err(|e| e.to_string())?.flatten() {
            let candidate = entry.path();
            if candidate.extension().and_then(|e| e.to_str()) == Some("json") {
                candidates.push(candidate);
            }
        }
    } else {
        candidates.push(target.to_path_buf());
    }

    if candidates.is_empty() {
        return Err("No Foldman JSON files were found in that folder.".into());
    }

    let mut incoming: Vec<Tape> = Vec::new();
    let mut notes: Vec<String> = Vec::new();

    for file in candidates {
        let text = match std::fs::read_to_string(&file) {
            Ok(text) => text,
            Err(_) => continue,
        };
        let value: serde_json::Value = match serde_json::from_str(&text) {
            Ok(value) => value,
            Err(_) => continue,
        };

        // Native Foldman PC export.
        if let Ok(parsed) = serde_json::from_value::<Library>(value.clone()) {
            if !parsed.tapes.is_empty() {
                notes.push(format!(
                    "{}: {} tapes",
                    file.file_name().and_then(|n| n.to_str()).unwrap_or("export"),
                    parsed.tapes.len()
                ));
                incoming.extend(parsed.tapes);
                continue;
            }
        }

        // Any array of tape-shaped objects.
        let array = if let Some(array) = value.as_array() {
            array.clone()
        } else if let Some(array) = value.get("tapes").and_then(|v| v.as_array()) {
            array.clone()
        } else if let Some(array) = value.get("albums").and_then(|v| v.as_array()) {
            array.clone()
        } else {
            Vec::new()
        };

        for item in array {
            if let Ok(mut tape) = serde_json::from_value::<Tape>(item.clone()) {
                if tape.id.is_empty() {
                    tape.id = format!("tape-{:x}", store::stable_hash(&tape.folder));
                }
                if tape.id.is_empty() && tape.album.is_empty() {
                    continue;
                }
                incoming.push(tape);
            }
        }
    }

    if incoming.is_empty() {
        return Err(
            "Nothing recognisable in that export. Point Foldman at the folder that holds \
             foldman-index-base.json, or at a Foldman PC library export."
                .into(),
        );
    }

    let mut lib = lock(&state)?;
    let mut added = 0usize;
    let mut merged = 0usize;
    let mut tracks = 0usize;
    let mut next_order = lib.tapes.iter().map(|t| t.rack_order).max().unwrap_or(0);

    for mut tape in incoming {
        if tape.album.is_empty() {
            tape.album = tape
                .folder
                .rsplit(['\\', '/'])
                .next()
                .unwrap_or("Untitled")
                .to_string();
        }
        tracks += tape.tracks.len();
        if let Some(existing) = lib.tapes.iter_mut().find(|t| t.id == tape.id) {
            // Prefer the imported metadata but keep the local file paths when
            // the export came from Android (paths will not exist on disk).
            existing.artist = tape.artist.clone();
            existing.album = tape.album.clone();
            existing.label_artist = tape.label_artist.clone();
            existing.label_album = tape.label_album.clone();
            existing.label_style = tape.label_style.clone();
            existing.label_color = tape.label_color.clone();
            existing.shell = tape.shell.clone();
            existing.case_color = tape.case_color.clone();
            existing.wear = tape.wear;
            existing.dirt = tape.dirt;
            existing.stretch = tape.stretch;
            existing.play_count = tape.play_count;
            existing.hidden = tape.hidden;
            existing.favorite = tape.favorite;
            existing.skin_id = tape.skin_id.clone();
            existing.finish = tape.finish;
            existing.updated_at = now();
            merged += 1;
        } else {
            next_order += 1;
            tape.rack_order = next_order;
            tape.updated_at = now();
            lib.tapes.push(tape);
            added += 1;
        }
    }

    lib.updated_at = now();
    persist(&app, &lib)?;

    Ok(ImportReport {
        tapes_added: added,
        tapes_merged: merged,
        tracks,
        message: if notes.is_empty() {
            format!("Imported {added} tapes, merged {merged}.")
        } else {
            format!("Imported {added} tapes, merged {merged}. {}", notes.join("; "))
        },
    })
}

#[tauri::command]
pub fn export_library(
    app: AppHandle,
    state: State<'_, AppState>,
    destination: String,
) -> Result<String, String> {
    let lib = lock(&state)?;
    let text = serde_json::to_string_pretty(&*lib).map_err(|e| e.to_string())?;
    let target = Path::new(&destination);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(target, text).map_err(|e| format!("Could not write that file: {e}"))?;
    Ok(destination)
}

// ------------------------------------------------------------- file import ---

#[derive(Debug, Serialize)]
pub struct FileImportReport {
    /// Ids of the tapes that were added, in the order they were picked.
    pub added: Vec<String>,
    /// Files that were already in the rack, or that Foldman cannot decode.
    pub skipped: usize,
    pub library: Library,
    pub message: String,
}

/// Turn hand-picked audio/video files into one tape each.
///
/// This is the "reskin this MP3 as a cassette" path: no folder has to be
/// registered, nothing is copied, and the tape appears at the end of the rack.
#[tauri::command]
pub fn import_audio_files(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<FileImportReport, String> {
    let mut lib = lock(&state)?;
    let stamp = now();

    let mut added: Vec<String> = Vec::new();
    let mut skipped = 0usize;
    let mut next_order = lib.tapes.iter().map(|t| t.rack_order).max().unwrap_or(0);

    for raw in paths {
        let trimmed = raw.trim().trim_matches('"');
        if trimmed.is_empty() {
            skipped += 1;
            continue;
        }
        let path = std::path::PathBuf::from(trimmed);

        let Some(mut tape) = crate::importer::tape_from_file(&path) else {
            skipped += 1;
            continue;
        };

        // Already in the rack — either as its own tape or as part of an album
        // that was scanned earlier.
        let known = lib.tapes.iter().any(|t| {
            t.id == tape.id || t.tracks.iter().any(|track| track.path == tape.tracks[0].path)
        });
        if known {
            skipped += 1;
            continue;
        }

        next_order += 1;
        tape.rack_order = next_order;
        tape.created_at = stamp;
        tape.updated_at = stamp;
        added.push(tape.id.clone());
        lib.tapes.push(tape);
    }

    lib.updated_at = stamp;
    if !added.is_empty() {
        persist(&app, &lib)?;
    }

    let message = match (added.len(), skipped) {
        (0, _) => "Nothing new to add — those files are already in the rack.".to_string(),
        (1, 0) => "One tape added to the rack.".to_string(),
        (n, 0) => format!("{n} tapes added to the rack."),
        (n, s) => format!("{n} tapes added, {s} skipped."),
    };

    Ok(FileImportReport {
        added,
        skipped,
        library: lib.clone(),
        message,
    })
}

#[tauri::command]
pub fn set_window_theme(app: AppHandle, theme: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let mode = match theme.as_str() {
            "dark" => tauri::Theme::Dark,
            "light" => tauri::Theme::Light,
            _ => tauri::Theme::Light,
        };
        let _ = window.set_theme(Some(mode));
    }
    Ok(())
}

fn now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
