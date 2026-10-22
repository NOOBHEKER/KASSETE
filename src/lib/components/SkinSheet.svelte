<script lang="ts">
  import Icon from './Icon.svelte';
  import { foldman } from '../store.svelte';
  import { SKINS, skinById } from '../skins';

  const skin = $derived(skinById(foldman.settings.current_skin));
</script>

<div
  class="scrim"
  onclick={(event) => {
    if (event.target === event.currentTarget) foldman.closeSheet();
  }}
  role="presentation"
>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Skins">
    <div class="sheet-head">
      <div style="flex:1;min-width:0">
        <h2>Skins</h2>
        <p>Ten machines. Same tapes.</p>
      </div>
      <button class="icon-btn" onclick={() => foldman.closeSheet()} title="Close">
        <Icon name="close" size={16} />
      </button>
    </div>

    <div class="sheet-body">
      <div class="skin-grid">
        {#each SKINS as deck (deck.id)}
          <button
            class="skin-card"
            class:active={foldman.settings.current_skin === deck.id}
            onclick={() => void foldman.setSkin(deck.id, 0)}
          >
            <div class="skin-swatch" style:background={deck.swatch}></div>
            <div class="nm">{deck.name}</div>
            <div class="tg">{deck.tagline}</div>
          </button>
        {/each}
      </div>

      <div class="field" style="margin-top:16px">
        <label>Finish — {skin.finishes[foldman.settings.current_finish] ?? skin.finishes[0]}</label>
        <div class="pill-row">
          {#each skin.finishes as finish, index (finish)}
            <button
              class="pill"
              class:on={foldman.settings.current_finish === index}
              onclick={() => void foldman.patchSettings({ current_finish: index })}
            >
              {finish}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="sheet-foot">
      <button class="btn primary" onclick={() => foldman.closeSheet()}>Done</button>
    </div>
  </div>
</div>
