<script lang="ts">
  import Icon from './Icon.svelte';
  import Cassette from './Cassette.svelte';
  import { foldman } from '../store.svelte';
  import { LABEL_COLORS, LABEL_STYLES, SHELLS } from '../skins';
  import { clamp, fmtTime, fmtRelative, tapeCondition } from '../format';

  const tape = $derived(foldman.tape);
  const condition = $derived(tape ? tapeCondition(tape.wear, tape.dirt) : tapeCondition());

  let winding = $state(false);
  let windMoved = $state(0);
  let pencil = $state({ x: 0, y: 0 });
  let windStart = { x: 0, progress: 0 };

  function touch() {
    if (!tape) return;
    void foldman.saveTape($state.snapshot(tape) as any);
  }

  function wipe() {
    if (!tape) return;
    tape.dirt = 0;
    tape.wear = Math.max(0, tape.wear - 0.04);
    touch();
    foldman.toast('Heads cleaned — the tape sounds brighter already');
  }

  function rewind() {
    if (!tape) return;
    foldman.seekToFraction(0);
    tape.reel_position = 0;
    void foldman.flushTapeState();
    foldman.toast('Wound back to the start by hand');
  }

  function retension() {
    if (!tape) return;
    tape.stretch = Math.max(0, tape.stretch - 0.2);
    touch();
    foldman.toast('Tape re-tensioned');
  }

  function beginWind(event: PointerEvent) {
    if (!tape || event.button !== 0) return;
    if (foldman.playing) foldman.pause();
    winding = true;
    windMoved = 0;
    windStart = { x: event.clientX, progress: foldman.sideProgress };
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pencil = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveWind(event: PointerEvent) {
    if (!winding || !tape) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pencil = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const dx = event.clientX - windStart.x;
    windMoved = Math.max(windMoved, Math.abs(dx));
    foldman.seekToFraction(clamp(windStart.progress + dx / 380, 0, 0.999));
  }

  function endWind(event: PointerEvent) {
    if (!winding || !tape) return;
    winding = false;
    const host = event.currentTarget as HTMLElement;
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);

    const over = Math.max(0, windMoved - 180);
    const added = Math.min(0.22, over * 0.0007);
    if (added > 0.002 && foldman.settings.tape_stretch_enabled) {
      tape.stretch = clamp(tape.stretch + added, 0, 1);
      touch();
    }

    if (added > 0.012) {
      foldman.toast('Easy — you stretched the tape a little. Re-tension it on the bench.');
    } else if (windMoved > 24) {
      foldman.toast(`Wound by hand — ${condition.label.toLowerCase()}.`);
    }
  }
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="The bench">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>The Bench</h2>
        <p>
          {#if tape}
            {tape.artist} — {tape.album}
          {:else}
            No tape on the bench
          {/if}
        </p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body">
      {#if tape}
        <div class="section bench-preview-section">
          <div class="row spread">
            <h3>On the bench</h3>
            <span class="condition-tag" data-tone={condition.tone}>{condition.label}</span>
          </div>

          <div
            class="bench-preview"
            class:winding
            onpointerdown={beginWind}
            onpointermove={moveWind}
            onpointerup={endWind}
            onpointercancel={endWind}
            role="presentation"
            title="Drag with the pencil to wind the tape"
          >
            <Cassette
              tape={tape}
              side={tape.current_side}
              progress={foldman.tapeProgress}
              playing={foldman.playing}
            />
            {#if winding}
              <span class="bench-pencil" style:left={`${pencil.x}px`} style:top={`${pencil.y}px`}>
                <Icon name="pencil" size={38} />
              </span>
            {/if}
          </div>

          <p class="bench-comment">{condition.comment}</p>
          <p class="hint">
            Pencil wind: drag across the hubs to pack the tape by hand. Wind too hard and it stretches.
          </p>
        </div>

        <div class="section">
          <h3>The label</h3>
          <div class="grid-2">
            <div class="field">
              <label for="bench-artist">Artist on the label</label>
              <input
                id="bench-artist"
                type="text"
                placeholder={tape.artist}
                value={tape.label_artist ?? ''}
                oninput={(event) => {
                  tape.label_artist = (event.currentTarget as HTMLInputElement).value || null;
                }}
                onchange={touch}
              />
            </div>
            <div class="field">
              <label for="bench-album">Album on the label</label>
              <input
                id="bench-album"
                type="text"
                placeholder={tape.album}
                value={tape.label_album ?? ''}
                oninput={(event) => {
                  tape.label_album = (event.currentTarget as HTMLInputElement).value || null;
                }}
                onchange={touch}
              />
            </div>
          </div>

          <div class="field">
            <label>Handwriting</label>
            <div class="pill-row">
              {#each LABEL_STYLES as style (style.id)}
                <button
                  class="pill"
                  class:on={tape.label_style === style.id}
                  onclick={() => {
                    if (!tape) return;
                    tape.label_style = style.id;
                    touch();
                  }}
                >
                  {style.name}
                </button>
              {/each}
            </div>
          </div>

          <div class="field">
            <label>Ink</label>
            <div class="swatch-row">
              {#each LABEL_COLORS as colour (colour)}
                <button
                  class="swatch"
                  class:on={tape.label_color === colour}
                  style:background={colour}
                  onclick={() => {
                    if (!tape) return;
                    tape.label_color = colour;
                    touch();
                  }}
                  title={colour}
                >
                  <span class="sr">Ink {colour}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>The shell</h3>
          <div class="pill-row">
            {#each SHELLS as shell (shell.id)}
              <button
                class="pill"
                class:on={tape.shell === shell.id}
                onclick={() => {
                  if (!tape) return;
                  tape.shell = shell.id;
                  touch();
                  if (shell.id === 'C' || shell.id === 'D') {
                    foldman.toast('Clear shell — the mechanism shows through the plastic.');
                  }
                }}
              >
                {shell.name}
              </button>
            {/each}
          </div>
          <p class="hint">
            Frosted blue and Clear are see-through — the mechanism shows through the plastic.
          </p>
        </div>

        <div class="section">
          <h3>Condition</h3>
          <p class="hint">
            The deck keeps its own counter. Every minute on the heads adds a little dirt and wear, so
            your most-played tapes age on their own.
          </p>

          <div class="meter-field">
            <div class="row spread">
              <span>Wear</span>
              <b>{Math.round(tape.wear * 100)}%</b>
            </div>
            <input
              class="slider accent"
              type="range"
              min="0"
              max="100"
              value={Math.round(tape.wear * 100)}
              oninput={(event) => {
                if (!tape) return;
                tape.wear = Number((event.currentTarget as HTMLInputElement).value) / 100;
              }}
              onchange={touch}
            />
            <p class="meter-caption" data-tone={condition.tone}>{condition.label}</p>
          </div>

          <div class="meter-field">
            <div class="row spread">
              <span>Dirt &amp; grime</span>
              <b>{Math.round(tape.dirt * 100)}%</b>
            </div>
            <input
              class="slider accent"
              type="range"
              min="0"
              max="100"
              value={Math.round(tape.dirt * 100)}
              oninput={(event) => {
                if (!tape) return;
                tape.dirt = Number((event.currentTarget as HTMLInputElement).value) / 100;
              }}
              onchange={touch}
            />
            <p class="meter-caption">
              {tape.dirt >= 0.9 ? '100% dirt left. Rub it off.' : condition.comment}
            </p>
          </div>

          <div class="meter-field">
            <div class="row spread">
              <span>Stretch</span>
              <b>{Math.round(tape.stretch * 100)}%</b>
            </div>
            <input
              class="slider accent"
              type="range"
              min="0"
              max="100"
              value={Math.round(tape.stretch * 100)}
              oninput={(event) => {
                if (!tape) return;
                tape.stretch = Number((event.currentTarget as HTMLInputElement).value) / 100;
              }}
              onchange={touch}
            />
          </div>

          <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:12px">
            <button class="btn small" onclick={wipe}>
              <Icon name="sparkle" size={14} />
              Clean the heads
            </button>
            <button class="btn small" onclick={retension}>
              <Icon name="refresh" size={14} />
              Re-tension
            </button>
            <button class="btn small" onclick={rewind}>
              <Icon name="rew" size={14} />
              Wind to the start
            </button>
          </div>
        </div>

        <div class="section">
          <h3>Log book</h3>
          <dl class="stats">
            <div><dt>Plays</dt><dd>{tape.play_count}</dd></div>
            <div><dt>Last played</dt><dd>{fmtRelative(tape.last_played_at)}</dd></div>
            <div><dt>This session</dt><dd>{fmtTime(foldman.sessionPlayMs)}</dd></div>
            <div><dt>Total runtime</dt><dd>{fmtTime(tape.tracks.reduce((sum, t) => sum + t.duration_ms, 0))}</dd></div>
            <div><dt>Side</dt><dd>{tape.current_side}</dd></div>
          </dl>
          <p class="hint path">{tape.folder}</p>
        </div>
      {:else}
        <p class="hint">Load a tape first, then bring it here for new labels and a clean-up.</p>
      {/if}
    </div>

    <div class="sheet-foot">
      <button class="btn" onclick={() => foldman.closeSheet()}>Done</button>
    </div>
  </div>
</div>
