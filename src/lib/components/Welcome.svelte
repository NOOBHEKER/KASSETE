<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';

  const suggestions = $derived(
    foldman.library.scan_paths.length
      ? foldman.library.scan_paths.map((p) => p.path)
      : ['G:\\kleosal-cassete\\Music']
  );
</script>

<div class="welcome">
  <div class="welcome-card">
    <div class="welcome-kicker">Side A</div>
    <h1 class="hand">Welcome to KASSETE</h1>
    <p class="welcome-lede">
      A cassette deck for the music already on your computer. Point it at a folder and every album
      comes back as a tape — or hand it a single MP3 and that song gets a cassette of its own, with a
      label to write on, a shell to pick, and reels that actually turn.
    </p>

    <div class="welcome-actions">
      <button class="btn primary" onclick={() => void foldman.pickAndImportFiles()}>
        <Icon name="plus" size={15} />
        Add a song or video
      </button>
      <button class="btn" onclick={() => void foldman.pickAndAddFolder()}>
        <Icon name="folder" size={15} />
        Choose a music folder
      </button>
      <button class="btn" onclick={() => foldman.openSheet('settings')}>
        <Icon name="sliders" size={15} />
        Open settings
      </button>
    </div>

    {#if suggestions.length}
      <div class="welcome-suggest">
        <span>Looking in</span>
        {#each suggestions as path (path)}
          <code>{path}</code>
        {/each}
      </div>
    {/if}

    <div class="welcome-grid">
      <div class="welcome-tip">
        <b>One file, one cassette</b>
        <span>MP3, FLAC, M4A, MP4 — add a song and it becomes a tape of its own.</span>
      </div>
      <div class="welcome-tip">
        <b>Space, arrows, F</b>
        <span>Space plays, arrows skip, F turns the tape over.</span>
      </div>
      <div class="welcome-tip">
        <b>Pause again to eject</b>
        <span>The cassette comes out and the drawer shows the rest of the rack.</span>
      </div>
    </div>
  </div>
</div>

<style>
  .welcome {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 28px;
    overflow: auto;
  }

  .welcome-card {
    width: min(620px, 100%);
    padding: 30px 32px 26px;
    border-radius: 20px;
    background: linear-gradient(180deg, #fffdf6, #f4ebd8);
    box-shadow:
      0 0 0 1px rgba(35, 32, 28, 0.1),
      0 30px 60px -34px rgba(60, 45, 20, 0.55);
    position: relative;
  }

  .welcome-kicker {
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-bottom: 4px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 46px;
    line-height: 1;
    font-weight: 700;
    color: #2b2620;
    letter-spacing: -0.01em;
  }

  .welcome-lede {
    margin: 0 0 20px;
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--ink-soft);
    max-width: 48ch;
  }

  .welcome-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .welcome-suggest {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-bottom: 20px;
  }

  .welcome-suggest code {
    font-family: ui-monospace, 'Cascadia Mono', monospace;
    font-size: 11px;
    letter-spacing: 0;
    text-transform: none;
    padding: 3px 7px;
    border-radius: 5px;
    background: rgba(35, 32, 28, 0.06);
    color: var(--ink-soft);
  }

  .welcome-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
    padding-top: 18px;
    border-top: 1px dashed rgba(35, 32, 28, 0.18);
  }

  .welcome-tip {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .welcome-tip b {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink);
  }
  .welcome-tip span {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--ink-faint);
  }
</style>
