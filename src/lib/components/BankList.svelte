<script lang="ts">
  import Papa from 'papaparse';
  import { i18n } from '../i18n.svelte';
  import { bankStore } from '../bankStorage.svelte';
  import { toastStore } from '../toast.svelte';

  // Props
  let { onSelectBank } = $props<{
    onSelectBank: (bankId: string) => void;
  }>();

  // Local state
  let newBankName = $state('');
  let fileInput: HTMLInputElement;

  function handleCreateBank(e: SubmitEvent) {
    e.preventDefault();
    if (!newBankName.trim()) return;

    const bank = bankStore.createBank(newBankName);
    toastStore.show(i18n.t('createNewBank') + ': ' + bank.name, 'success');
    newBankName = '';
  }

  function handleCsvUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isTxt = fileExt === 'txt';

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        delimiter: isTxt ? ';' : '',
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) {
            toastStore.show(i18n.t('importError'), 'error');
            return;
          }

          // Check if first row is a header
          let startIndex = 0;
          const firstRow = rows[0];
          if (firstRow.length >= 3) {
            const c1 = firstRow[0].toLowerCase().trim();
            const c2 = firstRow[1].toLowerCase().trim();
            const c3 = firstRow[2].toLowerCase().trim();
            if (
              c1 === 'question' || c1 === 'kérdés' ||
              c2 === 'choices' || c2 === 'options' || c2 === 'answers' || c2 === 'lehetőségek' || c2 === 'válaszok' ||
              c3 === 'answer' || c3 === 'correct' || c3 === 'correctanswer' || c3 === 'helyes' || c3 === 'helyes válasz'
            ) {
              startIndex = 1;
            }
          }

          const questions = [];
          for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 3) {
              const questionText = row[0]?.trim();
              const choicesRaw = row[1]?.trim();
              const correctAnswer = row[2]?.trim();

              if (questionText && choicesRaw && correctAnswer) {
                // Parse choices: split by '|', ';', or ','
                let choices: string[] = [];
                if (choicesRaw.includes('|')) {
                  choices = choicesRaw.split('|').map(s => s.trim());
                } else if (choicesRaw.includes(';')) {
                  choices = choicesRaw.split(';').map(s => s.trim());
                } else {
                  choices = choicesRaw.split(',').map(s => s.trim());
                }

                // Clean empty choices
                choices = choices.filter(Boolean);

                // Safe check: make sure correct answer exists in the choices list
                const correctTrimmed = correctAnswer.toLowerCase().trim();
                const found = choices.some(c => c.toLowerCase().trim() === correctTrimmed);
                if (!found && choices.length > 0) {
                  // Add it if it's missing from the choices to prevent a broken question UI
                  choices.push(correctAnswer);
                }

                if (choices.length > 0) {
                  questions.push({
                    id: 'q-' + Math.random().toString(36).substring(2, 9) + '-' + i,
                    question: questionText,
                    choices,
                    correctAnswer: correctAnswer
                  });
                }
              }
            }
          }

          if (questions.length === 0) {
            toastStore.show(i18n.t('importError'), 'error');
            return;
          }

          // Create bank named after the file (without extension)
          const bankName = file.name.replace(/\.[^/.]+$/, "");
          const bank = bankStore.createBank(bankName, questions);
          toastStore.show(i18n.t('importSuccess') + ` (${questions.length} ${i18n.t('questionsCount')})`, 'success');

          // Reset file input
          target.value = '';

          // Navigate directly to the bank
          onSelectBank(bank.id);
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

  function confirmDeleteBank(e: MouseEvent, id: string, name: string) {
    e.stopPropagation(); // prevent opening bank detail
    if (confirm(i18n.t('deleteBankConfirm', { name }))) {
      bankStore.deleteBank(id);
      toastStore.show(i18n.t('delete') + ': ' + name, 'success');
    }
  }
</script>

<div class="decks-container">
  <!-- Create Bank Form -->
  <div class="form-card">
    <div class="form-title">
      <span>🎓</span> {i18n.t('createNewBank')}
    </div>
    <form onsubmit={handleCreateBank} class="form-group" style="flex-direction: row; gap: 12px; margin-bottom: 0;">
      <input
        type="text"
        class="form-input"
        style="flex: 1;"
        placeholder={i18n.t('bankNamePlaceholder')}
        bind:value={newBankName}
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
      <strong>{i18n.t('importBankCsv')}</strong>
      <p class="csv-info">{i18n.t('bankCsvInstructions')}</p>
      <input
        type="file"
        accept=".csv,.txt"
        bind:this={fileInput}
        onchange={handleCsvUpload}
      />
    </div>
  </div>

  <h2 style="margin-top: 12px; margin-bottom: 16px;">{i18n.t('questionBanksHeader')}</h2>

  <!-- Banks Grid -->
  {#if bankStore.banks.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>{i18n.t('noBanks')}</p>
    </div>
  {:else}
    <div class="decks-grid">
      {#each bankStore.banks as bank (bank.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="deck-card" onclick={() => onSelectBank(bank.id)}>
          <div>
            <div class="deck-title">{bank.name}</div>
            <div class="deck-meta">
              <span>🎓</span>
              {bank.questions.length} {bank.questions.length === 1 ? i18n.t('questionsCountSingle') : i18n.t('questionsCountMultiple')}
            </div>
          </div>
          <div class="deck-card-actions">
            <button
              class="btn btn-danger btn-icon-only"
              title={i18n.t('delete')}
              onclick={(e) => confirmDeleteBank(e, bank.id, bank.name)}
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
