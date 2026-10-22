<script lang="ts">
  import Cassette from './Cassette.svelte';
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { fmtTime } from '../format';

  const tape = $derived(foldman.tape);
  const queue = $derived(foldman.sideTracks);
  const duration = $derived(foldman.trackDurationMs || 0);
  const totalSide = $derived(foldman.sideDurationMs || 0);
  const clearShell = $derived(!!tape && (tape.shell === 'C' || tape.shell === 'D'));

  function scrub(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    foldman.seekTo(value);
  }
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet wide np" role="dialog" aria-modal="true" aria-label="Now playing">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>Now playing</h2>
        <p>
          {#if tape}
            {tape.artist} — {tape.album} · side {foldman.side} · {queue.length} tracks ·
            {fmtTime(totalSide)}
          {:else}
            The deck is empty
          {/if}
        </p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body np-body">
      {#if tape}
        <div class="np-stage">
          <div class="np-tape">
            <Cassette {tape} side={foldman.side} progress={foldman.tapeProgress} playing={foldman.playing} />
          </div>
          <div class="np-meta">
            <div class="np-kicker">Track {foldman.trackIndex + 1} of {queue.length}</div>
            <h3 class="np-title">{foldman.track?.title ?? 'No track'}</h3>
            <p class="np-artist">{foldman.track?.artist ?? tape.artist}</p>

            <div class="np-progress">
              <input
                class="np-range"
                type="range"
                min="0"
                max={Math.max(1, duration)}
                step="250"
                value={foldman.positionMs}
                oninput={scrub}
                aria-label="Seek"
              />
              <div class="np-times">
                <span>{fmtTime(foldman.positionMs)}</span>
                <span>−{fmtTime(Math.max(0, duration - foldman.positionMs))}</span>
              </div>
            </div>

            <div class="np-actions">
              <button class="np-btn" onclick={() => foldman.prev()} title="Previous track">
                <Icon name="rew" size={15} />
              </button>
              <button class="np-btn big" onclick={() => foldman.toggle()} title="Play / pause">
                <Icon name={foldman.playing ? 'pause' : 'play'} size={18} />
              </button>
              <button class="np-btn" onclick={() => foldman.next()} title="Next track">
                <Icon name="ff" size={15} />
              </button>
              <button class="np-btn" onclick={() => foldman.flipSide()} title="Turn the tape over">
                <Icon name="flip" size={15} />
              </button>
            </div>

            <div class="np-tags">
              <span class="np-tag">Side {foldman.side}</span>
              <span class="np-tag">{tape.year || 'year unknown'}</span>
              <span class="np-tag">Type I</span>
              {#if clearShell}
                <button class="np-tag link" onclick={() => foldman.openSheet('insights')}>
                  Look inside
                </button>
              {/if}
            </div>
          </div>
        </div>

        <div class="np-queue">
          <div class="np-queue-head">
            <span>Side {foldman.side} queue</span>
            <button class="np-tag link" onclick={() => foldman.flipSide()}>
              Flip to side {foldman.side === 'A' ? 'B' : 'A'}
            </button>
          </div>
          <ol class="np-list">
            {#each queue as track, index (track.id)}
              <li
                class:current={foldman.track?.id === track.id}
                onclick={() => foldman.playTrack(track.id)}
                role="presentation"
              >
                <span class="np-num">{String(index + 1).padStart(2, '0')}</span>
                <span class="np-song">
                  <b>{track.title}</b>
                  <small>{track.artist}</small>
                </span>
                <span class="np-len">{track.duration_ms ? fmtTime(track.duration_ms) : '—'}</span>
                {#if foldman.track?.id === track.id}
                  <span class="np-eq" class:live={foldman.playing}>
                    <i></i><i></i><i></i>
                  </span>
                {/if}
              </li>
            {/each}
          </ol>
        </div>
      {:else}
        <p class="hint">Load a tape and this becomes a proper now-playing screen.</p>
      {/if}
    </div>
  </div>
</div>
