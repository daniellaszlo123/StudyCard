<script lang="ts">
  import Papa from 'papaparse';
  import { i18n } from '../i18n.svelte';
  import { deckStore } from '../storage.svelte';
  import { toastStore } from '../toast.svelte';

  // Props
  let { onSelectDeck } = $props<{
    onSelectDeck: (deckId: string) => void;
  }>();

  // Local state
  let newDeckName = $state('');
  let fileInput: HTMLInputElement;

  function handleCreateDeck(e: SubmitEvent) {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    
    const deck = deckStore.createDeck(newDeckName);
    toastStore.show(i18n.t('createNewDeck') + ': ' + deck.name, 'success');
    newDeckName = '';
  }

  function handleCsvUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) {
            toastStore.show(i18n.t('importError'), 'error');
            return;
          }

          // Check if first row is a header
          let startIndex = 0;
          const firstRow = rows[0];
          if (firstRow.length >= 2) {
            const f = firstRow[0].toLowerCase().trim();
            const b = firstRow[1].toLowerCase().trim();
            if (
              f === 'front' || f === 'question' || f === 'front side' || f === 'term' || f === 'word' || f === 'előlap' || f === 'kérdés' ||
              b === 'back' || b === 'answer' || b === 'back side' || b === 'definition' || b === 'translation' || b === 'hátlap' || b === 'válasz'
            ) {
              startIndex = 1;
            }
          }

          const cards = [];
          for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 2) {
              const front = row[0]?.trim();
              const back = row[1]?.trim();
              if (front && back) {
                cards.push({
                  id: 'card-' + Math.random().toString(36).substring(2, 9) + '-' + i,
                  front,
                  back
                });
              }
            }
          }

          if (cards.length === 0) {
            toastStore.show(i18n.t('importError'), 'error');
            return;
          }

          // Set deck name to the file name (without extension)
          const deckName = file.name.replace(/\.[^/.]+$/, "");
          const deck = deckStore.createDeck(deckName, cards);
          toastStore.show(i18n.t('importSuccess') + ` (${cards.length} ${i18n.t('cardsCount')})`, 'success');
          
          // Reset file input
          target.value = '';
          
          // Auto select the imported deck
          onSelectDeck(deck.id);
        },
        error: (err: any) => {
          console.error(err);
          toastStore.show(i18n.t('importError'), 'error');
        }
      });
    };
    reader.readAsText(file);
  }

  function triggerFileInput() {
    fileInput.click();
  }

  function confirmDeleteDeck(e: MouseEvent, id: string, name: string) {
    e.stopPropagation(); // prevent opening deck detail
    if (confirm(i18n.t('deleteDeckConfirm', { name }))) {
      deckStore.deleteDeck(id);
      toastStore.show(i18n.t('delete') + ': ' + name, 'success');
    }
  }
</script>

<div class="decks-container">
  <!-- Create Deck Form -->
  <div class="form-card">
    <div class="form-title">
      <span>➕</span> {i18n.t('createNewDeck')}
    </div>
    <form onsubmit={handleCreateDeck} class="form-group" style="flex-direction: row; gap: 12px; margin-bottom: 0;">
      <input 
        type="text" 
        class="form-input" 
        style="flex: 1;"
        placeholder={i18n.t('deckNamePlaceholder')} 
        bind:value={newDeckName}
        required
      />
      <button type="submit" class="btn btn-primary">
        {i18n.t('create')}
      </button>
    </form>
  </div>

  <!-- CSV Import Zone -->
  <div class="form-card" style="margin-top: -12px;">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="csv-dropzone" onclick={triggerFileInput}>
      <span class="csv-icon">📥</span>
      <strong>{i18n.t('importCsv')}</strong>
      <p class="csv-info">{i18n.t('csvInstructions')}</p>
      <input 
        type="file" 
        accept=".csv" 
        bind:this={fileInput} 
        onchange={handleCsvUpload} 
      />
    </div>
  </div>

  <h2 style="margin-top: 12px; margin-bottom: 16px;">{i18n.t('decksHeader')}</h2>

  <!-- Decks Grid -->
  {#if deckStore.decks.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>{i18n.t('noDecks')}</p>
    </div>
  {:else}
    <div class="decks-grid">
      {#each deckStore.decks as deck (deck.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="deck-card" onclick={() => onSelectDeck(deck.id)}>
          <div>
            <div class="deck-title">{deck.name}</div>
            <div class="deck-meta">
              <span>🎴</span>
              {deck.cards.length} {i18n.t('cardsCount')}
            </div>
          </div>
          <div class="deck-card-actions">
            <button 
              class="btn btn-danger btn-icon-only" 
              title={i18n.t('delete')}
              onclick={(e) => confirmDeleteDeck(e, deck.id, deck.name)}
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
