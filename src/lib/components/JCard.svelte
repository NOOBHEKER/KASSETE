<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { fmtTime, fmtRelative } from '../format';

  const tape = $derived(foldman.tape);
  const sideA = $derived(
    tape ? tape.tracks.filter((t) => t.side === 'A').sort((a, b) => a.side_index - b.side_index) : []
  );
  const sideB = $derived(
    tape ? tape.tracks.filter((t) => t.side === 'B').sort((a, b) => a.side_index - b.side_index) : []
  );
  const totalA = $derived(sideA.reduce((sum, t) => sum + t.duration_ms, 0));
  const totalB = $derived(sideB.reduce((sum, t) => sum + t.duration_ms, 0));

  function reveal() {
    if (!tape) return;
    void foldman.revealFolder(tape.id);
  }
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet wide" role="dialog" aria-modal="true" aria-label="J-card">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>{tape ? tape.album : 'J-card'}</h2>
        <p>
          {#if tape}
            {tape.artist} · {tape.tracks.length} tracks · {fmtTime(totalA + totalB)} · played
            {tape.play_count}× · last {fmtRelative(tape.last_played_at)}
          {:else}
            No tape in the deck
          {/if}
        </p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body">
      {#if tape}
        <div class="jcard">
          {#each [{ side: 'A', list: sideA, total: totalA }, { side: 'B', list: sideB, total: totalB }] as sheet (sheet.side)}
            <div
              class="jcard-side"
              class:current={foldman.side === sheet.side && foldman.tapeId === tape.id}
            >
              <h4>
                <span>Side {sheet.side}</span>
                <em>{sheet.list.length} tracks · {fmtTime(sheet.total)}</em>
              </h4>
              <ol>
                {#each sheet.list as track (track.id)}
                  <li
                    class:playing={foldman.track?.id === track.id && foldman.playing}
                    onclick={() => foldman.playTrack(track.id)}
                    onkeydown={(event) => {
                      if (event.key === 'Enter') foldman.playTrack(track.id);
                    }}
                    role="button"
                    tabindex="0"
                  >
                    <span class="n">{String(track.side_index).padStart(2, '0')}</span>
                    <span class="t">{track.title}</span>
                    <span class="d">{fmtTime(track.duration_ms)}</span>
                  </li>
                {/each}
              </ol>
              {#if !sheet.list.length}
                <p class="hint" style="margin-top:12px">This side is blank.</p>
              {/if}
            </div>
          {/each}
        </div>

        <div class="row" style="margin-top:16px;flex-wrap:wrap;gap:8px">
          <button class="btn small" onclick={() => foldman.openSheet('bench')}>
            <Icon name="sliders" size={14} />
            Take it to the bench
          </button>
          <button class="btn small" onclick={reveal}>
            <Icon name="folder" size={14} />
            Reveal folder
          </button>
          <button class="btn small" onclick={() => foldman.flipSide()}>
            <Icon name="flip" size={14} />
            Flip to side {foldman.side === 'A' ? 'B' : 'A'}
          </button>
        </div>
      {:else}
        <p class="hint">Load a tape from the rack to see its J-card.</p>
      {/if}
    </div>
  </div>
</div>
