<script lang="ts">
  import Cassette from './Cassette.svelte';
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { fmtTime, timeAgoShort } from '../format';
  import type { Tape } from '../types';

  let query = $state('');
  let sort = $state<'custom' | 'artist' | 'recent' | 'played'>('custom');
  let draggingId = $state<string | null>(null);

  const sorted = $derived.by(() => {
    const list = foldman.library.tapes.filter((t) => !t.hidden);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (t) =>
            t.artist.toLowerCase().includes(q) ||
            t.album.toLowerCase().includes(q) ||
            t.tracks.some((track) => track.title.toLowerCase().includes(q))
        )
      : list;
    const copy = [...filtered];
    if (sort === 'artist') {
      copy.sort((a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album));
    } else if (sort === 'recent') {
      copy.sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0));
    } else if (sort === 'played') {
      copy.sort((a, b) => b.play_count - a.play_count);
    } else {
      copy.sort((a, b) => a.rack_order - b.rack_order);
    }
    return copy;
  });

  const totalTracks = $derived(foldman.visibleTapes.reduce((sum, t) => sum + t.tracks.length, 0));

  function open(tape: Tape) {
    foldman.openTape(tape.id, { autoplay: true });
  }

  function onDragStart(event: DragEvent, tape: Tape) {
    draggingId = tape.id;
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-foldman-tape', tape.id);
    event.dataTransfer.setData('text/plain', tape.id);
  }

  function toggleFavorite(event: MouseEvent, tape: Tape) {
    event.stopPropagation();
    tape.favorite = !tape.favorite;
    void foldman.saveTape($state.snapshot(tape) as Tape);
  }
</script>

<aside class="rack">
  <div class="rack-head">
    <div class="rack-title">
      The Rack
      <span>{sorted.length} {sorted.length === 1 ? 'tape' : 'tapes'} · {totalTracks} tracks</span>
    </div>

    <label class="search">
      <Icon name="search" size={14} />
      <input
        type="text"
        placeholder="Search artist, album, track…"
        bind:value={query}
        autocomplete="off"
        spellcheck="false"
      />
      {#if query}
        <button class="icon-btn tiny" onclick={() => (query = '')} title="Clear search">
          <Icon name="close" size={12} />
        </button>
      {/if}
    </label>

    <div class="rack-sort">
      {#each [
        { id: 'custom', label: 'Rack order' },
        { id: 'artist', label: 'Artist' },
        { id: 'recent', label: 'Recent' },
        { id: 'played', label: 'Most played' }
      ] as option (option.id)}
        <button
          class="sort-pill"
          class:on={sort === option.id}
          onclick={() => (sort = option.id as typeof sort)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="rack-list">
    {#if !sorted.length}
      <div class="rack-empty">
        {#if foldman.library.tapes.length}
          <strong>Nothing matches</strong>
          No tape in the rack matches “{query}”.
        {:else}
          <strong>The rack is empty</strong>
          Point KASSETE at a folder of music and it will turn every album into a tape.
        {/if}
      </div>
    {:else}
      {#each sorted as tape (tape.id)}
        <div
          class="rack-item"
          class:active={foldman.tapeId === tape.id}
          class:dragging={draggingId === tape.id}
          draggable="true"
          ondragstart={(event) => onDragStart(event, tape)}
          ondragend={() => (draggingId = null)}
          onclick={() => open(tape)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') open(tape);
          }}
          role="button"
          tabindex="0"
        >
          <div class="rack-thumb">
            <Cassette
              {tape}
              side={foldman.tapeId === tape.id ? foldman.side : tape.current_side}
              progress={
                foldman.tapeId === tape.id
                  ? foldman.tapeProgress
                  : Math.min(0.98, Math.max(0.02, tape.reel_position))
              }
              playing={foldman.tapeId === tape.id && foldman.playing}
              compact
            />
          </div>

          <div class="rack-meta">
            <div class="artist">{tape.artist}</div>
            <div class="album">{tape.album}</div>
            <div class="sub">
              <span>{tape.tracks.length} trk</span>
              <span>·</span>
              <span>{fmtTime(tape.tracks.reduce((sum, t) => sum + t.duration_ms, 0))}</span>
              {#if tape.play_count}
                <span>·</span>
                <span>{tape.play_count}×</span>
              {:else if tape.last_played_at}
                <span>·</span>
                <span>{timeAgoShort(tape.last_played_at)}</span>
              {/if}
            </div>
          </div>

          <div class="actions">
            <button
              class="icon-btn tiny"
              class:fav={tape.favorite}
              onclick={(event) => toggleFavorite(event, tape)}
              title={tape.favorite ? 'Remove from favourites' : 'Mark as favourite'}
            >
              <Icon name="heart" size={13} />
            </button>
            <button
              class="icon-btn tiny"
              onclick={(event) => {
                event.stopPropagation();
                foldman.openTape(tape.id, { autoplay: false });
                foldman.openSheet('jcard');
              }}
              title="Open the J-card"
            >
              <Icon name="info" size={13} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="rack-foot">
    <button
      class="btn small primary"
      onclick={() => void foldman.pickAndImportFiles()}
      disabled={foldman.busy}
      title="Turn any MP3, MP4 or audio file into a tape (Ctrl+O)"
    >
      <Icon name="plus" size={14} />
      Add a song or video…
    </button>
    <div class="rack-foot-aux">
      <button class="btn small" onclick={() => void foldman.pickAndAddFolder()}>
        <Icon name="folder" size={14} />
        Add folder
      </button>
      <button class="btn small" onclick={() => void foldman.rescan()} disabled={foldman.busy}>
        <Icon name="refresh" size={14} />
        {foldman.busy ? 'Scanning…' : 'Rescan'}
      </button>
    </div>
  </div>
</aside>
