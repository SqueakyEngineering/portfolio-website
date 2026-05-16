(function () {
  const STORAGE_KEY = 'portfolio-dev-edits:v1';
  const MODE_KEY = 'portfolio-dev-edit-mode';
  const SAVE_DELAY = 180;
  const EDITABLE_SELECTOR = [
    'main h1',
    'main h2',
    'main h3',
    'main h4',
    'main p',
    'main li',
    'main blockquote',
    'main figcaption',
    'main span',
    'main a',
    'header nav a',
    'footer p',
    'footer a',
  ].join(',');

  const params = new URLSearchParams(window.location.search);
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const editParam = params.get('edit');

  if (editParam === '1' || editParam === 'true') {
    localStorage.setItem(MODE_KEY, 'on');
  }

  if (editParam === '0' || editParam === 'false') {
    localStorage.removeItem(MODE_KEY);
  }

  const state = {
    edits: readEdits(),
    editableElements: [],
    enabled: localStorage.getItem(MODE_KEY) === 'on',
    saveTimer: 0,
    statusTimer: 0,
    toolbar: null,
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    state.editableElements = findEditableElements();
    applySavedText();

    if (isLocalHost || state.enabled || editParam !== null) {
      createToolbar();
    }

    setEnabled(state.enabled);
  }

  function findEditableElements() {
    const candidates = Array.from(document.querySelectorAll(EDITABLE_SELECTOR));
    const directTextElements = candidates.filter((element) => (
      hasDirectText(element) && !element.closest('[aria-hidden="true"]')
    ));
    const editableElements = directTextElements.filter((element) => (
      !directTextElements.some((other) => other !== element && other.contains(element))
    ));
    const occurrenceCounts = new Map();

    return editableElements.map((element) => {
      const signature = getSignature(element);
      const occurrence = occurrenceCounts.get(signature) ?? 0;
      occurrenceCounts.set(signature, occurrence + 1);

      const record = {
        element,
        key: `${window.location.pathname}|${signature}|${occurrence}`,
        originalText: getPlainText(element),
      };

      element.dataset.devEditKey = record.key;
      return record;
    });
  }

  function hasDirectText(element) {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0,
    );
  }

  function getSignature(element) {
    const text = getPlainText(element).replace(/\s+/g, ' ').trim().slice(0, 120);
    const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';
    return `${element.tagName.toLowerCase()}|${href}|${text}`;
  }

  function applySavedText() {
    state.editableElements.forEach((record) => {
      if (Object.prototype.hasOwnProperty.call(state.edits, record.key)) {
        record.element.textContent = state.edits[record.key];
      }
    });
  }

  function setEnabled(enabled) {
    state.enabled = enabled;
    document.documentElement.classList.toggle('dev-edit-enabled', enabled);

    state.editableElements.forEach((record) => {
      const { element } = record;
      element.toggleAttribute('data-dev-editable', enabled);

      if (enabled) {
        element.setAttribute('contenteditable', 'plaintext-only');
        element.setAttribute('spellcheck', 'true');
        element.addEventListener('input', handleInput);
        element.addEventListener('blur', handleBlur);
        element.addEventListener('paste', handlePaste);
        element.addEventListener('click', preventEditableLinkNavigation);
        element.addEventListener('keydown', handleKeydown);
      } else {
        element.removeAttribute('contenteditable');
        element.removeAttribute('spellcheck');
        element.removeEventListener('input', handleInput);
        element.removeEventListener('blur', handleBlur);
        element.removeEventListener('paste', handlePaste);
        element.removeEventListener('click', preventEditableLinkNavigation);
        element.removeEventListener('keydown', handleKeydown);
      }
    });

    if (enabled) {
      localStorage.setItem(MODE_KEY, 'on');
    } else {
      localStorage.removeItem(MODE_KEY);
    }

    updateToolbar();
  }

  function handleInput(event) {
    const element = event.currentTarget;
    const record = state.editableElements.find((item) => item.element === element);

    if (!record) {
      return;
    }

    const value = getPlainText(element);

    if (value === record.originalText) {
      delete state.edits[record.key];
    } else {
      state.edits[record.key] = value;
    }

    scheduleSave();
  }

  function handleBlur(event) {
    event.currentTarget.normalize();
    saveEdits();
  }

  function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.currentTarget.blur();
    }
  }

  function preventEditableLinkNavigation(event) {
    if (state.enabled && event.currentTarget.tagName === 'A') {
      event.preventDefault();
    }
  }

  function createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'dev-edit-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-dev-edit-toggle></button>
      <button type="button" data-dev-edit-reset-page>Reset page</button>
      <button type="button" data-dev-edit-reset-all>Reset all</button>
      <span data-dev-edit-status aria-live="polite"></span>
    `;

    document.body.appendChild(toolbar);
    state.toolbar = toolbar;

    toolbar.querySelector('[data-dev-edit-toggle]').addEventListener('click', () => {
      setEnabled(!state.enabled);
    });

    toolbar.querySelector('[data-dev-edit-reset-page]').addEventListener('click', resetPage);
    toolbar.querySelector('[data-dev-edit-reset-all]').addEventListener('click', resetAll);
    updateToolbar();
  }

  function updateToolbar(message) {
    if (!state.toolbar) {
      return;
    }

    const toggle = state.toolbar.querySelector('[data-dev-edit-toggle]');
    const status = state.toolbar.querySelector('[data-dev-edit-status]');
    const pageEditCount = state.editableElements.filter((record) => (
      Object.prototype.hasOwnProperty.call(state.edits, record.key)
    )).length;

    toggle.textContent = state.enabled ? 'Edit on' : 'Edit off';
    toggle.setAttribute('aria-pressed', String(state.enabled));
    status.textContent = message ?? `${pageEditCount} saved`;
  }

  function scheduleSave() {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(saveEdits, SAVE_DELAY);
    updateToolbar('Saving');
  }

  function saveEdits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.edits));
    flashStatus('Saved');
  }

  function flashStatus(message) {
    updateToolbar(message);
    window.clearTimeout(state.statusTimer);
    state.statusTimer = window.setTimeout(() => updateToolbar(), 1100);
  }

  function resetPage() {
    state.editableElements.forEach((record) => {
      delete state.edits[record.key];
      record.element.textContent = record.originalText;
    });

    saveEdits();
  }

  function resetAll() {
    state.edits = {};
    state.editableElements.forEach((record) => {
      record.element.textContent = record.originalText;
    });

    saveEdits();
  }

  function readEdits() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function getPlainText(element) {
    return element.innerText.replace(/\r\n/g, '\n');
  }
})();
