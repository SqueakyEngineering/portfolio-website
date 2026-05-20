import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import devEditScript from '../../dev/dev-edit.js?raw';
import { DEV_AUTH_COOKIE, isValidDevAuthCookie } from '../../lib/devAuth';

export const prerender = false;

const PROJECT_CARD_FIELD_MAP: Record<string, string> = {
  status: 'status',
  date: 'dateLabel',
  title: 'title',
  description: 'description',
};

export const GET: APIRoute = ({ cookies }) => {
  if (!isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value)) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }

  return new Response(devEditScript, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/javascript; charset=utf-8',
    },
  });
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  if (!isValidDevAuthCookie(cookies.get(DEV_AUTH_COOKIE)?.value)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const edit = parseEdit(payload);

  if (!edit) {
    return Response.json({ ok: false, error: 'Invalid edit payload' }, { status: 400 });
  }

  try {
    const result = await writeEdit(edit);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save edit';
    return Response.json({ ok: false, error: message }, { status: 409 });
  }
};

interface EditPayload {
  key: string;
  pathname: string;
  scope: string;
  originalText: string;
  newText: string;
}

function parseEdit(payload: unknown): EditPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const edit = payload as Record<string, unknown>;

  if (
    typeof edit.key !== 'string'
    || typeof edit.pathname !== 'string'
    || typeof edit.scope !== 'string'
    || typeof edit.originalText !== 'string'
    || typeof edit.newText !== 'string'
  ) {
    return null;
  }

  return {
    key: edit.key,
    pathname: edit.pathname,
    scope: edit.scope,
    originalText: normalizeText(edit.originalText),
    newText: normalizeText(edit.newText),
  };
}

async function writeEdit(edit: EditPayload) {
  const projectFieldMatch = /^project-(?:card|detail):([^|]+)\|(.+)$/.exec(edit.key);

  if (projectFieldMatch) {
    const [, slug, field] = projectFieldMatch;
    return writeProjectCardEdit(slug, field, edit);
  }

  return writeUniqueTextEdit(edit);
}

async function writeProjectCardEdit(slug: string, field: string, edit: EditPayload) {
  if (field === 'cta') {
    return replaceUniqueText(sourcePath('src/components/ProjectCard.astro'), edit.originalText, edit.newText);
  }

  const stackMatch = /^stack-(\d+)$/.exec(field);

  if (stackMatch) {
    const filePath = sourcePath(`src/content/projects/${slug}.md`);
    const source = await readFile(filePath, 'utf8');
    const nextSource = replaceYamlListItem(source, 'stack', Number(stackMatch[1]), edit.newText);
    await writeFile(filePath, nextSource);
    return { file: relativeSourcePath(filePath) };
  }

  const frontmatterField = PROJECT_CARD_FIELD_MAP[field];

  if (!frontmatterField) {
    throw new Error('This field is not repo-editable yet.');
  }

  const filePath = sourcePath(`src/content/projects/${slug}.md`);
  const source = await readFile(filePath, 'utf8');
  const nextSource = replaceYamlScalar(source, frontmatterField, edit.newText);
  await writeFile(filePath, nextSource);
  return { file: relativeSourcePath(filePath) };
}

async function writeUniqueTextEdit(edit: EditPayload) {
  const candidates = candidateSourceFiles(edit);

  for (const filePath of candidates) {
    const result = await tryReplaceUniqueText(filePath, edit.originalText, edit.newText);

    if (result) {
      return result;
    }
  }

  throw new Error('Could not find one unambiguous source match for that text.');
}

async function replaceUniqueText(filePath: string, originalText: string, newText: string) {
  const result = await tryReplaceUniqueText(filePath, originalText, newText);

  if (!result) {
    throw new Error('Could not find one unambiguous source match for that text.');
  }

  return result;
}

async function tryReplaceUniqueText(filePath: string, originalText: string, newText: string) {
  const source = await readFile(filePath, 'utf8');
  const sourceMatch = findUniqueSourceMatch(source, originalText);

  if (!sourceMatch) {
    return null;
  }

  const nextSource = `${source.slice(0, sourceMatch.start)}${escapeForSource(newText, sourceMatch.text)}${source.slice(sourceMatch.end)}`;
  await writeFile(filePath, nextSource);
  return { file: relativeSourcePath(filePath) };
}

function findUniqueSourceMatch(source: string, text: string) {
  const candidates = sourceTextCandidates(text);
  const matches: Array<{ start: number; end: number; text: string }> = [];

  for (const candidate of candidates) {
    let start = source.indexOf(candidate);

    while (start !== -1) {
      matches.push({ start, end: start + candidate.length, text: candidate });
      start = source.indexOf(candidate, start + candidate.length);
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

function sourceTextCandidates(text: string) {
  return Array.from(new Set([
    text,
    text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    text.replaceAll('->', '-&gt;'),
    text.replaceAll('©', '&copy;'),
  ]));
}

function escapeForSource(text: string, matchedSource: string) {
  let nextText = text;

  if (matchedSource.includes('&gt;')) {
    nextText = nextText.replaceAll('>', '&gt;');
  }

  if (matchedSource.includes('&lt;')) {
    nextText = nextText.replaceAll('<', '&lt;');
  }

  if (matchedSource.includes('&amp;')) {
    nextText = nextText.replaceAll('&', '&amp;');
  }

  if (matchedSource.includes('&copy;')) {
    nextText = nextText.replaceAll('©', '&copy;');
  }

  return nextText;
}

function replaceYamlScalar(source: string, field: string, value: string) {
  const escapedValue = JSON.stringify(value);
  const pattern = new RegExp(`^(${escapeRegExp(field)}:\\s*).*$`, 'm');

  if (!pattern.test(source)) {
    throw new Error(`Could not find frontmatter field "${field}".`);
  }

  return source.replace(pattern, `$1${escapedValue}`);
}

function replaceYamlListItem(source: string, field: string, index: number, value: string) {
  const lines = source.split(/\r?\n/);
  const fieldIndex = lines.findIndex((line) => line.trim() === `${field}:`);

  if (fieldIndex === -1) {
    throw new Error(`Could not find frontmatter list "${field}".`);
  }

  let itemIndex = -1;

  for (let indexInFile = fieldIndex + 1; indexInFile < lines.length; indexInFile += 1) {
    const line = lines[indexInFile];

    if (!line.startsWith('  - ')) {
      break;
    }

    itemIndex += 1;

    if (itemIndex === index) {
      lines[indexInFile] = `  - ${JSON.stringify(value)}`;
      return lines.join('\n');
    }
  }

  throw new Error(`Could not find item ${index + 1} in frontmatter list "${field}".`);
}

function candidateSourceFiles(edit: EditPayload) {
  const { pathname, scope } = edit;

  if (!pathname.startsWith('/') || pathname.length > 200 || pathname.includes('..')) {
    throw new Error('Invalid path.');
  }

  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;

  if (scope === 'header') {
    return [sourcePath('src/components/Header.astro')];
  }

  if (scope === 'footer') {
    return [sourcePath('src/components/Footer.astro')];
  }

  const candidates: string[] = [];

  if (normalizedPath === '/') {
    candidates.unshift('src/pages/index.astro');
  } else if (normalizedPath === '/about/') {
    candidates.unshift('src/pages/about.astro');
  } else if (normalizedPath === '/contact/') {
    candidates.unshift('src/pages/contact.astro');
  } else if (normalizedPath === '/resume/') {
    candidates.unshift('src/pages/resume.astro');
  } else if (normalizedPath === '/projects/') {
    candidates.unshift('src/pages/projects/index.astro');
  } else if (normalizedPath === '/projects/under-construction/') {
    candidates.unshift('src/pages/projects/under-construction.astro');
  } else {
    const projectMatch = /^\/projects\/([^/]+)\/$/.exec(normalizedPath);

    if (projectMatch) {
      candidates.unshift(`src/content/projects/${projectMatch[1]}.md`);
      candidates.push('src/pages/projects/[slug].astro');
    }
  }

  return candidates.map(sourcePath);
}

function sourcePath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

function relativeSourcePath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
