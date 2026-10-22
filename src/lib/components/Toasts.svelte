<script lang="ts">
  import { foldman } from '../store.svelte';
</script>

<div
  class="toasts"
  class:raised={foldman.mode === 'inner' && foldman.settings.show_mini_player && !!foldman.tape}
  aria-live="polite"
>
  {#each foldman.toasts as toast (toast.id)}
    <div class="toast" class:err={toast.kind === 'err'}>{toast.text}</div>
  {/each}
</div>
