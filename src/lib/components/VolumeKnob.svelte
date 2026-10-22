<script lang="ts">
  import { foldman } from '../store.svelte';

  interface Props {
    caption?: string;
    compact?: boolean;
  }

  let { caption = 'Volume', compact = false }: Props = $props();

  let dragging = $state(false);
  /** Pressed on the spindle: fall back to an up/down drag. */
  let vertical = false;
  let lastAngle = 0;
  let startY = 0;
  let startValue = 0;

  const angle = $derived(-135 + foldman.volume * 270);
  const percent = $derived(Math.round(foldman.volume * 100));

  function offset(event: PointerEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
      radius: rect.width / 2,
    };
  }

  /** Pointer angle around the knob: 0° = 12 o'clock, +90° = 3 o'clock. */
  function clockAngle(x: number, y: number) {
    return (Math.atan2(x, -y) * 180) / Math.PI;
  }

  function onPointerDown(event: PointerEvent) {
    const el = event.currentTarget as HTMLElement;
    const { x, y, radius } = offset(event, el);
    dragging = true;
    // Dead centre has no meaningful angle — grab there and drag up/down.
    vertical = Math.hypot(x, y) < radius * 0.24;
    lastAngle = clockAngle(x, y);
    startY = event.clientY;
    startValue = foldman.volume;
    el.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    const el = event.currentTarget as HTMLElement;

    if (vertical) {
      foldman.setVolume(startValue + (startY - event.clientY) / 130);
      return;
    }

    const { x, y, radius } = offset(event, el);
    // Right on the spindle the angle is meaningless — skip those samples.
    if (Math.hypot(x, y) < radius * 0.24) return;

    const current = clockAngle(x, y);
    // Shortest way round, so a drag past 12 o'clock keeps turning the same way.
    let delta = current - lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = current;

    // A jump this big is the pointer crossing the middle of the knob, not a turn.
    if (Math.abs(delta) > 90) return;

    // The notch sweeps 270°, so 270° of pointer travel is the full range.
    foldman.setVolume(foldman.volume + delta / 270);
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    const el = event.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    foldman.setVolume(foldman.volume - Math.sign(event.deltaY) * 0.05);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      foldman.setVolume(foldman.volume + 0.05);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      foldman.setVolume(foldman.volume - 0.05);
    } else if (event.key === 'm' || event.key === 'M') {
      foldman.toggleMute();
    }
  }
</script>

<div class="knob-wrap" class:compact>
  <div class="knob-rack">
    <button
      class="knob"
      class:dragging
      style:--angle={`${angle}deg`}
      role="slider"
      tabindex="0"
      aria-label="Volume"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={percent}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onlostpointercapture={() => (dragging = false)}
      onwheel={onWheel}
      onkeydown={onKey}
      ondblclick={() => foldman.toggleMute()}
      title="Turn the knob with the pointer, or scroll"
    >
      <span class="notch"></span>
    </button>
  </div>
  {#if !compact}
    <div class="knob-cap">
      {foldman.muted ? 'Muted' : caption}
      <b>{percent}</b>
    </div>
  {/if}
</div>
