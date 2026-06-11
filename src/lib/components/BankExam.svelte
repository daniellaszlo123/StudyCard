<script lang="ts">
  import { i18n } from '../i18n.svelte';
  import { bankStore } from '../bankStorage.svelte';
  import type { Question } from '../types';
  import { formatCardText } from '../utils';

  // Props
  let { bankId, count, mode, onGoBack } = $props<{
    bankId: string;
    count: number;
    mode: 'random' | 'difficult';
    onGoBack: () => void;
  }>();

  // Find bank
  const bank = bankStore.banks.find(b => b.id === bankId);

  // Exam session states
  let examStarted = $state(false);
  let examQuestions = $state<Question[]>([]);
  let currentIndex = $state(0);
  let selectedChoice = $state<string | null>(null);
  let answers = $state<Record<string, { selected: string; isCorrect: boolean }>>({});
  let isFinished = $state(false);

  // Derived current active question
  let activeQuestion = $derived(examQuestions[currentIndex]);

  // Derived results calculations
  let correctCount = $derived(Object.values(answers).filter(a => a.isCorrect).length);
  let percentage = $derived(examQuestions.length > 0 ? Math.round((correctCount / examQuestions.length) * 100) : 0);

  function startExam() {
    if (!bank) return;

    const limit = Math.max(1, Math.min(count, bank.questions.length));

    if (mode === 'difficult') {
      // Get all questions mapped with stats
      const qWithStats = bank.questions.map(q => {
        const stats = bankStore.getQuestionStats(q.id);
        const total = stats.correctCount + stats.wrongCount;
        const diffRatio = total > 0 ? stats.wrongCount / total : 0;
        return { q, stats, diffRatio };
      });

      // Filter questions where the user made at least one mistake
      const difficult = qWithStats.filter(item => item.stats.wrongCount > 0);

      // Sort by failure ratio descending, then by total wrong count descending
      difficult.sort((a, b) => {
        if (b.diffRatio !== a.diffRatio) {
          return b.diffRatio - a.diffRatio;
        }
        return b.stats.wrongCount - a.stats.wrongCount;
      });

      // Take up to the requested exam limit
      const selected = difficult.slice(0, limit).map(item => item.q);

      // If we don't have enough incorrect questions, fill with random remaining questions
      if (selected.length < limit) {
        const selectedIds = new Set(selected.map(q => q.id));
        const remaining = bank.questions.filter(q => !selectedIds.has(q.id));

        // Shuffle remaining
        const shuffledRemaining = [...remaining];
        for (let i = shuffledRemaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledRemaining[i], shuffledRemaining[j]] = [shuffledRemaining[j], shuffledRemaining[i]];
        }

        const needed = limit - selected.length;
        selected.push(...shuffledRemaining.slice(0, needed));
      }

      examQuestions = selected;
    } else {
      // Standard random exam mode: Shuffle all questions
      const shuffled = [...bank.questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      examQuestions = shuffled.slice(0, limit);
    }

    currentIndex = 0;
    selectedChoice = null;
    answers = {};
    isFinished = false;
    examStarted = true;
  }

  function handleSelectChoice(choice: string) {
    if (selectedChoice !== null || !activeQuestion) return;

    selectedChoice = choice;
    const correctClean = activeQuestion.correctAnswer.trim().toLowerCase();
    const selectedClean = choice.trim().toLowerCase();
    const isCorrect = (selectedClean === correctClean);

    // Save statistics in the bank storage
    bankStore.recordAnswer(activeQuestion.id, isCorrect);

    // Record user answer locally for results screen
    answers[activeQuestion.id] = {
      selected: choice,
      isCorrect
    };
  }

  function handleNext() {
    if (currentIndex < examQuestions.length - 1) {
      currentIndex++;
      selectedChoice = null;
    } else {
      isFinished = true;
    }
  }

  function handleExitExam() {
    examStarted = false;
    isFinished = false;
    onGoBack();
  }

  // Initialize exam on mount
  startExam();
</script>

{#if bank}
  <div class="exam-container" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;">
    
    <!-- EXAM IN PROGRESS -->
    {#if examStarted && !isFinished && activeQuestion}
      <!-- Header info -->
      <div style="align-self: flex-start; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <button class="btn btn-secondary" onclick={handleExitExam}>
          🚪 {i18n.t('exitExam')}
        </button>
        <span class="progress-text">
          {i18n.t('cardProgress', { current: String(currentIndex + 1), total: String(examQuestions.length) })}
        </span>
      </div>

      <!-- Question Panel -->
      <div class="question-panel">
        <span class="card-badge" style="position: static; transform: none; display: inline-block; margin-bottom: 16px;">
          {i18n.t('questionsHeader')}
        </span>
        <h3 class="question-text">
          {@html formatCardText(activeQuestion.question)}
        </h3>
      </div>

      <!-- Choices Buttons list -->
      <div class="choices-list">
        {#each activeQuestion.choices as choice, idx}
          {@const isSelected = selectedChoice === choice}
          {@const isCorrectChoice = choice === activeQuestion.correctAnswer}
          {@const btnClass = selectedChoice !== null 
            ? (isCorrectChoice ? 'correct' : (isSelected ? 'selected-incorrect' : ''))
            : ''}

          <button 
            class="choice-btn {btnClass}" 
            disabled={selectedChoice !== null}
            onclick={() => handleSelectChoice(choice)}
          >
            <div style="display: flex; align-items: center;">
              <span class="choice-badge">{String.fromCharCode(65 + idx)}</span>
              <span>{choice}</span>
            </div>
            {#if selectedChoice !== null}
              {#if isCorrectChoice}
                <span>✅</span>
              {:else if isSelected}
                <span>❌</span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>

      <!-- Next Button control -->
      {#if selectedChoice !== null}
        <button class="btn btn-primary" style="width: 100%; max-width: 600px; padding: 14px;" onclick={handleNext}>
          {i18n.t('nextQuestion')} ➡️
        </button>
      {/if}

    <!-- EXAM RESULTS -->
    {:else if isFinished}
      <div class="results-card" style="max-width: 600px;">
        <h2 class="results-header">🎓 {i18n.t('examResults')}</h2>
        <p style="color: var(--text-secondary);">{bank.name}</p>

        <!-- Score Circle -->
        <div class="results-score-circle" class:perfect={percentage === 100}>
          <span class="score-pct">{percentage}%</span>
          <span class="score-label">{i18n.t('score')}</span>
        </div>

        <!-- Feedback message -->
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
          {correctCount} / {examQuestions.length} {i18n.t('correct').toLowerCase()}
        </p>

        <!-- Listing of all questions taken -->
        <div class="wrong-cards-list">
          <h3 style="margin-bottom: 16px;">🔍 {i18n.t('examResults')}:</h3>
          {#each examQuestions as q (q.id)}
            {@const ans = answers[q.id]}
            <div class="question-result-item" class:correct-item={ans?.isCorrect} class:incorrect-item={!ans?.isCorrect}>
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">
                {@html formatCardText(q.question)}
              </div>
              <div style="font-size: 13px; display: flex; flex-direction: column; gap: 4px;">
                <span class="ans-label" class:text-success={ans?.isCorrect} class:text-danger={!ans?.isCorrect}>
                  👤 {i18n.t('yourAnswerWas', { answer: ans?.selected || '' })}
                </span>
                {#if !ans?.isCorrect}
                  <span class="ans-label text-success">
                    ✅ {i18n.t('correctAnswerWas', { answer: q.correctAnswer })}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Action buttons -->
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

<style>
  .question-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    width: 100%;
    max-width: 600px;
    text-align: center;
    box-shadow: var(--shadow-sm);
  }

  .question-text {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.5;
    word-break: break-word;
    color: var(--text-primary);
  }

  .choices-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 600px;
    margin: 24px 0;
  }

  .choice-btn {
    background-color: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px 20px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: var(--transition-smooth);
    color: var(--text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    outline: none;
  }

  .choice-btn:hover:not(:disabled) {
    border-color: var(--primary);
    background-color: var(--bg-tertiary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }

  .choice-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .choice-btn:disabled {
    cursor: not-allowed;
  }

  .choice-btn.selected-incorrect {
    border-color: var(--danger);
    background-color: var(--danger-light);
    color: var(--danger);
    font-weight: 600;
  }

  .choice-btn.correct {
    border-color: var(--success);
    background-color: var(--success-light);
    color: var(--success);
    font-weight: 600;
  }

  .choice-badge {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    margin-right: 12px;
  }

  .choice-btn.correct .choice-badge {
    background-color: var(--success);
    color: white;
  }

  .choice-btn.selected-incorrect .choice-badge {
    background-color: var(--danger);
    color: white;
  }

  .question-result-item {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 12px;
    text-align: left;
    transition: var(--transition-smooth);
  }

  .correct-item {
    border-left: 4px solid var(--success);
  }

  .incorrect-item {
    border-left: 4px solid var(--danger);
  }

  .ans-label {
    font-weight: 500;
  }

  .text-success {
    color: var(--success);
  }

  .text-danger {
    color: var(--danger);
  }
</style>
