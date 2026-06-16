<script lang="ts">
  import { i18n } from '../i18n.svelte';
  import { bankStore } from '../bankStorage.svelte';
  import { toastStore } from '../toast.svelte';
  import type { Question } from '../types';
  import { formatCardText } from '../utils';

  // Props
  let { bankId, onGoBack, onStartExam } = $props<{
    bankId: string;
    onGoBack: () => void;
    onStartExam: (count: number, mode: 'random' | 'difficult', shuffleAnswers: boolean) => void;
  }>();

  // Find current bank reactively
  let bank = $derived(bankStore.banks.find(b => b.id === bankId));

  // Bank Rename State
  let isEditingName = $state(false);
  let tempBankName = $state('');

  function startEditingName() {
    if (!bank) return;
    tempBankName = bank.name;
    isEditingName = true;
  }

  function handleRenameBank(e: SubmitEvent) {
    e.preventDefault();
    if (!bank || !tempBankName.trim()) return;

    bankStore.updateBank({
      ...bank,
      name: tempBankName.trim()
    });
    isEditingName = false;
    toastStore.show(i18n.t('save'), 'success');
  }

  // Question Add/Edit Form State
  let isFormOpen = $state(false);
  let editingQuestionId = $state<string | null>(null);
  let questionText = $state('');
  let choicesText = $state('');
  let correctAnswerText = $state('');

  function openAddForm() {
    editingQuestionId = null;
    questionText = '';
    choicesText = '';
    correctAnswerText = '';
    isFormOpen = true;
  }

  function openEditForm(q: Question) {
    editingQuestionId = q.id;
    questionText = q.question;
    choicesText = q.choices.join(' | ');
    correctAnswerText = q.correctAnswer;
    isFormOpen = true;
  }

  function closeForm() {
    isFormOpen = false;
    editingQuestionId = null;
    questionText = '';
    choicesText = '';
    correctAnswerText = '';
  }

  function handleSaveQuestion(e: SubmitEvent) {
    e.preventDefault();
    if (!bank) return;
    if (!questionText.trim() || !choicesText.trim() || !correctAnswerText.trim()) return;

    // Parse choices
    let choices = choicesText.split('|').map(s => s.trim()).filter(Boolean);
    if (choices.length === 0) {
      toastStore.show(i18n.t('importError'), 'error');
      return;
    }

    // Verify correct answer is one of the choices
    const correctTrimmed = correctAnswerText.trim();
    const correctLower = correctTrimmed.toLowerCase();
    const matchedChoice = choices.find(c => c.toLowerCase().trim() === correctLower);

    if (!matchedChoice) {
      // Correct answer must match one of the choices
      toastStore.show(i18n.t('correctAnswerPlaceholder'), 'error');
      return;
    }

    // Ensure the casing matches the choice exactly
    const correctFinal = matchedChoice;

    const updatedQuestions = [...bank.questions];

    if (editingQuestionId) {
      // Editing
      const index = updatedQuestions.findIndex(q => q.id === editingQuestionId);
      if (index !== -1) {
        updatedQuestions[index] = {
          ...updatedQuestions[index],
          question: questionText.trim(),
          choices,
          correctAnswer: correctFinal
        };
        toastStore.show(i18n.t('editQuestion') + ': ' + i18n.t('save'), 'success');
      }
    } else {
      // Adding new
      const newQuestion: Question = {
        id: 'q-' + Math.random().toString(36).substring(2, 9),
        question: questionText.trim(),
        choices,
        correctAnswer: correctFinal
      };
      updatedQuestions.push(newQuestion);
      toastStore.show(i18n.t('addQuestion') + ': ' + i18n.t('save'), 'success');
    }

    bankStore.updateBank({
      ...bank,
      questions: updatedQuestions
    });

    closeForm();
  }

  function handleDeleteQuestion(qId: string) {
    if (!bank) return;
    const updatedQuestions = bank.questions.filter(q => q.id !== qId);
    bankStore.updateBank({
      ...bank,
      questions: updatedQuestions
    });
    // Remove stats
    delete bankStore.stats[qId];
    toastStore.show(i18n.t('delete'), 'success');
  }

  function handleClearStats() {
    if (!bank) return;
    if (confirm(i18n.t('resetStats') + '?')) {
      bankStore.clearStats(bank.id);
      toastStore.show(i18n.t('statsCleared'), 'success');
    }
  }

  // Exam Setup Options
  let examSize = $state(bank ? Math.min(10, bank.questions.length) : 5);
  let examMode = $state<'random' | 'difficult'>('random');
  let shuffleAnswers = $state(false);

  // Clamp exam size dynamically if questions length changes
  $effect(() => {
    if (bank) {
      examSize = Math.max(1, Math.min(examSize, bank.questions.length));
    }
  });

  // Check if there are any difficult questions (questions with failures)
  let hasDifficultQuestions = $derived(() => {
    if (!bank) return false;
    return bank.questions.some(q => {
      const stats = bankStore.getQuestionStats(q.id);
      return stats.wrongCount > 0;
    });
  });

  function startQuiz() {
    onStartExam(examSize, examMode, shuffleAnswers);
  }
</script>

{#if bank}
  <div class="deck-detail-container">
    <!-- Back Navigation -->
    <a href="#" class="back-link" onclick={(e) => { e.preventDefault(); onGoBack(); }}>
      ⬅️ {i18n.t('backButton')}
    </a>

    <!-- Header info -->
    <div class="detail-header" style="margin-top: 16px; margin-bottom: 24px;">
      <div class="detail-title-section">
        {#if isEditingName}
          <form onsubmit={handleRenameBank} style="display: flex; gap: 8px; align-items: center;">
            <input
              type="text"
              class="form-input"
              style="font-size: 20px; padding: 4px 8px; max-width: 250px; font-family: inherit; font-weight: 600;"
              bind:value={tempBankName}
              required
              autofocus
            />
            <button type="submit" class="btn btn-success btn-icon-only" style="width: 32px; height: 32px;">✔️</button>
            <button type="button" class="btn btn-secondary btn-icon-only" style="width: 32px; height: 32px;" onclick={() => isEditingName = false}>❌</button>
          </form>
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <h2 style="margin: 0; font-size: 26px; cursor: pointer; display: flex; align-items: center; gap: 8px;" onclick={startEditingName} title="Rename Bank">
            {bank.name} <span style="font-size: 14px; opacity: 0.6; font-weight: normal;">✏️</span>
          </h2>
        {/if}
        <span class="counter" style="margin: 0;">
          {bank.questions.length} {bank.questions.length === 1 ? i18n.t('questionsCountSingle') : i18n.t('questionsCountMultiple')}
        </span>
      </div>

      <div class="detail-actions">
        <button
          class="btn btn-secondary"
          style="border-color: var(--primary); color: var(--primary);"
          onclick={openAddForm}
        >
          ➕ {i18n.t('addQuestion')}
        </button>
        <button
          class="btn btn-secondary"
          disabled={!hasDifficultQuestions()}
          onclick={handleClearStats}
          title={i18n.t('resetStats')}
        >
          🧹 {i18n.t('resetStats')}
        </button>
      </div>
    </div>

    <!-- Exam Config Card -->
    {#if bank.questions.length > 0}
      <div class="form-card exam-setup-card" style="max-width: 100%; margin: 0 0 24px 0; text-align: left;">
        <div class="form-title" style="margin-bottom: 12px;">
          <span>🎓</span> {i18n.t('examOptions')}
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: flex-end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="bank-exam-size">{i18n.t('howManyQuestions')}</label>
            <div class="exam-input-row" style="margin: 8px 0 0 0; justify-content: flex-start;">
              <input
                id="bank-exam-size"
                type="number"
                class="form-input exam-card-count"
                style="width: 100px; text-align: left;"
                min="1"
                max={bank.questions.length}
                bind:value={examSize}
              />
              <span style="color: var(--text-muted);">/ {bank.questions.length}</span>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="bank-exam-mode">{i18n.t('difficultyMode')}</label>
            <select
              id="bank-exam-mode"
              class="form-input"
              style="margin-top: 8px; width: 100%;"
              bind:value={examMode}
            >
              <option value="random">{i18n.t('modeRandom')}</option>
              <option value="difficult" disabled={!hasDifficultQuestions()}>
                {i18n.t('modeDifficult')} {!hasDifficultQuestions() ? '🔒' : ''}
              </option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0; padding-bottom: 10px;">
            <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
              <input
                type="checkbox"
                bind:checked={shuffleAnswers}
                style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);"
              />
              <span>{i18n.t('shuffleAnswers')}</span>
            </label>
          </div>

          <div>
            <button class="btn btn-primary" style="width: 100%; padding: 12px 24px;" onclick={startQuiz}>
              🚀 {i18n.t('startExam')}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Add/Edit Form -->
    {#if isFormOpen}
      <div class="form-card" style="margin-top: 24px;">
        <div class="form-title">
          <span>📝</span> {editingQuestionId ? i18n.t('editQuestion') : i18n.t('addQuestion')}
        </div>
        <form onsubmit={handleSaveQuestion}>
          <div class="form-group">
            <label class="form-label" for="q-text">{i18n.t('questionPlaceholder')}</label>
            <input
              id="q-text"
              type="text"
              class="form-input"
              bind:value={questionText}
              placeholder={i18n.t('questionPlaceholder')}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="q-choices">{i18n.t('choicesPlaceholder')}</label>
            <input
              id="q-choices"
              type="text"
              class="form-input"
              bind:value={choicesText}
              placeholder={i18n.t('choicesPlaceholder')}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="q-correct">{i18n.t('correctAnswerPlaceholder')}</label>
            <input
              id="q-correct"
              type="text"
              class="form-input"
              bind:value={correctAnswerText}
              placeholder={i18n.t('correctAnswerPlaceholder')}
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

    <!-- Questions Listing -->
    {#if bank.questions.length === 0}
      <div class="empty-state" style="margin-top: 24px;">
        <div class="empty-state-icon">📭</div>
        <p>{i18n.t('noBanks')}</p>
      </div>
    {:else}
      <div class="cards-list" style="margin-top: 24px;">
        {#each bank.questions as q (q.id)}
          {@const stats = bankStore.getQuestionStats(q.id)}
          {@const totalAttempts = stats.correctCount + stats.wrongCount}
          {@const accuracy = totalAttempts > 0 ? Math.round((stats.correctCount / totalAttempts) * 100) : 0}

          <div class="card-item" style="grid-template-columns: 1fr 1fr 150px 100px;">
            <div>
              <div class="card-side-title">{i18n.t('questionsHeader')}</div>
              <div class="card-text">{@html formatCardText(q.question)}</div>
            </div>
            <div>
              <div class="card-side-title">{i18n.t('choicesPlaceholder')}</div>
              <div class="card-text" style="font-size: 13px; color: var(--text-secondary);">
                {#each q.choices as choice, idx}
                  <span
                    style="display: inline-block; padding: 2px 6px; margin: 2px; border-radius: 4px; background: var(--bg-tertiary);"
                    class:correct-choice={choice === q.correctAnswer}
                  >
                    {idx + 1}. {choice}
                  </span>
                {/each}
              </div>
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              {#if totalAttempts > 0}
                <span class:low-accuracy={accuracy < 60} class:high-accuracy={accuracy >= 80} style="font-weight: 600;">
                  🎯 {i18n.t('statsLabel', { pct: String(accuracy), correct: String(stats.correctCount), attempts: String(totalAttempts) })}
                </span>
              {:else}
                <span>🔲 {i18n.t('noStats')}</span>
              {/if}
            </div>
            <div class="card-actions">
              <button
                class="btn btn-secondary btn-icon-only"
                title={i18n.t('edit')}
                onclick={() => openEditForm(q)}
              >
                ✏️
              </button>
              <button
                class="btn btn-danger btn-icon-only"
                title={i18n.t('delete')}
                onclick={() => handleDeleteQuestion(q.id)}
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

<style>
  .correct-choice {
    border: 1px solid var(--success) !important;
    background-color: var(--success-light) !important;
    color: var(--success) !important;
    font-weight: 500;
  }
  .low-accuracy {
    color: var(--danger);
  }
  .high-accuracy {
    color: var(--success);
  }
</style>
