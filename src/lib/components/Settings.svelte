<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { SKINS, skinById } from '../skins';
  import { api, isTauri } from '../api';
  import { pickFile, pickSavePath } from '../dialogs';
  import type { AppInfo } from '../types';

  let info = $state<AppInfo | null>(null);
  let working = $state(false);

  $effect(() => {
    if (!isTauri()) return;
    api.appInfo().then((value) => (info = value)).catch(() => {});
  });

  const skin = $derived(skinById(foldman.settings.current_skin));

  async function importLibrary() {
    if (!isTauri()) {
      foldman.toast('Demo mode — importing is disabled');
      return;
    }
    working = true;
    try {
      const path = await pickFile([{ name: 'KASSETE export', extensions: ['json'] }]);
      if (!path) return;
      const report = await api.importLibrary(path);
      foldman.library = await api.getLibrary();
      foldman.toast(report.message);
    } catch (error) {
      foldman.toast(String(error), 'err');
    } finally {
      working = false;
    }
  }

  async function exportLibrary() {
    if (!isTauri()) {
      foldman.toast('Demo mode — exporting is disabled');
      return;
    }
    working = true;
    try {
      const path = await pickSavePath('kassete-library.json');
      if (!path) return;
      await api.exportLibrary(path);
      foldman.toast('Library exported');
    } catch (error) {
      foldman.toast(String(error), 'err');
    } finally {
      working = false;
    }
  }
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet wide" role="dialog" aria-modal="true" aria-label="Settings">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>Settings</h2>
        <p>KASSETE — a cassette player for the desktop</p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body">
      <div class="section">
        <h3>Music folders</h3>
        {#if foldman.library.scan_paths.length}
          {#each foldman.library.scan_paths as entry (entry.path)}
            <div class="path-row">
              <button
                class="switch"
                class:on={entry.enabled}
                onclick={() => {
                  entry.enabled = !entry.enabled;
                  void api
                    .setScanPathEnabled(entry.path, entry.enabled)
                    .then((lib) => (foldman.library = lib))
                    .catch((error) => foldman.toast(String(error), 'err'));
                }}
                title={entry.enabled ? 'Disable this folder' : 'Enable this folder'}
                aria-label="Toggle folder"
              ></button>
              <span class="p" title={entry.path}>{entry.path}</span>
              <button
                class="icon-btn tiny"
                onclick={() => void foldman.removeFolder(entry.path)}
                title="Remove from the scan list"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          {/each}
        {:else}
          <p class="hint">No folders yet. Add the folder that holds your albums — every sub-folder becomes a tape.</p>
        {/if}

        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn small primary" onclick={() => void foldman.pickAndAddFolder()}>
            <Icon name="plus" size={14} />
            Add folder
          </button>
          <button class="btn small" onclick={() => void foldman.pickAndImportFiles()} disabled={foldman.busy}>
            <Icon name="tape" size={14} />
            Add a song or video…
          </button>
          <button class="btn small" onclick={() => void foldman.rescan()} disabled={foldman.busy}>
            <Icon name="refresh" size={14} />
            {foldman.busy ? 'Scanning…' : 'Rescan now'}
          </button>
        </div>
        <p class="hint" style="margin-top:8px">
          Supported files: MP3, M4A, AAC, FLAC, OGG, Opus, WAV, AIFF — plus MP4, M4V, WebM and MOV,
          because a video file with music in it is still a tape. Adding a single file turns it into a
          one-song cassette of its own, straight onto the deck. Nothing is copied or uploaded —
          KASSETE reads the files where they live.
        </p>
      </div>

      <div class="section">
        <h3>The hinge</h3>
        <p class="hint" style="margin-bottom:10px">
          KASSETE treats the window like a folding phone. Narrow is the cover: deck only. Wide opens
          up into the rack and the deck together.
        </p>
        <div class="grid-2">
          <div class="field">
            <label for="breakpoint">Hinge width (px)</label>
            <input
              id="breakpoint"
              type="number"
              min="420"
              max="2000"
              step="10"
              value={foldman.settings.hinge_breakpoint}
              onchange={(event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value);
                if (Number.isFinite(value)) void foldman.patchSettings({ hinge_breakpoint: value });
              }}
            />
          </div>
          <div class="field">
            <label>Mode</label>
            <div class="pill-row">
              {#each [
                { id: 'auto', label: 'Auto' },
                { id: 'cover', label: 'Cover' },
                { id: 'inner', label: 'Inner' }
              ] as option (option.id)}
                <button
                  class="pill"
                  class:on={foldman.settings.mode_lock === option.id}
                  onclick={() => void foldman.patchSettings({ mode_lock: option.id })}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </div>
        </div>
        <div class="row spread" style="margin-top:4px">
          <div>
            <div>Show the mini player</div>
            <p class="hint">A slim strip under the deck with the transport in reach.</p>
          </div>
          <button
            class="switch"
            class:on={foldman.settings.show_mini_player}
            onclick={() =>
              void foldman.patchSettings({ show_mini_player: !foldman.settings.show_mini_player })}
            aria-label="Toggle mini player"
          ></button>
        </div>
      </div>

      <div class="section">
        <h3>Playback</h3>
        <div class="row spread" style="margin-bottom:12px">
          <div>
            <div>Auto-reverse</div>
            <p class="hint">When side A runs out, turn the tape over on its own.</p>
          </div>
          <button
            class="switch"
            class:on={foldman.settings.auto_reverse}
            onclick={() => void foldman.patchSettings({ auto_reverse: !foldman.settings.auto_reverse })}
            aria-label="Toggle auto-reverse"
          ></button>
        </div>

        <div class="row spread" style="margin-bottom:12px">
          <div>
            <div>Tape wear</div>
            <p class="hint">Let tapes age as you play them. Cosmetic only.</p>
          </div>
          <button
            class="switch"
            class:on={foldman.settings.tape_wear_enabled}
            onclick={() =>
              void foldman.patchSettings({ tape_wear_enabled: !foldman.settings.tape_wear_enabled })}
            aria-label="Toggle tape wear"
          ></button>
        </div>

        <div class="field">
          <label for="volume">Volume — {Math.round(foldman.volume * 100)}%</label>
          <input
            id="volume"
            class="slider accent"
            type="range"
            min="0"
            max="100"
            value={Math.round(foldman.volume * 100)}
            oninput={(event) => foldman.setVolume(Number((event.currentTarget as HTMLInputElement).value) / 100)}
          />
        </div>

        <div class="row spread">
          <div>
            <div>Reduce motion</div>
            <p class="hint">Stop the reels and soften the transitions.</p>
          </div>
          <button
            class="switch"
            class:on={foldman.settings.reduce_motion}
            onclick={() =>
              void foldman.patchSettings({ reduce_motion: !foldman.settings.reduce_motion })}
            aria-label="Toggle reduced motion"
          ></button>
        </div>
      </div>

      <div class="section">
        <h3>Appearance</h3>
        <p class="hint" style="margin-bottom:10px">
          Ten decks. Pick the one that matches the room.
        </p>
        <div class="skin-grid">
          {#each SKINS as deck (deck.id)}
            <button
              class="skin-card"
              class:active={foldman.settings.current_skin === deck.id}
              onclick={() => void foldman.setSkin(deck.id)}
            >
              <div class="skin-swatch" style:background={deck.swatch}></div>
              <div class="nm" style:color={foldman.settings.current_skin === deck.id ? '#233' : undefined}>
                {deck.name}
              </div>
              <div class="tg">{deck.tagline}</div>
            </button>
          {/each}
        </div>

        <div class="field" style="margin-top:14px">
          <label>Finish — {skin.finishes[foldman.settings.current_finish] ?? skin.finishes[0]}</label>
          <div class="pill-row">
            {#each skin.finishes as finish, index (finish)}
              <button
                class="pill"
                class:on={foldman.settings.current_finish === index}
                onclick={() => {
                  void foldman.patchSettings({ current_finish: index });
                  foldman.toast(`Finish: ${finish}`);
                }}
              >
                {finish}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Your collection</h3>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn small" onclick={() => void importLibrary()} disabled={working}>
            <Icon name="download" size={14} />
            Import from KASSETE (Android or PC)
          </button>
          <button class="btn small" onclick={() => void exportLibrary()} disabled={working}>
            <Icon name="upload" size={14} />
            Export a copy
          </button>
        </div>
        <p class="hint" style="margin-top:8px">
          Import accepts a KASSETE PC export, or the folder from an Android install that contains
          <code>foldman-index-base.json</code>. Labels, shells and wear come across; file paths stay
          on this machine.
        </p>
        {#if info}
          <p class="hint path" style="margin-top:10px">
            Library file: {info.library_path}
          </p>
        {/if}
      </div>

      <div class="section" style="margin-bottom:0">
        <h3>About</h3>
        <p class="hint">
          KASSETE {info?.version ?? '1.0.2'} · built with Tauri, Svelte and a lot of affection for
          plastic. Your music stays on your disk. No accounts, no streaming, no telemetry.
        </p>
      </div>
    </div>

    <div class="sheet-foot">
      <button class="btn primary" onclick={() => foldman.closeSheet()}>Done</button>
    </div>
  </div>
</div>
