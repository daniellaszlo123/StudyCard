<script lang="ts">
  import { i18n } from '../i18n.svelte';
  import { deckStore } from '../storage.svelte';
  import type { Card } from '../types';
  import { formatCardText } from '../utils';

  // Props
  let { deckId, onGoBack } = $props<{
    deckId: string;
    onGoBack: () => void;
  }>();

  // Find deck
  const deck = deckStore.decks.find(d => d.id === deckId);

  // Exam state
  let examStarted = $state(false);
  let totalCardsRequested = $state(deck ? Math.min(10, deck.cards.length) : 5);
  let examCards = $state<Card[]>([]);
  let currentIndex = $state(0);
  let isFlipped = $state(false);
  let answers = $state<Record<string, boolean>>({});
  let isFinished = $state(false);

  // Derived current active card
  let activeCard = $derived(examCards[currentIndex]);

  // Derived results calculations
  let correctCount = $derived(Object.values(answers).filter(Boolean).length);
  let percentage = $derived(examCards.length > 0 ? Math.round((correctCount / examCards.length) * 100) : 0);
  let incorrectCards = $derived(examCards.filter(c => answers[c.id] === false));

  function startExam() {
    if (!deck) return;
    
    // Clamp requested size
    const count = Math.max(1, Math.min(totalCardsRequested, deck.cards.length));
    
    // Shuffle and pick subset
    const shuffled = [...deck.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    examCards = shuffled.slice(0, count);
    currentIndex = 0;
    isFlipped = false;
    answers = {};
    isFinished = false;
    examStarted = true;
  }

  function handleGrade(correct: boolean) {
    if (!activeCard) return;
    
    answers[activeCard.id] = correct;
    
    if (currentIndex < examCards.length - 1) {
      currentIndex++;
      isFlipped = false;
    } else {
      isFinished = true;
    }
  }

  function handleExitExam() {
    examStarted = false;
    isFinished = false;
    onGoBack();
  }
</script>

{#if deck}
  <div class="exam-container" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;">
    
    <!-- STEP 1: SETUP EXAM -->
    {#if !examStarted}
      <div class="form-card exam-setup-card">
        <a href="#" class="back-link" style="align-self: flex-start; margin-bottom: 20px; display: inline-flex;" onclick={(e) => { e.preventDefault(); onGoBack(); }}>
          ⬅️ {i18n.t('backButton')}
        </a>
        <h2 style="margin-top: 12px;">🎓 {i18n.t('examSetup')}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">{deck.name}</p>
        
        <div class="exam-setup-body">
          <label class="form-label" for="exam-cards-input">{i18n.t('howManyCards')}</label>
          <div class="exam-input-row">
            <input 
              id="exam-cards-input"
              type="number" 
              class="form-input exam-card-count" 
              min="1" 
              max={deck.cards.length} 
              bind:value={totalCardsRequested}
            />
            <span style="color: var(--text-muted);">/ {deck.cards.length}</span>
          </div>
          
          <button class="btn btn-primary" style="width: 100%;" onclick={startExam}>
            🚀 {i18n.t('startExam')}
          </button>
        </div>
      </div>

    <!-- STEP 2: RUNNING EXAM -->
    {:else if examStarted && !isFinished && activeCard}
      <!-- Header info -->
      <div style="align-self: flex-start; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <button class="btn btn-secondary" onclick={handleExitExam}>
          🚪 {i18n.t('exitExam')}
        </button>
        <span class="progress-text">
          {i18n.t('cardProgress', { current: String(currentIndex + 1), total: String(examCards.length) })}
        </span>
      </div>

      <!-- The Exam Flashcard -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="flashcard-wrapper" onclick={() => isFlipped = !isFlipped}>
        <div class="flashcard-inner" class:flipped={isFlipped}>
          <!-- Front Side -->
          <div class="flashcard-face flashcard-front">
            <span class="card-badge">{i18n.t('frontPlaceholder')}</span>
            <div class="card-content-text">{@html formatCardText(activeCard.front)}</div>
            <span style="position: absolute; bottom: 20px; font-size: 11px; color: var(--text-muted);">
              🔄 {i18n.t('showAnswer')}
            </span>
          </div>
          
          <!-- Back Side -->
          <div class="flashcard-face flashcard-back">
            <span class="card-badge">{i18n.t('backPlaceholder')}</span>
            <div class="card-content-text">{@html formatCardText(activeCard.back)}</div>
            <span style="position: absolute; bottom: 20px; font-size: 11px; color: var(--primary);">
              🔄 {i18n.t('showAnswer')}
            </span>
          </div>
        </div>
      </div>

      <!-- Grading Options -->
      {#if !isFlipped}
        <button class="btn btn-primary" style="width: 100%; max-width: 500px;" onclick={() => isFlipped = true}>
          👁️ {i18n.t('showAnswer')}
        </button>
      {:else}
        <div class="exam-action-buttons">
          <button class="btn btn-danger" onclick={() => handleGrade(false)}>
            ❌ {i18n.t('iForgotIt')}
          </button>
          <button class="btn btn-success" onclick={() => handleGrade(true)}>
            ✅ {i18n.t('iKnewIt')}
          </button>
        </div>
      {/if}

    <!-- STEP 3: EXAM COMPLETED / RESULTS -->
    {:else if isFinished}
      <div class="results-card">
        <h2 class="results-header">🎓 {i18n.t('examResults')}</h2>
        <p style="color: var(--text-secondary);">{deck.name}</p>

        <!-- Score Ring -->
        <div class="results-score-circle" class:perfect={percentage === 100}>
          <span class="score-pct">{percentage}%</span>
          <span class="score-label">{i18n.t('score')}</span>
        </div>

        <!-- Feedback text -->
        <p class="results-feedback">
          {#if percentage === 100}
            🏆 {i18n.t('perfectScore')}
          {:else if percentage >= 70}
            ✨ {i18n.t('goodScore')}
          {:else}
            📚 {i18n.t('needsPractice')}
          {/if}
        </p>

        <p style="font-size: 14px; color: var(--text-secondary);">
          {correctCount} / {examCards.length} {i18n.t('correct').toLowerCase()}
        </p>

        <!-- List of mistakes -->
        {#if incorrectCards.length > 0}
          <div class="wrong-cards-list">
            <h3>⚠️ {i18n.t('wrongCardsHeader')}</h3>
            {#each incorrectCards as card (card.id)}
              <div class="wrong-card-item">
                <span class="wrong-card-front">{@html formatCardText(card.front)}</span>
                <span class="wrong-card-back">➔ {@html formatCardText(card.back)}</span>
              </div>
            {/each}
          </div>
        {/if}

        <div style="margin-top: 32px; display: flex; gap: 16px; justify-content: center;">
          <button class="btn btn-secondary" onclick={handleExitExam}>
            🚪 {i18n.t('exitExam')}
          </button>
          <button class="btn btn-primary" onclick={startExam}>
            🔄 {i18n.t('restartExam')}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
