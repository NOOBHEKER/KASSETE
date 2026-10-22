<script lang="ts">
  import type { Side, Tape } from '../types';
  import { foldman } from '../store.svelte';
  import { tapeCondition } from '../format';

  interface Props {
    tape: Tape;
    side?: Side;
    progress?: number;
    playing?: boolean;
    compact?: boolean;
  }

  let { tape, side = 'A', progress = 0, playing = false, compact = false }: Props = $props();

  const clear = $derived(tape.shell === 'C' || tape.shell === 'D');

  const leftFill = $derived(0.54 + 0.4 * (1 - progress));
  const rightFill = $derived(0.54 + 0.4 * progress);
  const labelArtist = $derived(tape.label_artist || tape.artist);
  const labelAlbum = $derived(tape.label_album || tape.album);
  const condition = $derived(tapeCondition(tape.wear, tape.dirt));
  const grime = $derived(Math.min(1, Math.pow(Math.max(tape.wear ?? 0, tape.dirt ?? 0), 0.55)));
  const spinState = $derived(playing ? 'running' : 'paused');
  const spinDuration = $derived(`${3.4 - progress * 1.1}s`);
</script>

<div
  class="cassette"
  class:compact
  class:clear
  data-shell={tape.shell}
  data-condition={condition.tone}
  title={`${condition.label} — ${condition.comment}`}
  style:--spin-state={spinState}
  style:--spin-duration={spinDuration}
  style:--grime={grime}
>
  <span class="screw tl"></span>
  <span class="screw tr"></span>
  <span class="screw bl"></span>
  <span class="screw br"></span>

  <div class="cassette-label" data-style={tape.label_style} style:--label-ink={tape.label_color}>
    <span class="side-badge">{side}</span>
    <div class="label-artist" title={labelArtist}>{labelArtist}</div>
    <div class="label-album" title={labelAlbum}>{labelAlbum}</div>
    {#if !compact}
      <div class="label-rule">
        <span>{tape.year || '—'}</span>
        <span>Side {side}</span>
        <span>{tape.tracks.length} trk</span>
      </div>
    {/if}
  </div>

  <div class="cassette-reels">
    <div class="cassette-path"></div>

    <div class="reel">
      <div class="tape-mass" style:--fill={leftFill}></div>
      <div class="hub spinning">
        <span class="spokes">
          <i style="--i: 0"></i>
          <i style="--i: 1"></i>
          <i style="--i: 2"></i>
          <i style="--i: 3"></i>
          <i style="--i: 4"></i>
          <i style="--i: 5"></i>
        </span>
      </div>
    </div>

    <div class="reel">
      <div class="tape-mass" style:--fill={rightFill}></div>
      <div class="hub spinning">
        <span class="spokes">
          <i style="--i: 0"></i>
          <i style="--i: 1"></i>
          <i style="--i: 2"></i>
          <i style="--i: 3"></i>
          <i style="--i: 4"></i>
          <i style="--i: 5"></i>
        </span>
      </div>
    </div>
  </div>

  {#if !compact && clear}
    <div class="cassette-xray" aria-hidden="true">
      <span class="x-shield"></span>
      <span class="x-pad"></span>
      <span class="x-spring"></span>
      <span class="x-roller"></span>
      <span class="x-capstan"></span>
      <span class="x-guide g1"></span>
      <span class="x-guide g2"></span>
      <span class="x-slip s1"></span>
      <span class="x-slip s2"></span>
      <span class="x-tab"></span>
    </div>
    <button
      class="xray-btn"
      onclick={(event) => {
        event.stopPropagation();
        foldman.openSheet('insights');
      }}
      title="Look inside this cassette (I)"
    >
      inside
    </button>
  {/if}

  <div class="cassette-grime" aria-hidden="true">
    <span class="g-stain s1"></span>
    <span class="g-stain s2"></span>
    <span class="g-stain s3"></span>
    <span class="g-stain s4"></span>
    <span class="g-print p1"></span>
    <span class="g-print p2"></span>
    <span class="g-print p3"></span>
    <span class="g-scratch"></span>
    <span class="g-ring"></span>
    <span class="g-ring r2"></span>
    <span class="g-dust"></span>
    <span class="g-label"></span>
  </div>

  {#if !compact && clear}
    <div class="cassette-glass" aria-hidden="true"></div>
  {/if}

  {#if !compact}
    <div class="cassette-foot">
      <span>Type I · Normal</span>
      <span>C-60</span>
      <span>KASSETE</span>
    </div>
  {/if}
</div>
