(function () {
  const AUTH_ENDPOINT = '/api/dev-mode';
  const SCRIPT_ENDPOINT = '/api/dev-edit';
  const ENABLE_DEV_MODE_LAUNCHER = false;
  const DEV_MODE_QUERY_PARAM = 'dev-mode';
  const STYLE_ID = 'portfolio-dev-auth-style';

  const state = {
    launcher: null,
    panel: null,
    status: null,
    loaded: false,
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    injectStyles();

    if (await isAuthenticated()) {
      await loadDevTools(false);
      return;
    }

    if (shouldOpenPanel()) {
      openPanel();
      return;
    }

    if (ENABLE_DEV_MODE_LAUNCHER) {
      createLauncher();
      state.launcher.hidden = false;
    }
  }

  function shouldOpenPanel() {
    return new URLSearchParams(window.location.search).has(DEV_MODE_QUERY_PARAM);
  }

  async function isAuthenticated() {
    try {
      const response = await fetch(AUTH_ENDPOINT, {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.authenticated === true;
    } catch {
      return false;
    }
  }

  function createLauncher() {
    state.launcher = document.createElement('button');
    state.launcher.type = 'button';
    state.launcher.className = 'dev-auth-launcher';
    state.launcher.textContent = 'Dev mode';
    state.launcher.hidden = true;
    state.launcher.addEventListener('click', openPanel);

    document.body.appendChild(state.launcher);
  }

  function openPanel() {
    if (state.panel) {
      state.panel.hidden = false;
      state.panel.querySelector('input').focus();
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'dev-auth-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'dev-auth-title');
    panel.innerHTML = `
      <form class="dev-auth-card">
        <div class="dev-auth-header">
          <h2 id="dev-auth-title">Enter dev mode</h2>
          <button type="button" data-dev-auth-close aria-label="Close">x</button>
        </div>
        <label>
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <p data-dev-auth-status aria-live="polite"></p>
        <button type="submit">Unlock</button>
      </form>
    `;

    document.body.appendChild(panel);
    state.panel = panel;
    state.status = panel.querySelector('[data-dev-auth-status]');

    panel.querySelector('form').addEventListener('submit', handleSubmit);
    panel.querySelector('[data-dev-auth-close]').addEventListener('click', closePanel);
    panel.addEventListener('click', (event) => {
      if (event.target === panel) {
        closePanel();
      }
    });
    panel.querySelector('input').focus();
  }

  function closePanel() {
    if (state.panel) {
      state.panel.hidden = true;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const password = new FormData(form).get('password');
    setStatus('Checking password');
    form.querySelector('button[type="submit"]').disabled = true;

    try {
      const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setStatus('Incorrect password');
        return;
      }

      await loadDevTools(true);
      closePanel();
    } catch {
      setStatus('Unable to unlock dev mode');
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async function loadDevTools(autoEnable) {
    if (state.loaded) {
      return;
    }

    state.loaded = true;
    window.__portfolioDevEditAutoEnable = autoEnable;

    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_ENDPOINT;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    if (state.launcher) {
      state.launcher.remove();
    }
  }

  function setStatus(message) {
    if (state.status) {
      state.status.textContent = message;
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dev-auth-launcher {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 80;
        border: 1px solid rgb(255 255 255 / 0.16);
        border-radius: 0.5rem;
        background: rgb(9 9 11 / 0.92);
        padding: 0.6rem 0.8rem;
        color: rgb(244 244 245);
        font: 700 0.75rem/1 var(--font-mono, ui-monospace, monospace);
        cursor: pointer;
        box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 0.34);
        backdrop-filter: blur(12px);
      }

      .dev-auth-launcher:hover,
      .dev-auth-launcher:focus-visible {
        background: rgb(39 39 42);
        outline: 2px solid rgb(94 234 212 / 0.7);
        outline-offset: 2px;
      }

      .dev-auth-panel {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: grid;
        place-items: center;
        background: rgb(0 0 0 / 0.58);
        padding: 1rem;
      }

      .dev-auth-panel[hidden],
      .dev-auth-launcher[hidden] {
        display: none;
      }

      .dev-auth-card {
        width: min(100%, 22rem);
        border: 1px solid rgb(255 255 255 / 0.16);
        border-radius: 0.5rem;
        background: rgb(9 9 11);
        padding: 1rem;
        color: rgb(244 244 245);
        box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 0.34);
      }

      .dev-auth-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.9rem;
      }

      .dev-auth-header h2 {
        margin: 0;
        font-size: 1rem;
      }

      .dev-auth-card label,
      .dev-auth-card label span {
        display: grid;
        gap: 0.4rem;
      }

      .dev-auth-card input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgb(255 255 255 / 0.14);
        border-radius: 0.375rem;
        background: rgb(24 24 27);
        padding: 0.55rem 0.65rem;
        color: inherit;
        font: inherit;
      }

      .dev-auth-card button {
        border: 1px solid rgb(255 255 255 / 0.14);
        border-radius: 0.375rem;
        background: rgb(45 212 191);
        padding: 0.55rem 0.75rem;
        color: rgb(9 9 11);
        font: 700 0.85rem/1 var(--font-sans, system-ui, sans-serif);
        cursor: pointer;
      }

      .dev-auth-card button:disabled {
        cursor: wait;
        opacity: 0.7;
      }

      .dev-auth-card [data-dev-auth-close] {
        background: rgb(39 39 42);
        color: rgb(244 244 245);
      }

      .dev-auth-card [data-dev-auth-status] {
        min-height: 1.25rem;
        margin: 0.7rem 0;
        color: rgb(212 212 216);
        font-size: 0.8rem;
      }
    `;

    document.head.appendChild(style);
  }
})();
