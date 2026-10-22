//! Persistent library store.
//!
//! Foldman keeps its whole world in one small JSON document inside the app
//! config directory. The library is loaded once at startup into memory and
//! written back atomically (tmp file + rename) so a crash mid-write can never
//! corrupt a user's collection.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Audio containers WebView2 can decode natively. MP4/M4V/WebM are in the list
/// because a video file with music in it is still a tape as far as Foldman cares.
pub const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "m4a", "m4b", "aac", "flac", "ogg", "oga", "opus", "wav", "aiff", "aif", "weba", "mp4",
    "m4v", "webm", "mov", "wma",
];

pub fn is_audio_file(path: &std::path::Path) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => {
            let ext = ext.to_ascii_lowercase();
            AUDIO_EXTENSIONS.contains(&ext.as_str())
        }
        None => false,
    }
}

fn now_ts() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Track {
    pub id: String,
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track_no: u32,
    pub disc_no: u32,
    pub duration_ms: u64,
    /// "A" or "B"
    pub side: String,
    /// 1-based position within the side
    pub side_index: u32,
}

impl Default for Track {
    fn default() -> Self {
        Self {
            id: String::new(),
            path: String::new(),
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            track_no: 0,
            disc_no: 1,
            duration_ms: 0,
            side: "A".into(),
            side_index: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Tape {
    pub id: String,
    pub folder: String,
    pub artist: String,
    pub album: String,
    pub year: String,
    pub cover_path: Option<String>,
    /// none | embedded | file | itunes | musicbrainz | gallery
    pub cover_source: String,
    pub tracks: Vec<Track>,
    /// "A" | "B"
    pub current_side: String,
    /// 0.0 = start of side A, 1.0 = end of side B
    pub reel_position: f64,
    pub wear: f64,
    pub dirt: f64,
    pub stretch: f64,
    pub play_count: u32,
    pub last_played_at: Option<i64>,
    pub label_artist: Option<String>,
    pub label_album: Option<String>,
    /// typewriter | handwriting | thai | marker
    pub label_style: String,
    pub label_color: String,
    /// A = cream, B = smoked, C = frosted, D = clear, E = black
    pub shell: String,
    pub case_color: String,
    pub skin_id: String,
    pub finish: u32,
    pub rack_order: i64,
    pub hidden: bool,
    pub favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Default for Tape {
    fn default() -> Self {
        let stamp = now_ts();
        Self {
            id: String::new(),
            folder: String::new(),
            artist: "Unknown Artist".into(),
            album: "Untitled".into(),
            year: String::new(),
            cover_path: None,
            cover_source: "none".into(),
            tracks: Vec::new(),
            current_side: "A".into(),
            reel_position: 0.0,
            wear: 0.0,
            dirt: 0.0,
            stretch: 0.0,
            play_count: 0,
            last_played_at: None,
            label_artist: None,
            label_album: None,
            label_style: "typewriter".into(),
            label_color: "#24303a".into(),
            shell: "A".into(),
            case_color: "#2d2d2d".into(),
            skin_id: "fm8-classic".into(),
            finish: 0,
            rack_order: 0,
            hidden: false,
            favorite: false,
            created_at: stamp,
            updated_at: stamp,
        }
    }
}

impl Tape {
    pub fn side_tracks(&self, side: &str) -> Vec<&Track> {
        let mut list: Vec<&Track> = self.tracks.iter().filter(|t| t.side == side).collect();
        list.sort_by_key(|t| t.side_index);
        list
    }

    pub fn side_duration_ms(&self, side: &str) -> u64 {
        self.side_tracks(side).iter().map(|t| t.duration_ms).sum()
    }

    pub fn total_duration_ms(&self) -> u64 {
        self.tracks.iter().map(|t| t.duration_ms).sum()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ScanPath {
    pub path: String,
    pub recursive: bool,
    pub enabled: bool,
    pub last_scanned_at: Option<i64>,
}

impl Default for ScanPath {
    fn default() -> Self {
        Self {
            path: String::new(),
            recursive: true,
            enabled: true,
            last_scanned_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub hinge_breakpoint: u32,
    pub auto_reverse: bool,
    pub tape_wear_enabled: bool,
    pub tape_stretch_enabled: bool,
    pub key_sounds: bool,
    pub volume: f64,
    pub current_skin: String,
    pub current_finish: u32,
    pub show_mini_player: bool,
    /// auto | cover | inner
    pub mode_lock: String,
    pub theme: String,
    pub reduce_motion: bool,
    pub recent: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hinge_breakpoint: 800,
            auto_reverse: true,
            tape_wear_enabled: true,
            tape_stretch_enabled: true,
            key_sounds: false,
            volume: 0.72,
            current_skin: "fm8-classic".into(),
            current_finish: 0,
            show_mini_player: true,
            mode_lock: "auto".into(),
            theme: "auto".into(),
            reduce_motion: false,
            recent: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Library {
    pub version: u32,
    pub tapes: Vec<Tape>,
    pub scan_paths: Vec<ScanPath>,
    pub settings: Settings,
    pub updated_at: i64,
}

impl Default for Library {
    fn default() -> Self {
        Self {
            version: 1,
            tapes: Vec::new(),
            scan_paths: Vec::new(),
            settings: Settings::default(),
            updated_at: now_ts(),
        }
    }
}

impl Library {
    /// Fill in fields that an older/hand-written file may be missing, and
    /// normalise anything that would otherwise break the UI.
    pub fn normalise(&mut self) {
        if self.version == 0 {
            self.version = 1;
        }
        if self.settings.hinge_breakpoint < 320 || self.settings.hinge_breakpoint > 2560 {
            self.settings.hinge_breakpoint = 800;
        }
        self.settings.volume = self.settings.volume.clamp(0.0, 1.0);
        if self.settings.mode_lock.is_empty() {
            self.settings.mode_lock = "auto".into();
        }
        if self.settings.theme.is_empty() {
            self.settings.theme = "auto".into();
        }
        if self.settings.current_skin.is_empty() {
            self.settings.current_skin = "fm8-classic".into();
        }
        let mut order = 0i64;
        for tape in self.tapes.iter_mut() {
            if tape.id.is_empty() {
                tape.id = format!("tape-{:x}", stable_hash(&tape.folder));
            }
            if tape.current_side != "B" {
                tape.current_side = "A".into();
            }
            tape.reel_position = tape.reel_position.clamp(0.0, 1.0);
            tape.wear = tape.wear.clamp(0.0, 1.0);
            tape.dirt = tape.dirt.clamp(0.0, 1.0);
            tape.stretch = tape.stretch.clamp(0.0, 1.0);
            if tape.shell.is_empty() {
                tape.shell = "A".into();
            }
            if tape.label_style.is_empty() {
                tape.label_style = "typewriter".into();
            }
            if tape.skin_id.is_empty() {
                tape.skin_id = "fm8-classic".into();
            }
            if tape.rack_order == 0 {
                order += 1;
                tape.rack_order = order;
            }
        }
        self.tapes.sort_by(|a, b| a.rack_order.cmp(&b.rack_order));
        self.updated_at = now_ts();
    }
}

/// Small deterministic hash used for stable ids derived from a folder path.
pub fn stable_hash(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

pub fn library_path(app: &AppHandle) -> PathBuf {
    let mut dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    dir.push("kassete-library.json");
    dir
}

/// KASSETE was called Foldman until 1.0 — carry the old library over once so
/// nobody loses their labels, shells and play counts to a rename.
fn migrate_legacy(path: &Path) {
    if path.exists() {
        return;
    }
    let Ok(appdata) = std::env::var("APPDATA") else {
        return;
    };
    let legacy = Path::new(&appdata)
        .join("app.foldman.deck")
        .join("foldman-library.json");
    if !legacy.exists() {
        return;
    }
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if fs::copy(&legacy, path).is_ok() {
        eprintln!("kassete: imported the Foldman library into {}", path.display());
    }
}

pub fn load(app: &AppHandle) -> Library {
    let path = library_path(app);
    migrate_legacy(&path);
    if !path.exists() {
        let mut lib = Library::default();
        lib.normalise();
        return lib;
    }
    match fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<Library>(&text) {
            Ok(mut lib) => {
                lib.normalise();
                lib
            }
            Err(err) => {
                // Never lose user data: park the unreadable file next to the
                // real one so it can be recovered by hand.
                let backup = path.with_extension("corrupt.json");
                let _ = fs::copy(&path, &backup);
                eprintln!(
                    "kassete: could not parse library ({err}); backed up to {}",
                    backup.display()
                );
                let mut lib = Library::default();
                lib.normalise();
                lib
            }
        },
        Err(err) => {
            eprintln!("kassete: could not read library ({err}); starting fresh");
            let mut lib = Library::default();
            lib.normalise();
            lib
        }
    }
}

pub fn save(app: &AppHandle, lib: &Library) -> Result<(), String> {
    let path = library_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create config dir: {e}"))?;
    }
    let text = serde_json::to_string_pretty(lib).map_err(|e| format!("serialise library: {e}"))?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, text.as_bytes()).map_err(|e| format!("write temp library: {e}"))?;
    // On Windows a rename over an existing file fails, so drop the old one first.
    if path.exists() {
        let _ = fs::remove_file(&path);
    }
    fs::rename(&tmp, &path).map_err(|e| format!("commit library: {e}"))?;
    Ok(())
}
