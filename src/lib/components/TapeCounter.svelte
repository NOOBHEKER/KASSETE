<script lang="ts">
  import { fmtCounter } from '../format';

  interface Props {
    value?: number;
    label?: string;
  }

  let { value = 0, label = 'Counter' }: Props = $props();
  const digits = $derived(fmtCounter(value).split(''));
</script>

<div class="counter" aria-label={`Tape counter ${fmtCounter(value)}`} title={label}>
  <span class="cap">CNT</span>
  <div class="digits">
    {#each digits as digit, index (index)}
      <span class="digit">{digit}</span>
    {/each}
  </div>
</div>
