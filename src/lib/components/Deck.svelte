<script lang="ts">
  import Cassette from './Cassette.svelte';
  import Icon from './Icon.svelte';
  import TapeCounter from './TapeCounter.svelte';
  import VUMeters from './VUMeters.svelte';
  import VolumeKnob from './VolumeKnob.svelte';
  import NextLever from './NextLever.svelte';
  import { foldman } from '../store.svelte';
  import { skinById } from '../skins';
  import { fmtTime, tapeCondition } from '../format';

  const skin = $derived(skinById(foldman.settings.current_skin));
  const tape = $derived(foldman.tape);
  const finishName = $derived(skin.finishes[foldman.settings.current_finish] ?? skin.finishes[0]);
  const sideElapsed = $derived(foldman.sideOffsetMs + foldman.positionMs);

  let dragOver = $state(false);

  function pressStop() {
    foldman.stop();
  }

  function pressEject() {
    if (foldman.ejected) {
      if (tape) foldman.openTape(tape.id, { autoplay: false, restore: true });
    } else {
      foldman.eject();
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    const id =
      event.dataTransfer?.getData('application/x-foldman-tape') ||
      event.dataTransfer?.getData('text/plain');
    if (id) foldman.openTape(id, { autoplay: true });
  }

  function seek(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / Math.max(1, rect.width);
    foldman.seekToFraction(fraction);
  }
</script>

<div class="deck-stage">
  <div class="deck">
    <div class="deck-head">
      <div class="deck-wordmark">
        {skin.model}
        <span>Stereo Cassette Deck</span>
      </div>
      <div class="deck-badges">
        <i></i>
        <span>{finishName}</span>
        <span class="sep">·</span>
        <span>{foldman.mode === 'cover' ? 'Cover' : 'Inner'}</span>
      </div>
    </div>

    <div class="deck-panel">
      <div class="deck-window">
        <div class="tape-window">
          <div
            class="tape-slot"
            class:ejected={foldman.ejected}
            ondragover={(event) => {
              event.preventDefault();
              dragOver = true;
            }}
            ondragleave={() => (dragOver = false)}
            ondrop={onDrop}
            role="presentation"
          >
            {#if tape && !foldman.ejected}
              <Cassette
                {tape}
                side={foldman.side}
                progress={foldman.tapeProgress}
                playing={foldman.playing}
              />
            {:else}
              <div class="deck-empty" class:dragover={dragOver} role="presentation">
                <div class="deck-empty-head">
                  <strong>{foldman.ejected ? 'Tape out' : 'Deck empty'}</strong>
                  <span>
                    {#if foldman.ejected}
                      Pick the next cassette, or drop one in.
                    {:else}
                      Drag a tape here, or choose one below.
                    {/if}
                  </span>
                </div>

                {#if foldman.visibleTapes.length}
                  <div class="deck-picks">
                    {#each foldman.visibleTapes as pick (pick.id)}
                      <button
                        class="deck-pick"
                        onclick={() => foldman.openTape(pick.id, { autoplay: true })}
                        title={`${pick.artist} — ${pick.album}`}
                      >
                        <span class="nm">{pick.album}</span>
                        <span class="ar">{pick.artist}</span>
                        <span class="tr">{pick.tracks.length} trk</span>
                      </button>
                    {/each}
                  </div>
                {/if}

                <button class="deck-add" onclick={() => void foldman.pickAndImportFiles()}>
                  <Icon name="plus" size={12} />
                  Add a song from this PC
                </button>
              </div>
            {/if}
          </div>

          <div class="tape-window-foot">
            <span class="side-pill" class:flip={foldman.side === 'B'}>
              <Icon name="flip" size={12} />
              Side {foldman.side}
            </span>
            {#if tape}
              <span class="condition-pill" data-tone={tapeCondition(tape.wear, tape.dirt).tone}>
                {tapeCondition(tape.wear, tape.dirt).label}
              </span>
            {/if}
            <span class="foot-note">
              {#if tape}
                {tape.tracks.length} tracks · {tape.year || 'year unknown'}
              {:else}
                awaiting tape
              {/if}
            </span>
            <button
              class="eject-btn"
              class:lit={!foldman.ejected}
              onclick={pressEject}
              title="Eject (E)"
            >
              <Icon name="eject" size={13} />
              Eject
            </button>
          </div>
        </div>
      </div>

      <div class="deck-side">
        <TapeCounter value={foldman.tapeProgress} />
        <div
          class="lcd lcd-tap"
          role="button"
          tabindex="0"
          title="Now playing"
          onclick={() => foldman.openSheet('now')}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') foldman.openSheet('now');
          }}
        >
          <div class="big">{fmtTime(foldman.positionMs)}</div>
          <div class="small">
            {#if foldman.playing}
              {foldman.side} · play
            {:else if foldman.ejected}
              {foldman.side} · out
            {:else}
              {foldman.side} · stop
            {/if}
          </div>
        </div>
        <VUMeters left={foldman.vu.l} right={foldman.vu.r} />
        <VolumeKnob />
        <NextLever />
      </div>
    </div>

    <div class="deck-transport">
      <div class="keyrow">
        <button class="key rew" onclick={() => foldman.seekBy(-10_000)} title="Back 10 seconds (←)">
          <span class="glyph"><Icon name="rew" size={15} /></span>
          Rew
        </button>
        <button
          class="key play"
          class:engaged={foldman.playing}
          onclick={() => foldman.toggle()}
          title="Play / pause (Space)"
        >
          <span class="glyph"><Icon name={foldman.playing ? 'pause' : 'play'} size={15} /></span>
          Play
        </button>
        <button class="key ff" onclick={() => foldman.seekBy(10_000)} title="Forward 10 seconds (→)">
          <span class="glyph"><Icon name="ff" size={15} /></span>
          F.Fwd
        </button>
        <button class="key stop" onclick={pressStop} title="Stop">
          <span class="glyph"><Icon name="stop" size={13} /></span>
          Stop
        </button>
        <button
          class="key pause"
          class:pressed={!foldman.playing && !!tape}
          onclick={() => foldman.pauseOrEject()}
          title={foldman.playing ? 'Pause' : foldman.ejected ? 'Load the tape again' : 'Pause — press again to eject'}
        >
          <span class="glyph"><Icon name={foldman.ejected || !foldman.playing ? 'eject' : 'pause'} size={13} /></span>
          {foldman.ejected ? 'Load' : foldman.playing ? 'Pause' : 'Eject'}
        </button>
      </div>
    </div>

    <div class="deck-readout">
      <div class="now">
        <div class="t">
          {#if foldman.ejected}
            Tape out
          {:else}
            {foldman.track?.title ?? 'No tape loaded'}
          {/if}
        </div>
        <div class="s">
          {#if foldman.ejected}
            Pick the next cassette from the drawer
          {:else if tape}
            {tape.artist} — {tape.album}
          {:else}
            Insert a tape to begin
          {/if}
        </div>
      </div>

      <div class="rail-wrap">
        <div class="tape-rail" onclick={seek} role="presentation" title="Seek within this side">
          <div class="fill" style:width={`${Math.max(0, Math.min(100, foldman.sideProgress * 100))}%`}></div>
        </div>
        <div class="rail-times">
          <span>{fmtTime(sideElapsed)}</span>
          <span class="side-tag">Side {foldman.side}</span>
          <span>{fmtTime(foldman.sideDurationMs)}</span>
        </div>
      </div>
    </div>
  </div>
</div>
