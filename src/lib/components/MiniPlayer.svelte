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
      <button
        class="icon-btn pencil-btn"
        onclick={() => {
          foldman.openSheet('bench');
          foldman.toast('Drag across the hubs to wind the tape by hand.');
        }}
        title="Wind it by hand with a pencil"
      >
        <Icon name="pencil" size={15} />
        <span>Wind</span>
      </button>
      <button class="icon-btn flip-btn" onclick={() => foldman.flipSide()} title="Flip the tape (F)">
        <Icon name="flip" size={15} />
        <span>Side {foldman.side}</span>
      </button>
    </div>
  </div>
{/if}
