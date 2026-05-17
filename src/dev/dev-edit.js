(function () {
  const MODE_KEY = 'portfolio-dev-edit-mode';
  const SAVE_ENDPOINT = '/api/dev-edit';
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
  const editParam = params.get('edit');

  if (editParam === '1' || editParam === 'true') {
    localStorage.setItem(MODE_KEY, 'on');
  }

  if (editParam === '0' || editParam === 'false') {
    localStorage.removeItem(MODE_KEY);
  }

  const state = {
    editableElements: [],
    enabled: localStorage.getItem(MODE_KEY) === 'on' || window.__portfolioDevEditAutoEnable === true,
    pendingRecords: new Set(),
    saving: false,
    statusTimer: 0,
    toolbar: null,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function init() {
    state.editableElements = findEditableElements();

    createToolbar();

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

    return editableElements.map((element, index) => {
      const signature = getSignature(element);
      const occurrence = occurrenceCounts.get(signature) ?? 0;
      occurrenceCounts.set(signature, occurrence + 1);

      const record = {
        element,
        key: getStableKey(element, index),
        legacyKeys: getLegacyKeys(element, index, signature, occurrence),
        scope: getEditScope(element),
        originalText: getPlainText(element),
        lastSavedText: getPlainText(element),
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

  function getStableKey(element, index) {
    const explicitKey = element.dataset.devEditKey;

    if (explicitKey) {
      return explicitKey;
    }

    if (element.closest('header') || element.closest('footer')) {
      return `${window.location.pathname}|${getSignature(element)}`;
    }

    const scopedElement = element.closest('[data-dev-edit-scope]');
    const field = element.dataset.devEditField;

    if (scopedElement && field) {
      return `${scopedElement.dataset.devEditScope}|${field}`;
    }

    return `${window.location.pathname}|editable|${index}`;
  }

  function getEditScope(element) {
    if (element.closest('header')) {
      return 'header';
    }

    if (element.closest('footer')) {
      return 'footer';
    }

    return 'main';
  }

  function getLegacyKeys(element, index, signature, occurrence) {
    const keys = [
      `${window.location.pathname}|${signature}|${occurrence}`,
    ];
    const explicitKey = element.dataset.devEditKey;
    const scopedElement = element.closest('[data-dev-edit-scope]');
    const field = element.dataset.devEditField;

    if (explicitKey) {
      keys.push(...getExplicitLegacyKeys(explicitKey));
    } else if (!scopedElement) {
      keys.push(`${window.location.pathname}|editable|${index}`);
    }

    if (scopedElement && field) {
      keys.push(...getProjectCardPageKeys(scopedElement, field));
    }

    return Array.from(new Set(keys.filter((key) => key !== getStableKey(element, index))));
  }

  function getExplicitLegacyKeys(key) {
    const homeContactCardKeys = {
      'home-contact-card:eyebrow': ['/|editable|44'],
      'home-contact-card:title': ['/|editable|45'],
      'home-contact-card:body': ['/|editable|46'],
      'home-contact-card:cta': ['/|editable|47'],
    };

    return homeContactCardKeys[key] ?? [];
  }

  function getProjectCardPageKeys(scopedElement, field) {
    const scope = scopedElement.dataset.devEditScope || '';
    const projectId = scope.replace(/^project-card:/, '');
    const projectCards = Array.from(document.querySelectorAll('[data-dev-edit-scope^="project-card:"]'));
    const cardIndex = projectCards.indexOf(scopedElement);
    const fieldOrder = ['status', 'date', 'title', 'description', 'stack-0', 'stack-1', 'stack-2', 'stack-3', 'cta'];
    const fieldIndex = fieldOrder.indexOf(field);
    const baseIndex = getProjectListStartIndex();
    const fallbackIndex = cardIndex >= 0 && fieldIndex >= 0 ? baseIndex + (cardIndex * fieldOrder.length) + fieldIndex : -1;

    return [
      `/projects/|editable|${fallbackIndex}`,
      `/|editable|${fallbackIndex}`,
      `/projects/|a|/projects/${projectId}/|See more|0`,
      `/|a|/projects/${projectId}/|See more|0`,
    ].filter((key) => !key.includes('|editable|-1'));
  }

  function getProjectListStartIndex() {
    return window.location.pathname === '/projects/' ? 3 : 12;
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
    element.toggleAttribute('data-dev-edit-multiline', value.includes('\n'));

    if (value === record.lastSavedText) {
      state.pendingRecords.delete(record);
    } else {
      state.pendingRecords.add(record);
    }

    updateToolbar();
  }

  function handleBlur(event) {
    event.currentTarget.normalize();
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
      <button type="button" data-dev-edit-toggle aria-pressed="false">Edit off</button>
      <button type="button" data-dev-edit-reset-page>Reset page</button>
      <span data-dev-edit-status aria-live="polite">Ready</span>
    `;

    document.body.appendChild(toolbar);
    state.toolbar = toolbar;

    toolbar.querySelector('[data-dev-edit-toggle]').addEventListener('click', async () => {
      await toggleEditMode();
    });

    toolbar.querySelector('[data-dev-edit-reset-page]').addEventListener('click', resetPage);
    updateToolbar();
  }

  function updateToolbar(message) {
    if (!state.toolbar) {
      return;
    }

    const toggle = state.toolbar.querySelector('[data-dev-edit-toggle]');
    const status = state.toolbar.querySelector('[data-dev-edit-status]');
    const pendingCount = state.pendingRecords.size;

    toggle.textContent = state.enabled ? 'Edit on' : 'Edit off';
    toggle.setAttribute('aria-pressed', String(state.enabled));
    toggle.disabled = state.saving;
    status.textContent = message ?? (pendingCount > 0 ? `${pendingCount} staged` : 'Ready');
  }

  async function toggleEditMode() {
    if (!state.enabled) {
      setEnabled(true);
      return;
    }

    try {
      await savePendingRecords();
      setEnabled(false);
    } catch (error) {
      flashStatus(error.message || 'Save failed');
    }
  }

  async function savePendingRecords() {
    const records = Array.from(state.pendingRecords);

    if (records.length === 0) {
      return;
    }

    state.saving = true;
    updateToolbar(`Saving ${records.length}`);

    try {
      for (const record of records) {
        await saveRecord(record);
      }
    } finally {
      state.saving = false;
      updateToolbar();
    }
  }

  async function saveRecord(record) {
    const newText = getPlainText(record.element);

    if (newText === record.lastSavedText) {
      state.pendingRecords.delete(record);
      updateToolbar();
      return;
    }

    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          key: record.key,
          pathname: window.location.pathname,
          scope: record.scope,
          originalText: record.lastSavedText,
          newText,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'Unable to save');
      }

      record.lastSavedText = newText;
      state.pendingRecords.delete(record);
      updateToolbar(`Saved ${result.file || ''}`.trim());
    } catch (error) {
      state.pendingRecords.add(record);
      throw error;
    }
  }

  function flashStatus(message) {
    updateToolbar(message);
    window.clearTimeout(state.statusTimer);
    state.statusTimer = window.setTimeout(() => updateToolbar(), 1100);
  }

  function resetPage() {
    state.editableElements.forEach((record) => {
      setElementText(record.element, record.originalText);

      if (record.originalText === record.lastSavedText) {
        state.pendingRecords.delete(record);
      } else {
        state.pendingRecords.add(record);
      }
    });

    updateToolbar();
  }

  function getPlainText(element) {
    return element.innerText.replace(/\r\n/g, '\n');
  }

  function setElementText(element, text) {
    element.textContent = text;
    element.toggleAttribute('data-dev-edit-multiline', text.includes('\n'));
  }
})();
