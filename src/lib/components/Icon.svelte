<script lang="ts">
  type Name =
    | 'play'
    | 'pause'
    | 'stop'
    | 'rew'
    | 'ff'
    | 'eject'
    | 'volume'
    | 'mute'
    | 'sliders'
    | 'grid'
    | 'palette'
    | 'folder'
    | 'refresh'
    | 'search'
    | 'close'
    | 'heart'
    | 'trash'
    | 'flip'
    | 'disc'
    | 'chevron'
    | 'plus'
    | 'download'
    | 'upload'
    | 'info'
    | 'sparkle'
    | 'tape';

  interface Props {
    name: Name;
    size?: number;
    stroke?: number;
    fill?: boolean;
  }

  let { name, size = 18, stroke = 1.7, fill = false }: Props = $props();

  const solid = ['play', 'pause', 'stop', 'rew', 'ff', 'eject'];
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={fill || solid.includes(name) ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'play'}
    <path d="M7 4.5v15l13-7.5z" />
  {:else if name === 'pause'}
    <rect x="6" y="4.5" width="4" height="15" rx="1" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" />
  {:else if name === 'stop'}
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.4" />
  {:else if name === 'rew'}
    <path d="M11.5 19 3 12l8.5-7z" />
    <path d="M21 19l-8.5-7L21 5z" />
  {:else if name === 'ff'}
    <path d="M12.5 5 21 12l-8.5 7z" />
    <path d="M3 5l8.5 7L3 19z" />
  {:else if name === 'eject'}
    <path d="M12 4.5 21 14H3z" />
    <rect x="4.5" y="16.5" width="15" height="2.6" rx="1.1" />
  {:else if name === 'volume'}
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="M16 8.6a4.8 4.8 0 0 1 0 6.8" />
    <path d="M18.8 5.8a8.6 8.6 0 0 1 0 12.4" />
  {:else if name === 'mute'}
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  {:else if name === 'sliders'}
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="15" cy="17" r="2" />
  {:else if name === 'grid'}
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  {:else if name === 'palette'}
    <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.5 0 2.2-.9 2.2-2 0-1.5-1.1-1.8-1.1-3 0-1 .8-1.7 2-1.7h1.6c2.2 0 3.8-1.6 3.8-3.7 0-3.7-3.8-6.6-8.5-6.6z" />
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="9.6" r="1" fill="currentColor" stroke="none" />
  {:else if name === 'folder'}
    <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.3h7.4a2 2 0 0 1 2 2v7.7a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" />
  {:else if name === 'refresh'}
    <path d="M20.5 12a8.5 8.5 0 1 1-2.7-6.2" />
    <path d="M20.5 4v5h-5" />
  {:else if name === 'search'}
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="M15.5 15.5 20 20" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6L6 18" />
  {:else if name === 'heart'}
    <path d="M12 20.2S4.6 15.6 4.6 10.6a4.1 4.1 0 0 1 7.4-2.4 4.1 4.1 0 0 1 7.4 2.4c0 5-7.4 9.6-7.4 9.6z" />
  {:else if name === 'trash'}
    <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
  {:else if name === 'flip'}
    <path d="M4 8.5a8 8 0 0 1 13.7-3.2M20 15.5a8 8 0 0 1-13.7 3.2" />
    <path d="M20 4.5v5h-5M4 19.5v-5h5" />
  {:else if name === 'disc'}
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="2.4" />
    <path d="M12 3.6a8.4 8.4 0 0 1 8.4 8.4" opacity=".55" />
  {:else if name === 'chevron'}
    <path d="M7 10l5 5 5-5" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'download'}
    <path d="M12 4v11M7.5 11l4.5 4.5L16.5 11M5 19.5h14" />
  {:else if name === 'upload'}
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" />
  {:else if name === 'info'}
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 11v5.4" />
    <circle cx="12" cy="8.1" r=".9" fill="currentColor" stroke="none" />
  {:else if name === 'sparkle'}
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  {:else if name === 'tape'}
    <rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.4" />
    <circle cx="9" cy="12.4" r="2.1" />
    <circle cx="15" cy="12.4" r="2.1" />
    <path d="M9 14.5h6" />
  {/if}
</svg>

<style>
  .icon {
    display: block;
    flex: 0 0 auto;
  }
</style>
