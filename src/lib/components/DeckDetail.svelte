<script lang="ts">
  import { i18n } from '../i18n.svelte';
  import { deckStore } from '../storage.svelte';
  import { toastStore } from '../toast.svelte';
  import type { Card } from '../types';
  import { formatCardText } from '../utils';

  // Props
  let { deckId, onGoBack, onStartPractice, onStartExam } = $props<{
    deckId: string;
    onGoBack: () => void;
    onStartPractice: () => void;
    onStartExam: () => void;
  }>();

  // Find current deck reactively
  let deck = $derived(deckStore.decks.find(d => d.id === deckId));

  // Card Add/Edit Form State
  let isFormOpen = $state(false);
  let editingCardId = $state<string | null>(null);
  let frontText = $state('');
  let backText = $state('');

  function openAddForm() {
    editingCardId = null;
    frontText = '';
    backText = '';
    isFormOpen = true;
  }

  function openEditForm(card: Card) {
    editingCardId = card.id;
    frontText = card.front;
    backText = card.back;
    isFormOpen = true;
  }

  function closeForm() {
    isFormOpen = false;
    editingCardId = null;
    frontText = '';
    backText = '';
  }

  function handleSaveCard(e: SubmitEvent) {
    e.preventDefault();
    if (!deck) return;
    if (!frontText.trim() || !backText.trim()) return;

    const updatedCards = [...deck.cards];

    if (editingCardId) {
      // Editing existing card
      const index = updatedCards.findIndex(c => c.id === editingCardId);
      if (index !== -1) {
        updatedCards[index] = {
          ...updatedCards[index],
          front: frontText.trim(),
          back: backText.trim()
        };
        toastStore.show(i18n.t('editCard') + ': ' + i18n.t('save'), 'success');
      }
    } else {
      // Adding new card
      const newCard: Card = {
        id: 'card-' + Math.random().toString(36).substring(2, 9),
        front: frontText.trim(),
        back: backText.trim()
      };
      updatedCards.push(newCard);
      toastStore.show(i18n.t('addCard') + ': ' + i18n.t('save'), 'success');
    }

    deckStore.updateDeck({
      ...deck,
      cards: updatedCards
    });

    closeForm();
  }

  function handleDeleteCard(cardId: string) {
    if (!deck) return;
    const updatedCards = deck.cards.filter(c => c.id !== cardId);
    deckStore.updateDeck({
      ...deck,
      cards: updatedCards
    });
    toastStore.show(i18n.t('delete'), 'success');
  }

  function handleShuffle() {
    if (!deck) return;
    deckStore.shuffleDeck(deck.id);
    toastStore.show(i18n.t('shuffle'), 'success');
  }
</script>

{#if deck}
  <div class="deck-detail-container">
    <!-- Back Navigation -->
    <a href="#" class="back-link" onclick={(e) => { e.preventDefault(); onGoBack(); }}>
      ⬅️ {i18n.t('backButton')}
    </a>

    <!-- Header info and action trigger buttons -->
    <div class="detail-header" style="margin-top: 16px;">
      <div class="detail-title-section">
        <h2 style="margin: 0; font-size: 26px;">{deck.name}</h2>
        <span class="counter" style="margin: 0;">{deck.cards.length} {i18n.t('cardsCount')}</span>
      </div>
      
      <div class="detail-actions">
        <button 
          class="btn btn-primary" 
          disabled={deck.cards.length === 0}
          onclick={onStartPractice}
        >
          📖 {i18n.t('practiceMode')}
        </button>
        <button 
          class="btn btn-success" 
          disabled={deck.cards.length === 0}
          onclick={onStartExam}
        >
          🎓 {i18n.t('examMode')}
        </button>
        <button 
          class="btn btn-secondary" 
          disabled={deck.cards.length < 2}
          onclick={handleShuffle}
        >
          🔀 {i18n.t('shuffle')}
        </button>
        <button class="btn btn-secondary" style="border-color: var(--primary); color: var(--primary);" onclick={openAddForm}>
          ➕ {i18n.t('addCard')}
        </button>
      </div>
    </div>

    <!-- Edit/Add Form -->
    {#if isFormOpen}
      <div class="form-card" style="margin-top: 24px;">
        <div class="form-title">
          <span>📝</span> {editingCardId ? i18n.t('editCard') : i18n.t('addCard')}
        </div>
        <form onsubmit={handleSaveCard}>
          <div class="form-group">
            <label class="form-label" for="card-front">{i18n.t('frontPlaceholder')}</label>
            <input 
              id="card-front"
              type="text" 
              class="form-input" 
              bind:value={frontText} 
              placeholder={i18n.t('frontPlaceholder')}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="card-back">{i18n.t('backPlaceholder')}</label>
            <input 
              id="card-back"
              type="text" 
              class="form-input" 
              bind:value={backText} 
              placeholder={i18n.t('backPlaceholder')}
              required
            />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick={closeForm}>
              {i18n.t('cancel')}
            </button>
            <button type="submit" class="btn btn-primary">
              {i18n.t('save')}
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Cards List -->
    {#if deck.cards.length === 0}
      <div class="empty-state" style="margin-top: 24px;">
        <div class="empty-state-icon">📭</div>
        <p>{i18n.t('emptyDeck')}</p>
      </div>
    {:else}
      <div class="cards-list">
        {#each deck.cards as card (card.id)}
          <div class="card-item">
            <div>
              <div class="card-side-title">{i18n.t('frontPlaceholder')}</div>
              <div class="card-text">{@html formatCardText(card.front)}</div>
            </div>
            <div>
              <div class="card-side-title">{i18n.t('backPlaceholder')}</div>
              <div class="card-text" style="color: var(--primary); font-weight: 500;">{@html formatCardText(card.back)}</div>
            </div>
            <div class="card-actions">
              <button 
                class="btn btn-secondary btn-icon-only" 
                title={i18n.t('edit')}
                onclick={() => openEditForm(card)}
              >
                ✏️
              </button>
              <button 
                class="btn btn-danger btn-icon-only" 
                title={i18n.t('delete')}
                onclick={() => handleDeleteCard(card.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
