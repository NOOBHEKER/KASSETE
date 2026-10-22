<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { fmtTime } from '../format';

  const tape = $derived(foldman.tape);

  function seek(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    foldman.seekToFraction((event.clientX - rect.left) / Math.max(1, rect.width));
  }
</script>

{#if tape}
  <div class="mini">
    <div class="now">
      <div class="t">{foldman.track?.title ?? '—'}</div>
      <div class="s">{tape.artist} — {tape.album}</div>
    </div>

    <div class="bar">
      <span class="time">{fmtTime(foldman.sideOffsetMs + foldman.positionMs)}</span>
      <div class="tape-rail" onclick={seek} role="presentation">
        <div class="fill" style:width={`${Math.max(0, Math.min(100, foldman.sideProgress * 100))}%`}></div>
      </div>
      <span class="time">{fmtTime(foldman.sideDurationMs)}</span>
    </div>

    <div class="controls">
      <button class="icon-btn" onclick={() => foldman.prev()} title="Previous (←)">
        <Icon name="rew" size={15} />
      </button>
      <button
        class="icon-btn play-btn"
        class:on={foldman.playing}
        onclick={() => foldman.toggle()}
        title="Play / pause (Space)"
      >
        <Icon name={foldman.playing ? 'pause' : 'play'} size={16} />
      </button>
      <button class="icon-btn" onclick={() => foldman.next()} title="Next (→)">
        <Icon name="ff" size={15} />
      </button>
      <button class="icon-btn flip-btn" onclick={() => foldman.flipSide()} title="Flip the tape (F)">
        <Icon name="flip" size={15} />
        <span>Side {foldman.side}</span>
      </button>
    </div>
  </div>
{/if}
