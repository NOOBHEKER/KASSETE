<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { SHELLS } from '../skins';
  import { fmtRelative } from '../format';

  const tape = $derived(foldman.tape);
  const shellName = $derived(
    tape ? (SHELLS.find((s) => s.id === tape.shell)?.name ?? 'Cream') : 'Cream'
  );
  const clear = $derived(!!tape && (tape.shell === 'C' || tape.shell === 'D'));
  const pct = (v: number) => `${Math.round((v ?? 0) * 100)}%`;

  const parts = [
    {
      n: 1,
      name: 'The tape itself',
      text: 'Type I ferric oxide on a 12 µm polyester base. 1/8 inch wide, four tracks — two per side, flipped by the deck.',
    },
    {
      n: 2,
      name: 'Pressure pad',
      text: 'A felt pad on a bronze spring that pushes the tape against the play head. Without it, the head gap loses contact and the treble disappears.',
    },
    {
      n: 3,
      name: 'Felt spring',
      text: 'The little leaf spring behind the pad. Tension here is why a worn cassette sounds dull: the pad flattens and the tape lifts off the head.',
    },
    {
      n: 4,
      name: 'Pinch roller & capstan',
      text: 'The deck’s capstan drives the tape at 4.76 cm/s, pinching it against a rubber roller. Wow and flutter are born here.',
    },
    {
      n: 5,
      name: 'Guide rollers',
      text: 'Two fixed posts that keep the tape on the centre line, so the head reads the same pair of tracks on every pass.',
    },
    {
      n: 6,
      name: 'Hubs & reel packs',
      text: 'The tape is wound on two hubs. As side A plays, the left pack shrinks and the right grows — exactly what the reels show.',
    },
    {
      n: 7,
      name: 'Slip sheets',
      text: 'Graphite-coated washers between the pack and the shell. They let the reel spin freely without dragging on the plastic.',
    },
    {
      n: 8,
      name: 'Metal shield',
      text: 'A spring-steel plate behind the head opening that keeps hum and radio interference out of the playback head.',
    },
    {
      n: 9,
      name: 'Erase-protection tab',
      text: 'Break the tab out and the deck refuses to record — the original “read-only mode”, invented in 1966.',
    },
    {
      n: 10,
      name: 'Screws',
      text: 'Five of them hold the two shell halves together. Clear shells show the whole mechanism; cream shells hide it.',
    },
  ];
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet wide" role="dialog" aria-modal="true" aria-label="Inside a cassette">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>Inside a cassette</h2>
        <p>
          {#if tape}
            {shellName} shell · {tape.tracks.length} tracks · {clear ? 'you can see straight through it' : 'solid shell'}
          {:else}
            What the plastic is hiding
          {/if}
        </p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body">
      <div class="insights-top">
        <div class="insights-art" class:clear>
          <svg viewBox="0 0 460 250" role="img" aria-label="Cassette internals">
            <defs>
              <linearGradient id="ixShell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="rgba(255,255,255,.34)" />
                <stop offset="1" stop-color="rgba(255,255,255,.08)" />
              </linearGradient>
              <radialGradient id="ixPack" cx="50%" cy="42%" r="60%">
                <stop offset="0" stop-color="#8a6b45" />
                <stop offset="0.7" stop-color="#5d452b" />
                <stop offset="1" stop-color="#352516" />
              </radialGradient>
            </defs>

            <rect x="12" y="14" width="436" height="214" rx="20" fill="url(#ixShell)" stroke="rgba(35,32,28,.24)" stroke-width="2" />

            <!-- hubs -->
            <circle cx="126" cy="120" r="52" fill="url(#ixPack)" />
            <circle cx="126" cy="120" r="17" fill="#efe6d2" stroke="rgba(35,32,28,.35)" stroke-width="2" />
            <circle cx="334" cy="120" r="42" fill="url(#ixPack)" />
            <circle cx="334" cy="120" r="17" fill="#efe6d2" stroke="rgba(35,32,28,.35)" stroke-width="2" />

            <!-- tape path to the head opening -->
            <path
              d="M126 172 L126 196 L188 208 L272 208 L334 196 L334 162"
              fill="none"
              stroke="#4b341f"
              stroke-width="5"
              stroke-linecap="round"
            />
            <path
              d="M126 172 L126 196 L188 208 L272 208 L334 196 L334 162"
              fill="none"
              stroke="#8a6b45"
              stroke-width="2"
              stroke-linecap="round"
              opacity="0.7"
            />

            <!-- head opening -->
            <rect x="176" y="212" width="108" height="26" rx="8" fill="rgba(20,20,24,.72)" />
            <rect x="196" y="219" width="26" height="12" rx="3" fill="#cfd6dd" opacity="0.75" />
            <circle cx="250" cy="225" r="7" fill="#2f2f36" stroke="#cfd6dd" stroke-width="2" />
            <rect x="272" y="219" width="26" height="12" rx="3" fill="#cfd6dd" opacity="0.55" />

            <!-- guide rollers -->
            <rect x="176" y="188" width="10" height="26" rx="4" fill="#cfd6dd" opacity="0.55" />
            <rect x="274" y="188" width="10" height="26" rx="4" fill="#cfd6dd" opacity="0.55" />

            <!-- shield -->
            <rect x="150" y="26" width="160" height="18" rx="9" fill="rgba(207,214,221,.4)" stroke="rgba(35,32,28,.18)" />

            <!-- screws -->
            <g fill="rgba(35,32,28,.4)">
              <circle cx="34" cy="36" r="6" />
              <circle cx="426" cy="36" r="6" />
              <circle cx="34" cy="206" r="6" />
              <circle cx="426" cy="206" r="6" />
              <circle cx="230" cy="36" r="6" />
            </g>

            <!-- numbered hotspots -->
            <g class="ix-hot">
              {#each [[126, 120, 6], [230, 240, 2], [252, 196, 3], [250, 225, 4], [182, 200, 5], [334, 120, 1], [400, 70, 7], [230, 60, 8], [420, 180, 9], [56, 232, 10]] as [x, y, n]}
                <circle cx={x} cy={y} r="11" />
                <text x={x} y={y + 4}>{n}</text>
              {/each}
            </g>
          </svg>
        </div>

        <div class="insights-stats">
          <h3>{tape ? tape.album : 'No tape'}</h3>
          <p>{tape ? tape.artist : 'Load a cassette to read its health'}</p>
          <dl>
            <div><dt>Shell</dt><dd>{shellName}</dd></div>
            <div><dt>Wear</dt><dd>{pct(tape?.wear ?? 0)}</dd></div>
            <div><dt>Dirt</dt><dd>{pct(tape?.dirt ?? 0)}</dd></div>
            <div><dt>Stretch</dt><dd>{pct(tape?.stretch ?? 0)}</dd></div>
            <div><dt>Plays</dt><dd>{tape?.play_count ?? 0}</dd></div>
            <div><dt>Last played</dt><dd>{fmtRelative(tape?.last_played_at ?? null)}</dd></div>
          </dl>
          {#if tape}
            <button class="btn small" onclick={() => foldman.openSheet('bench')}>
              <Icon name="sparkle" size={13} />
              Restore it on the bench
            </button>
          {/if}
        </div>
      </div>

      <ul class="insights-list">
        {#each parts as part (part.n)}
          <li>
            <span class="ix-n">{part.n}</span>
            <div>
              <b>{part.name}</b>
              <p>{part.text}</p>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>
