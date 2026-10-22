//! System tray: quick transport controls without opening the window.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

const TRAY_ID: &str = "kassete-tray";

fn emit(app: &AppHandle, event: &str) {
    let _ = app.emit(event, ());
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Build a fresh menu. Rebuilding is cheap and is the only portable way to
/// change the disabled "now playing" label after the tray already exists.
fn build_menu(app: &AppHandle, now_playing: &str) -> tauri::Result<Menu<tauri::Wry>> {
    let header = MenuItem::with_id(
        app,
        "now-playing",
        if now_playing.is_empty() {
            "Nothing in the deck"
        } else {
            now_playing
        },
        false,
        None::<&str>,
    )?;
    let sep_one = PredefinedMenuItem::separator(app)?;
    let play_pause = MenuItem::with_id(app, "play-pause", "Play / Pause", true, None::<&str>)?;
    let prev = MenuItem::with_id(app, "prev-track", "Previous Track", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next-track", "Next Track", true, None::<&str>)?;
    let flip = MenuItem::with_id(app, "flip-side", "Flip Tape", true, None::<&str>)?;
    let sep_two = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show", "Open KASSETE", true, None::<&str>)?;
    let rescan = MenuItem::with_id(app, "rescan", "Rescan Music Folders", true, None::<&str>)?;
    let sep_three = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit KASSETE", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &header,
            &sep_one,
            &play_pause,
            &prev,
            &next,
            &flip,
            &sep_two,
            &show,
            &rescan,
            &sep_three,
            &quit,
        ],
    )
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app, "")?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Foldman — cassette player")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_window(app),
            "play-pause" => emit(app, "tray://play-pause"),
            "prev-track" => emit(app, "tray://prev"),
            "next-track" => emit(app, "tray://next"),
            "flip-side" => emit(app, "tray://flip"),
            "rescan" => emit(app, "tray://rescan"),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_window(&tray.app_handle().clone());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

/// Keep the tray's header line in sync with whatever the deck is playing.
pub fn set_now_playing(app: &AppHandle, text: &str) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    if let Ok(menu) = build_menu(app, text) {
        let _ = tray.set_menu(Some(menu));
    }
}
