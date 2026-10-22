<script lang="ts">
  import { onMount } from 'svelte';
  import Deck from './lib/components/Deck.svelte';
  import Rack from './lib/components/Rack.svelte';
  import MiniPlayer from './lib/components/MiniPlayer.svelte';
  import Settings from './lib/components/Settings.svelte';
  import JCard from './lib/components/JCard.svelte';
  import Bench from './lib/components/Bench.svelte';
  import SkinSheet from './lib/components/SkinSheet.svelte';
  import Toasts from './lib/components/Toasts.svelte';
  import Welcome from './lib/components/Welcome.svelte';
  import NowPlaying from './lib/components/NowPlaying.svelte';
  import Insights from './lib/components/Insights.svelte';
  import Icon from './lib/components/Icon.svelte';
  import { foldman } from './lib/store.svelte';
  import { skinById } from './lib/skins';

  onMount(() => {
    void foldman.init();
  });

  const skin = $derived(skinById(foldman.settings.current_skin));
  const modeLabel = $derived(
    foldman.settings.mode_lock === 'auto'
      ? `Auto · ${foldman.mode === 'cover' ? 'Cover' : 'Inner'}`
      : foldman.settings.mode_lock === 'cover'
        ? 'Cover'
        : 'Inner'
  );
  const tapeLabel = $derived(
    foldman.tape ? `${foldman.tape.artist} — ${foldman.tape.album}` : 'No tape in the deck'
  );

  function cycleMode() {
    const order = ['auto', 'cover', 'inner'] as const;
    const next = order[(order.indexOf(foldman.settings.mode_lock as 'auto') + 1) % order.length];
    void foldman.patchSettings({ mode_lock: next });
    foldman.toast(
      next === 'auto' ? 'Hinge follows the window' : `Locked to ${next === 'cover' ? 'cover' : 'inner'} mode`
    );
  }
</script>

<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="rgba(35,32,28,.06)" stroke="rgba(35,32,28,.22)" />
        <rect x="5.5" y="8.5" width="21" height="15" rx="3" fill="#26262d" />
        <rect x="7.5" y="10.5" width="17" height="5.4" rx="1" fill="#f6ecd8" />
        <circle cx="11.4" cy="20.4" r="2.6" fill="#f6ecd8" />
        <circle cx="20.6" cy="20.4" r="2.6" fill="#f6ecd8" />
        <circle cx="11.4" cy="20.4" r="0.9" fill="#26262d" />
        <circle cx="20.6" cy="20.4" r="0.9" fill="#26262d" />
        <rect x="14.4" y="19.1" width="3.2" height="2.6" rx="0.8" fill="#e0662e" />
      </svg>
      KASSETE
      <small>Cassette Deck</small>
    </div>

    <span class="chip" class:live={foldman.playing} title="Tape in the deck">
      {#if foldman.playing}
        <Icon name="play" size={10} />
      {:else}
        <Icon name="stop" size={9} />
      {/if}
      {tapeLabel}
    </span>

    <div class="topbar-spacer"></div>

    <button class="mode-btn" onclick={cycleMode} title="Switch hinge mode (Ctrl+B cycles)">
      <Icon name="grid" size={14} />
      <span class="mode-text">{modeLabel}</span>
    </button>

    <button class="icon-btn" onclick={() => foldman.openSheet('skins')} title="Skins">
      <Icon name="palette" size={17} />
    </button>
    <button class="icon-btn" onclick={() => foldman.openSheet('jcard')} title="J-card (J)">
      <Icon name="tape" size={17} />
    </button>
    <button class="icon-btn" onclick={() => foldman.openSheet('settings')} title="Settings (S)">
      <Icon name="sliders" size={17} />
    </button>
  </header>

  {#if !foldman.ready}
    <div class="boot">
      <div class="boot-mark">KASSETE</div>
      <div class="boot-sub">warming up the capstan</div>
    </div>
  {:else if !foldman.tapes.length}
    <Welcome />
  {:else}
    <div class="main" class:cover={foldman.mode === 'cover'}>
      {#if foldman.mode === 'inner'}
        <Rack />
      {/if}
      <Deck />
    </div>
  {/if}

  {#if foldman.tapes.length && foldman.settings.show_mini_player && foldman.tape}
    <MiniPlayer />
  {/if}
</div>

{#if foldman.sheet === 'settings'}<Settings />{/if}
{#if foldman.sheet === 'jcard'}<JCard />{/if}
{#if foldman.sheet === 'bench'}<Bench />{/if}
{#if foldman.sheet === 'skins'}<SkinSheet />{/if}
{#if foldman.sheet === 'now'}<NowPlaying />{/if}
{#if foldman.sheet === 'insights'}<Insights />{/if}

<Toasts />

<style>
  .topbar-spacer {
    flex: 1;
  }

  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 30px;
    padding: 0 11px;
    border-radius: 9px;
    border: 1px solid rgba(35, 32, 28, 0.14);
    background: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
    transition: background 140ms ease, border-color 140ms ease;
  }
  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(35, 32, 28, 0.24);
    color: var(--ink);
  }

  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .main.cover {
    justify-content: center;
  }

  .boot {
    flex: 1;
    display: grid;
    place-content: center;
    gap: 6px;
    text-align: center;
  }
  .boot-mark {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .boot-sub {
    font-family: var(--font-hand);
    font-size: 18px;
    color: var(--ink-faint);
  }

  .chip {
    max-width: 34vw;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  @media (max-width: 700px) {
    .chip {
      display: none;
    }
  }
</style>
