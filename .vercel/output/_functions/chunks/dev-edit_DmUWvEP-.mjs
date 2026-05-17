import { readFile, writeFile } from 'node:fs/promises';
import nodePath from 'node:path';
import { i as isValidDevAuthCookie, D as DEV_AUTH_COOKIE } from './devAuth_ChGbPusx.mjs';

const devEditScript = "(function () {\n  const MODE_KEY = 'portfolio-dev-edit-mode';\n  const SAVE_ENDPOINT = '/api/dev-edit';\n  const EDITABLE_SELECTOR = [\n    'main h1',\n    'main h2',\n    'main h3',\n    'main h4',\n    'main p',\n    'main li',\n    'main blockquote',\n    'main figcaption',\n    'main span',\n    'main a',\n    'header nav a',\n    'footer p',\n    'footer a',\n  ].join(',');\n\n  const params = new URLSearchParams(window.location.search);\n  const editParam = params.get('edit');\n\n  if (editParam === '1' || editParam === 'true') {\n    localStorage.setItem(MODE_KEY, 'on');\n  }\n\n  if (editParam === '0' || editParam === 'false') {\n    localStorage.removeItem(MODE_KEY);\n  }\n\n  const state = {\n    editableElements: [],\n    enabled: localStorage.getItem(MODE_KEY) === 'on' || window.__portfolioDevEditAutoEnable === true,\n    pendingRecords: new Set(),\n    saving: false,\n    statusTimer: 0,\n    toolbar: null,\n  };\n\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', init, { once: true });\n  } else {\n    init();\n  }\n\n  function init() {\n    state.editableElements = findEditableElements();\n\n    createToolbar();\n\n    setEnabled(state.enabled);\n  }\n\n  function findEditableElements() {\n    const candidates = Array.from(document.querySelectorAll(EDITABLE_SELECTOR));\n    const directTextElements = candidates.filter((element) => (\n      hasDirectText(element) && !element.closest('[aria-hidden=\"true\"]')\n    ));\n    const editableElements = directTextElements.filter((element) => (\n      !directTextElements.some((other) => other !== element && other.contains(element))\n    ));\n    const occurrenceCounts = new Map();\n\n    return editableElements.map((element, index) => {\n      const signature = getSignature(element);\n      const occurrence = occurrenceCounts.get(signature) ?? 0;\n      occurrenceCounts.set(signature, occurrence + 1);\n\n      const record = {\n        element,\n        key: getStableKey(element, index),\n        legacyKeys: getLegacyKeys(element, index, signature, occurrence),\n        scope: getEditScope(element),\n        originalText: getPlainText(element),\n        lastSavedText: getPlainText(element),\n      };\n\n      element.dataset.devEditKey = record.key;\n      return record;\n    });\n  }\n\n  function hasDirectText(element) {\n    return Array.from(element.childNodes).some(\n      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0,\n    );\n  }\n\n  function getSignature(element) {\n    const text = getPlainText(element).replace(/\\s+/g, ' ').trim().slice(0, 120);\n    const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';\n    return `${element.tagName.toLowerCase()}|${href}|${text}`;\n  }\n\n  function getStableKey(element, index) {\n    const explicitKey = element.dataset.devEditKey;\n\n    if (explicitKey) {\n      return explicitKey;\n    }\n\n    if (element.closest('header') || element.closest('footer')) {\n      return `${window.location.pathname}|${getSignature(element)}`;\n    }\n\n    const scopedElement = element.closest('[data-dev-edit-scope]');\n    const field = element.dataset.devEditField;\n\n    if (scopedElement && field) {\n      return `${scopedElement.dataset.devEditScope}|${field}`;\n    }\n\n    return `${window.location.pathname}|editable|${index}`;\n  }\n\n  function getEditScope(element) {\n    if (element.closest('header')) {\n      return 'header';\n    }\n\n    if (element.closest('footer')) {\n      return 'footer';\n    }\n\n    return 'main';\n  }\n\n  function getLegacyKeys(element, index, signature, occurrence) {\n    const keys = [\n      `${window.location.pathname}|${signature}|${occurrence}`,\n    ];\n    const explicitKey = element.dataset.devEditKey;\n    const scopedElement = element.closest('[data-dev-edit-scope]');\n    const field = element.dataset.devEditField;\n\n    if (explicitKey) {\n      keys.push(...getExplicitLegacyKeys(explicitKey));\n    } else if (!scopedElement) {\n      keys.push(`${window.location.pathname}|editable|${index}`);\n    }\n\n    if (scopedElement && field) {\n      keys.push(...getProjectCardPageKeys(scopedElement, field));\n    }\n\n    return Array.from(new Set(keys.filter((key) => key !== getStableKey(element, index))));\n  }\n\n  function getExplicitLegacyKeys(key) {\n    const homeContactCardKeys = {\n      'home-contact-card:eyebrow': ['/|editable|44'],\n      'home-contact-card:title': ['/|editable|45'],\n      'home-contact-card:body': ['/|editable|46'],\n      'home-contact-card:cta': ['/|editable|47'],\n    };\n\n    return homeContactCardKeys[key] ?? [];\n  }\n\n  function getProjectCardPageKeys(scopedElement, field) {\n    const scope = scopedElement.dataset.devEditScope || '';\n    const projectId = scope.replace(/^project-card:/, '');\n    const projectCards = Array.from(document.querySelectorAll('[data-dev-edit-scope^=\"project-card:\"]'));\n    const cardIndex = projectCards.indexOf(scopedElement);\n    const fieldOrder = ['status', 'date', 'title', 'description', 'stack-0', 'stack-1', 'stack-2', 'stack-3', 'cta'];\n    const fieldIndex = fieldOrder.indexOf(field);\n    const baseIndex = getProjectListStartIndex();\n    const fallbackIndex = cardIndex >= 0 && fieldIndex >= 0 ? baseIndex + (cardIndex * fieldOrder.length) + fieldIndex : -1;\n\n    return [\n      `/projects/|editable|${fallbackIndex}`,\n      `/|editable|${fallbackIndex}`,\n      `/projects/|a|/projects/${projectId}/|See more|0`,\n      `/|a|/projects/${projectId}/|See more|0`,\n    ].filter((key) => !key.includes('|editable|-1'));\n  }\n\n  function getProjectListStartIndex() {\n    return window.location.pathname === '/projects/' ? 3 : 12;\n  }\n\n  function setEnabled(enabled) {\n    state.enabled = enabled;\n    document.documentElement.classList.toggle('dev-edit-enabled', enabled);\n\n    state.editableElements.forEach((record) => {\n      const { element } = record;\n      element.toggleAttribute('data-dev-editable', enabled);\n\n      if (enabled) {\n        element.setAttribute('contenteditable', 'plaintext-only');\n        element.setAttribute('spellcheck', 'true');\n        element.addEventListener('input', handleInput);\n        element.addEventListener('blur', handleBlur);\n        element.addEventListener('paste', handlePaste);\n        element.addEventListener('click', preventEditableLinkNavigation);\n        element.addEventListener('keydown', handleKeydown);\n      } else {\n        element.removeAttribute('contenteditable');\n        element.removeAttribute('spellcheck');\n        element.removeEventListener('input', handleInput);\n        element.removeEventListener('blur', handleBlur);\n        element.removeEventListener('paste', handlePaste);\n        element.removeEventListener('click', preventEditableLinkNavigation);\n        element.removeEventListener('keydown', handleKeydown);\n      }\n    });\n\n    if (enabled) {\n      localStorage.setItem(MODE_KEY, 'on');\n    } else {\n      localStorage.removeItem(MODE_KEY);\n    }\n\n    updateToolbar();\n  }\n\n  function handleInput(event) {\n    const element = event.currentTarget;\n    const record = state.editableElements.find((item) => item.element === element);\n\n    if (!record) {\n      return;\n    }\n\n    const value = getPlainText(element);\n    element.toggleAttribute('data-dev-edit-multiline', value.includes('\\n'));\n\n    if (value === record.lastSavedText) {\n      state.pendingRecords.delete(record);\n    } else {\n      state.pendingRecords.add(record);\n    }\n\n    updateToolbar();\n  }\n\n  function handleBlur(event) {\n    event.currentTarget.normalize();\n  }\n\n  function handlePaste(event) {\n    event.preventDefault();\n    const text = event.clipboardData.getData('text/plain');\n    document.execCommand('insertText', false, text);\n  }\n\n  function handleKeydown(event) {\n    if (event.key === 'Escape') {\n      event.currentTarget.blur();\n    }\n  }\n\n  function preventEditableLinkNavigation(event) {\n    if (state.enabled && event.currentTarget.tagName === 'A') {\n      event.preventDefault();\n    }\n  }\n\n  function createToolbar() {\n    const toolbar = document.createElement('div');\n    toolbar.className = 'dev-edit-toolbar';\n    toolbar.innerHTML = `\n      <button type=\"button\" data-dev-edit-toggle aria-pressed=\"false\">Edit off</button>\n      <button type=\"button\" data-dev-edit-reset-page>Reset page</button>\n      <span data-dev-edit-status aria-live=\"polite\">Ready</span>\n    `;\n\n    document.body.appendChild(toolbar);\n    state.toolbar = toolbar;\n\n    toolbar.querySelector('[data-dev-edit-toggle]').addEventListener('click', async () => {\n      await toggleEditMode();\n    });\n\n    toolbar.querySelector('[data-dev-edit-reset-page]').addEventListener('click', resetPage);\n    updateToolbar();\n  }\n\n  function updateToolbar(message) {\n    if (!state.toolbar) {\n      return;\n    }\n\n    const toggle = state.toolbar.querySelector('[data-dev-edit-toggle]');\n    const status = state.toolbar.querySelector('[data-dev-edit-status]');\n    const pendingCount = state.pendingRecords.size;\n\n    toggle.textContent = state.enabled ? 'Edit on' : 'Edit off';\n    toggle.setAttribute('aria-pressed', String(state.enabled));\n    toggle.disabled = state.saving;\n    status.textContent = message ?? (pendingCount > 0 ? `${pendingCount} staged` : 'Ready');\n  }\n\n  async function toggleEditMode() {\n    if (!state.enabled) {\n      setEnabled(true);\n      return;\n    }\n\n    try {\n      await savePendingRecords();\n      setEnabled(false);\n    } catch (error) {\n      flashStatus(error.message || 'Save failed');\n    }\n  }\n\n  async function savePendingRecords() {\n    const records = Array.from(state.pendingRecords);\n\n    if (records.length === 0) {\n      return;\n    }\n\n    state.saving = true;\n    updateToolbar(`Saving ${records.length}`);\n\n    try {\n      for (const record of records) {\n        await saveRecord(record);\n      }\n    } finally {\n      state.saving = false;\n      updateToolbar();\n    }\n  }\n\n  async function saveRecord(record) {\n    const newText = getPlainText(record.element);\n\n    if (newText === record.lastSavedText) {\n      state.pendingRecords.delete(record);\n      updateToolbar();\n      return;\n    }\n\n    try {\n      const response = await fetch(SAVE_ENDPOINT, {\n        method: 'PATCH',\n        credentials: 'same-origin',\n        headers: {\n          accept: 'application/json',\n          'content-type': 'application/json',\n        },\n        body: JSON.stringify({\n          key: record.key,\n          pathname: window.location.pathname,\n          scope: record.scope,\n          originalText: record.lastSavedText,\n          newText,\n        }),\n      });\n      const result = await response.json().catch(() => ({}));\n\n      if (!response.ok || result.ok !== true) {\n        throw new Error(result.error || 'Unable to save');\n      }\n\n      record.lastSavedText = newText;\n      state.pendingRecords.delete(record);\n      updateToolbar(`Saved ${result.file || ''}`.trim());\n    } catch (error) {\n      state.pendingRecords.add(record);\n      throw error;\n    }\n  }\n\n  function flashStatus(message) {\n    updateToolbar(message);\n    window.clearTimeout(state.statusTimer);\n    state.statusTimer = window.setTimeout(() => updateToolbar(), 1100);\n  }\n\n  function resetPage() {\n    state.editableElements.forEach((record) => {\n      setElementText(record.element, record.originalText);\n\n      if (record.originalText === record.lastSavedText) {\n        state.pendingRecords.delete(record);\n      } else {\n        state.pendingRecords.add(record);\n      }\n    });\n\n    updateToolbar();\n  }\n\n  function getPlainText(element) {\n    return element.innerText.replace(/\\r\\n/g, '\\n');\n  }\n\n  function setElementText(element, text) {\n    element.textContent = text;\n    element.toggleAttribute('data-dev-edit-multiline', text.includes('\\n'));\n  }\n})();\n";

const prerender = false;
const PROJECT_CARD_FIELD_MAP = {
  status: "status",
  date: "dateLabel",
  title: "title",
  description: "description"
};
const GET = ({ cookies }) => {
  if (!isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value)) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }
  return new Response(devEditScript, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8"
    }
  });
};
const PATCH = async ({ cookies, request }) => {
  if (!isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const edit = parseEdit(payload);
  if (!edit) {
    return Response.json({ ok: false, error: "Invalid edit payload" }, { status: 400 });
  }
  try {
    const result = await writeEdit(edit);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save edit";
    return Response.json({ ok: false, error: message }, { status: 409 });
  }
};
function parseEdit(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const edit = payload;
  if (typeof edit.key !== "string" || typeof edit.pathname !== "string" || typeof edit.scope !== "string" || typeof edit.originalText !== "string" || typeof edit.newText !== "string") {
    return null;
  }
  return {
    key: edit.key,
    pathname: edit.pathname,
    scope: edit.scope,
    originalText: normalizeText(edit.originalText),
    newText: normalizeText(edit.newText)
  };
}
async function writeEdit(edit) {
  const projectFieldMatch = /^project-(?:card|detail):([^|]+)\|(.+)$/.exec(edit.key);
  if (projectFieldMatch) {
    const [, slug, field] = projectFieldMatch;
    return writeProjectCardEdit(slug, field, edit);
  }
  return writeUniqueTextEdit(edit);
}
async function writeProjectCardEdit(slug, field, edit) {
  if (field === "cta") {
    return replaceUniqueText(sourcePath("src/components/ProjectCard.astro"), edit.originalText, edit.newText);
  }
  const stackMatch = /^stack-(\d+)$/.exec(field);
  if (stackMatch) {
    const filePath2 = sourcePath(`src/content/projects/${slug}.md`);
    const source2 = await readFile(filePath2, "utf8");
    const nextSource2 = replaceYamlListItem(source2, "stack", Number(stackMatch[1]), edit.newText);
    await writeFile(filePath2, nextSource2);
    return { file: relativeSourcePath(filePath2) };
  }
  const frontmatterField = PROJECT_CARD_FIELD_MAP[field];
  if (!frontmatterField) {
    throw new Error("This field is not repo-editable yet.");
  }
  const filePath = sourcePath(`src/content/projects/${slug}.md`);
  const source = await readFile(filePath, "utf8");
  const nextSource = replaceYamlScalar(source, frontmatterField, edit.newText);
  await writeFile(filePath, nextSource);
  return { file: relativeSourcePath(filePath) };
}
async function writeUniqueTextEdit(edit) {
  const candidates = candidateSourceFiles(edit);
  for (const filePath of candidates) {
    const result = await tryReplaceUniqueText(filePath, edit.originalText, edit.newText);
    if (result) {
      return result;
    }
  }
  throw new Error("Could not find one unambiguous source match for that text.");
}
async function replaceUniqueText(filePath, originalText, newText) {
  const result = await tryReplaceUniqueText(filePath, originalText, newText);
  if (!result) {
    throw new Error("Could not find one unambiguous source match for that text.");
  }
  return result;
}
async function tryReplaceUniqueText(filePath, originalText, newText) {
  const source = await readFile(filePath, "utf8");
  const sourceMatch = findUniqueSourceMatch(source, originalText);
  if (!sourceMatch) {
    return null;
  }
  const nextSource = `${source.slice(0, sourceMatch.start)}${escapeForSource(newText, sourceMatch.text)}${source.slice(sourceMatch.end)}`;
  await writeFile(filePath, nextSource);
  return { file: relativeSourcePath(filePath) };
}
function findUniqueSourceMatch(source, text) {
  const candidates = sourceTextCandidates(text);
  const matches = [];
  for (const candidate of candidates) {
    let start = source.indexOf(candidate);
    while (start !== -1) {
      matches.push({ start, end: start + candidate.length, text: candidate });
      start = source.indexOf(candidate, start + candidate.length);
    }
  }
  return matches.length === 1 ? matches[0] : null;
}
function sourceTextCandidates(text) {
  return Array.from(/* @__PURE__ */ new Set([
    text,
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    text.replaceAll("->", "-&gt;"),
    text.replaceAll("©", "&copy;")
  ]));
}
function escapeForSource(text, matchedSource) {
  let nextText = text;
  if (matchedSource.includes("&gt;")) {
    nextText = nextText.replaceAll(">", "&gt;");
  }
  if (matchedSource.includes("&lt;")) {
    nextText = nextText.replaceAll("<", "&lt;");
  }
  if (matchedSource.includes("&amp;")) {
    nextText = nextText.replaceAll("&", "&amp;");
  }
  if (matchedSource.includes("&copy;")) {
    nextText = nextText.replaceAll("©", "&copy;");
  }
  return nextText;
}
function replaceYamlScalar(source, field, value) {
  const escapedValue = JSON.stringify(value);
  const pattern = new RegExp(`^(${escapeRegExp(field)}:\\s*).*$`, "m");
  if (!pattern.test(source)) {
    throw new Error(`Could not find frontmatter field "${field}".`);
  }
  return source.replace(pattern, `$1${escapedValue}`);
}
function replaceYamlListItem(source, field, index, value) {
  const lines = source.split(/\r?\n/);
  const fieldIndex = lines.findIndex((line) => line.trim() === `${field}:`);
  if (fieldIndex === -1) {
    throw new Error(`Could not find frontmatter list "${field}".`);
  }
  let itemIndex = -1;
  for (let indexInFile = fieldIndex + 1; indexInFile < lines.length; indexInFile += 1) {
    const line = lines[indexInFile];
    if (!line.startsWith("  - ")) {
      break;
    }
    itemIndex += 1;
    if (itemIndex === index) {
      lines[indexInFile] = `  - ${JSON.stringify(value)}`;
      return lines.join("\n");
    }
  }
  throw new Error(`Could not find item ${index + 1} in frontmatter list "${field}".`);
}
function candidateSourceFiles(edit) {
  const { pathname, scope } = edit;
  if (!pathname.startsWith("/") || pathname.length > 200 || pathname.includes("..")) {
    throw new Error("Invalid path.");
  }
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  if (scope === "header") {
    return [sourcePath("src/components/Header.astro")];
  }
  if (scope === "footer") {
    return [sourcePath("src/components/Footer.astro")];
  }
  const candidates = [];
  if (normalizedPath === "/") {
    candidates.unshift("src/pages/index.astro");
  } else if (normalizedPath === "/about/") {
    candidates.unshift("src/pages/about.astro");
  } else if (normalizedPath === "/contact/") {
    candidates.unshift("src/pages/contact.astro");
  } else if (normalizedPath === "/resume/") {
    candidates.unshift("src/pages/resume.astro");
  } else if (normalizedPath === "/projects/") {
    candidates.unshift("src/pages/projects/index.astro");
  } else {
    const projectMatch = /^\/projects\/([^/]+)\/$/.exec(normalizedPath);
    if (projectMatch) {
      candidates.unshift(`src/content/projects/${projectMatch[1]}.md`);
      candidates.push("src/pages/projects/[slug].astro");
    }
  }
  return candidates.map(sourcePath);
}
function sourcePath(relativePath) {
  return nodePath.join(process.cwd(), relativePath);
}
function relativeSourcePath(filePath) {
  return nodePath.relative(process.cwd(), filePath).replaceAll(nodePath.sep, "/");
}
function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").trim();
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  PATCH,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
