<script lang="ts">
  import { i18n } from '../i18n.svelte';
  import { supabaseService, getUsername } from '../supabase.svelte';
  import { toastStore } from '../toast.svelte';

  // Props
  let { isOpen, onClose } = $props<{
    isOpen: boolean;
    onClose: () => void;
  }>();

  // Local States
  let activeTab = $state<'login' | 'register'>('login');
  let username = $state('');
  let password = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);

  // Close modal when hitting ESC
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }

  // Handle Form Submission
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    errorMessage = '';
    isSubmitting = true;

    try {
      if (activeTab === 'login') {
        const res = await supabaseService.signIn(username, password);
        if (res.error) {
          errorMessage = res.error;
        } else {
          toastStore.show(i18n.t('syncSuccess'), 'success');
          onClose();
        }
      } else {
        const res = await supabaseService.signUp(username, password);
        if (res.error) {
          if (res.error.toLowerCase().includes('already registered') || res.error.toLowerCase().includes('user_already_exists')) {
            errorMessage = i18n.t('usernameTaken');
          } else {
            errorMessage = res.error;
          }
        } else {
          // Supabase signup works: attempt immediate login since auto-confirm is enabled in project
          const loginRes = await supabaseService.signIn(username, password);
          if (loginRes.error) {
            errorMessage = loginRes.error;
          } else {
            toastStore.show(i18n.t('syncSuccess'), 'success');
            onClose();
          }
        }
      }
    } catch (err: any) {
      errorMessage = err.message || 'An unexpected error occurred';
    } finally {
      isSubmitting = false;
    }
  }

  function handleLogout() {
    supabaseService.signOut();
    onClose();
  }

  async function handleSyncNow() {
    await supabaseService.merge();
  }

  async function handlePull() {
    if (confirm(i18n.t('importError') + '? ' + i18n.t('resetStats') + '?')) { // fallback warn
      await supabaseService.pull();
    }
  }

  async function handlePush() {
    if (confirm(i18n.t('save') + '? Overwrite cloud data?')) {
      await supabaseService.push();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={onClose}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <button class="modal-close" onclick={onClose} aria-label="Close modal">❌</button>

      <!-- DB Not Configured -->
      {#if !supabaseService.isConfigured}
        <div class="config-warning">
          <div style="font-size: 40px; margin-bottom: 16px;">☁️⚠️</div>
          <h3>{i18n.t('cloudSyncSettings')}</h3>
          <p style="margin: 16px 0; line-height: 1.6; color: var(--text-secondary);">
            {i18n.t('dbNotConfigured')}
          </p>
          <button class="btn btn-secondary" style="width: 100%;" onclick={onClose}>
            {i18n.t('backButton')}
          </button>
        </div>

      <!-- User Logged In / Sync Panel -->
      {:else if supabaseService.user}
        <div class="sync-panel">
          <h2 class="form-title">☁️ {i18n.t('cloudSyncSettings')}</h2>
          <p class="user-info">
            {i18n.t('account')}: <strong>{getUsername(supabaseService.user.email)}</strong>
          </p>

          {#if supabaseService.lastSynced}
            <p class="sync-status">
              🔄 {i18n.t('lastSynced', { time: supabaseService.lastSynced })}
            </p>
          {/if}

          <!-- Sync Loader -->
          {#if supabaseService.syncLoading}
            <div class="sync-spinner-wrapper">
              <div class="sync-spinner"></div>
              <span>Syncing...</span>
            </div>
          {/if}

          <!-- Main Actions -->
          <div class="sync-actions-group">
            <button 
              class="btn btn-primary sync-btn" 
              onclick={handleSyncNow} 
              disabled={supabaseService.syncLoading}
            >
              🔄 {i18n.t('syncNow')}
            </button>

            <!-- Auto Sync Toggle -->
            <label class="auto-sync-toggle">
              <input 
                type="checkbox" 
                bind:checked={supabaseService.autoSync} 
                style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);"
              />
              <span>{i18n.t('autoSync')}</span>
            </label>
          </div>

          <!-- Advanced Manual Overrides -->
          <details class="advanced-overrides">
            <summary style="font-size: 13px; color: var(--text-muted); cursor: pointer; margin-bottom: 8px;">
              ⚙️ Advanced Overrides
            </summary>
            <div style="display: flex; gap: 12px; margin-top: 8px;">
              <button 
                class="btn btn-secondary" 
                style="flex: 1; font-size: 12px; padding: 8px;" 
                onclick={handlePull}
                disabled={supabaseService.syncLoading}
              >
                ⬇️ Pull (Cloud ➔ Local)
              </button>
              <button 
                class="btn btn-secondary" 
                style="flex: 1; font-size: 12px; padding: 8px;" 
                onclick={handlePush}
                disabled={supabaseService.syncLoading}
              >
                ⬆️ Push (Local ➔ Cloud)
              </button>
            </div>
          </details>

          <!-- Logout Button -->
          <button class="btn btn-danger" style="width: 100%; margin-top: 24px;" onclick={handleLogout}>
            🚪 {i18n.t('logout')}
          </button>
        </div>

      <!-- Auth Form (Log In / Register) -->
      {:else}
        <div class="auth-tabs">
          <button 
            class="tab-btn" 
            class:active={activeTab === 'login'} 
            onclick={() => { activeTab = 'login'; errorMessage = ''; }}
          >
            {i18n.t('login')}
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'register'} 
            onclick={() => { activeTab = 'register'; errorMessage = ''; }}
          >
            {i18n.t('register')}
          </button>
        </div>

        <form onsubmit={handleSubmit} class="auth-form" style="margin-top: 20px;">
          <div class="form-group">
            <label class="form-label" for="auth-username">{i18n.t('username')}</label>
            <input
              id="auth-username"
              type="text"
              class="form-input"
              bind:value={username}
              placeholder={i18n.t('username')}
              required
              disabled={isSubmitting}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="auth-password">{i18n.t('password')}</label>
            <input
              id="auth-password"
              type="password"
              class="form-input"
              bind:value={password}
              placeholder={i18n.t('password')}
              required
              disabled={isSubmitting}
            />
          </div>

          {#if errorMessage}
            <div class="auth-error">
              ⚠️ {errorMessage}
            </div>
          {/if}

          <button 
            type="submit" 
            class="btn btn-primary" 
            style="width: 100%; margin-top: 16px; padding: 12px;"
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              <div class="spinner"></div>
            {:else if activeTab === 'login'}
              🚀 {i18n.t('login')}
            {:else}
              ➕ {i18n.t('register')}
            {/if}
          </button>

          <div class="auth-footer-toggle" style="margin-top: 16px; text-align: center; font-size: 13px; color: var(--text-secondary);">
            {#if activeTab === 'login'}
              <span>{i18n.t('dontHaveAccount')}</span>
              <!-- svelte-ignore a11y_invalid_attribute -->
              <a href="#" onclick={(e) => { e.preventDefault(); activeTab = 'register'; errorMessage = ''; }} style="color: var(--primary); font-weight: 600; margin-left: 4px; text-decoration: none;">
                {i18n.t('register')}
              </a>
            {:else}
              <span>{i18n.t('alreadyHaveAccount')}</span>
              <!-- svelte-ignore a11y_invalid_attribute -->
              <a href="#" onclick={(e) => { e.preventDefault(); activeTab = 'login'; errorMessage = ''; }} style="color: var(--primary); font-weight: 600; margin-left: 4px; text-decoration: none;">
                {i18n.t('login')}
              </a>
            {/if}
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(6px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 16px;
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 450px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-card);
    padding: 32px;
    position: relative;
    animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes modalScale {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .modal-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-muted);
    transition: var(--transition-smooth);
    outline: none;
  }
  .modal-close:hover {
    color: var(--text-primary);
  }

  .config-warning {
    text-align: center;
    padding: 16px 8px;
  }

  .auth-tabs {
    display: flex;
    border-bottom: 2px solid var(--border-color);
    margin-bottom: 20px;
  }

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    padding: 12px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: var(--transition-smooth);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    outline: none;
  }

  .tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .auth-error {
    background-color: var(--danger-light);
    color: var(--danger);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 14px;
    line-height: 1.4;
  }

  .sync-panel {
    text-align: left;
  }

  .user-info {
    font-size: 15px;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .sync-status {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 20px;
  }

  .sync-actions-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .sync-btn {
    width: 100%;
    padding: 14px;
  }

  .auto-sync-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    user-select: none;
  }

  .advanced-overrides {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 12px;
    background-color: var(--bg-primary);
    margin-top: 12px;
  }

  .sync-spinner-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 8px 0 16px 0;
    color: var(--primary);
    font-size: 13px;
    font-weight: 500;
  }

  .sync-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--primary-light);
    border-top: 2px solid var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
