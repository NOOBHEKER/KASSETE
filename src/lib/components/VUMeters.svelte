<script lang="ts">
  interface Props {
    left?: number;
    right?: number;
    compact?: boolean;
  }

  let { left = 0, right = 0, compact = false }: Props = $props();
  const pct = (value: number) => `${Math.min(99, Math.max(1, value * 100)).toFixed(1)}%`;
</script>

<div class="vu" class:compact>
  <div class="vu-row">
    <span class="label">L</span>
    <div class="scale"><span class="needle" style:left={pct(left)}></span></div>
  </div>
  <div class="vu-row">
    <span class="label">R</span>
    <div class="scale"><span class="needle" style:left={pct(right)}></span></div>
  </div>
</div>
