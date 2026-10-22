<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';

  let flicked = $state(false);

  const nextUp = $derived.by(() => {
    const list = foldman.sideTracks;
    if (!list.length) return null;
    if (foldman.trackIndex + 1 < list.length) return list[foldman.trackIndex + 1];
    return foldman.otherSideTracks[0] ?? list[0];
  });

  function flick() {
    flicked = true;
    foldman.next();
    setTimeout(() => (flicked = false), 260);
  }
</script>

<div class="lever-wrap">
  <button
    class="lever"
    class:flicked
    onclick={flick}
    title="Play the next track in the queue (N)"
    aria-label="Next track"
  >
    <span class="lever-track">
      <span class="lever-knob"><Icon name="ff" size={11} /></span>
    </span>
  </button>
  <div class="lever-cap">
    <span>Next</span>
    <b title={nextUp ? `${nextUp.artist} — ${nextUp.title}` : 'Nothing queued'}>
      {nextUp ? nextUp.title : '—'}
    </b>
  </div>
</div>
