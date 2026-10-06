import { copy } from '../lib/copy.ts';
import { editorCopy } from '../lib/editor-copy.ts';
import { MAX_FILE_BYTES } from '../lib/container.ts';
import { properties, validateValue } from '../lib/xmp-properties.ts';
import type { PropertyId, Changes } from '../lib/xmp-properties.ts';
import type { EditOptions } from '../lib/editor.ts';
import type { Request, Response } from '../lib/messages.ts';
import { summarizeBlocks } from '../lib/presentation.ts';
import { createMetadataView } from './metadata-view.ts';

const lang = document.documentElement.lang === 'en' ? 'en' : 'vi';
const c = copy[lang];
const e = editorCopy[lang];
function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const value = document.querySelector('#' + id);
  if (!(value instanceof type)) throw new Error('Missing control ' + id);
  return value;
}
const input = element('file', HTMLInputElement);
const status = element('status', HTMLParagraphElement);
const clear = element('clear', HTMLButtonElement);
const form = element('edit-form', HTMLFormElement);
const processButton = element('process', HTMLButtonElement);
const applyXml = element('apply-xml', HTMLButtonElement);
const xml = element('xmp-xml', HTMLTextAreaElement);
const removeXmp = element('remove-xmp', HTMLInputElement);
const removeOther = element('remove-other', HTMLInputElement);
const download = element('download', HTMLButtonElement);
const filename = element('filename', HTMLInputElement);
const originalView = element('view-original', HTMLButtonElement);
const processedView = element('view-processed', HTMLButtonElement);
const metadataView = createMetadataView(lang);
type Success = Extract<Response, { ok: true }>;
let file: File | null = null;
let source: Success | null = null;
let result: Success | null = null;
let shown: Success | null = null;
const drafts: Partial<Record<PropertyId, string>> = {};
let worker: Worker | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;
let revision = 0;
let sourceUrl: string | null = null;
let outputUrl: string | null = null;
function show(id: string, visible: boolean): void {
  const node = document.getElementById(id);
  if (node) node.hidden = !visible;
}
function setStatus(message: string, error = false): void {
  status.textContent = message;
  status.dataset['state'] = error ? 'error' : 'ready';
}
function size(bytes: number): string {
  return new Intl.NumberFormat(lang).format(bytes) + ' bytes';
}
function facts(id: string, values: [string, string][]): void {
  const list = document.getElementById(id);
  if (!list) throw new Error('Missing facts');
  list.replaceChildren();
  for (const [key, value] of values) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = key;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }
}
function stop(): void {
  worker?.terminate();
  worker = null;
  if (timeout !== null) clearTimeout(timeout);
  timeout = null;
}
function preview(
  id: string,
  url: string | null,
  response: Success | null,
): void {
  const image = element(id, HTMLImageElement);
  image.removeAttribute('src');
  image.hidden = true;
  image.onload = () => {
    image.hidden = false;
  };
  image.onerror = () => {
    image.hidden = true;
  };
  if (
    url &&
    response &&
    response.summary.width * response.summary.height <= 40_000_000
  )
    image.src = url;
}
function render(value: Success): void {
  shown = value;
  metadataView.render(value.metadata.fields);
  originalView.setAttribute('aria-pressed', String(value === source));
  processedView.setAttribute('aria-pressed', String(value === result));
  const warnings = element('parser-warnings', HTMLParagraphElement);
  warnings.textContent = value.metadata.warnings.join(' - ');
  warnings.hidden = value.metadata.warnings.length === 0;
  facts(
    'protected-list',
    summarizeBlocks(
      value.summary.blocks.filter((b) => b.reason !== 'metadata'),
    ).map((b) => [
      b.name,
      c.reason[b.reason as keyof typeof c.reason] + ' - ' + size(b.bytes),
    ]),
  );
}
function clearOutput(): void {
  result = null;
  download.disabled = true;
  processedView.disabled = true;
  show('output-result', false);
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = null;
  preview('image-preview', null, null);
  if (source) render(source);
}
function invalidate(): void {
  revision++;
  stop();
  clearOutput();
  processButton.disabled = !source;
  applyXml.disabled = !source || removeXmp.checked;
  if (source) setStatus(e.ready);
}
function valueControl(id: PropertyId): HTMLInputElement | HTMLTextAreaElement {
  const field = document.querySelector('[data-value="' + id + '"]');
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
  ))
    throw new Error('Missing field');
  return field;
}
function actionControl(id: PropertyId, action: string): HTMLInputElement {
  const field = document.querySelector(
    'input[name="action-' + id + '"][value="' + action + '"]',
  );
  if (!(field instanceof HTMLInputElement)) throw new Error('Missing action');
  return field;
}
function refreshFields(): void {
  for (const property of properties) {
    const control = valueControl(property.id);
    const keep = actionControl(property.id, 'keep').checked;
    const removed =
      removeXmp.checked || actionControl(property.id, 'remove').checked;
    const value = keep || removed ? '' : (drafts[property.id] ?? '');
    if (control.value !== value) control.value = value;
    control.placeholder = !source
      ? ''
      : removed
        ? e.removedValue
        : keep
          ? source.values[property.id] || e.missingValue
          : e.newValue;
    control.disabled = removed;
    if (keep || removed) control.removeAttribute('aria-invalid');
    for (const action of ['keep', 'set', 'remove'])
      actionControl(property.id, action).disabled = removeXmp.checked;
  }
  xml.disabled = removeXmp.checked;
  applyXml.disabled = !source || removeXmp.checked;
  element('download-xmp', HTMLButtonElement).disabled = removeXmp.checked;
}
function restore(): void {
  form.reset();
  for (const property of properties) {
    const control = valueControl(property.id);
    drafts[property.id] = source?.values[property.id] ?? '';
    control.value = '';
    control.removeAttribute('aria-invalid');
  }
  xml.value = source?.xml ?? '';
  xml.removeAttribute('aria-invalid');
  refreshFields();
  invalidate();
}
function reset(): void {
  revision++;
  stop();
  source = null;
  shown = null;
  clearOutput();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = null;
  file = null;
  clear.disabled = true;
  input.value = '';
  element('search', HTMLInputElement).value = '';
  restore();
  preview('source-preview', null, null);
  metadataView.reset();
  show('file-info', false);
  show('editor-workspace', false);
  setStatus(e.empty);
}
function validName(): boolean {
  const extension =
    source?.summary.format === 'JPEG'
      ? 'jpg'
      : source?.summary.format.toLowerCase();
  return (
    filename.value.length > 0 &&
    !/[\\/:*?"<>|]/u.test(filename.value) &&
    !Array.from(filename.value).some(
      (character) => character.charCodeAt(0) < 32,
    ) &&
    !filename.value.startsWith('.') &&
    filename.value.endsWith('.' + (extension ?? ''))
  );
}
function validateName(): void {
  const valid = validName();
  filename.setAttribute('aria-invalid', String(!valid));
  download.disabled = !result?.output || !valid;
}
function responseError(
  code: Extract<Response, { ok: false }>['error'],
): string {
  if (
    code === 'invalid' ||
    code === 'unsupported' ||
    code === 'unsafe' ||
    code === 'large'
  )
    return e[code];
  return c.errors[code];
}
async function run(options?: EditOptions): Promise<void> {
  if (!file) return;
  stop();
  clearOutput();
  const mine = ++revision;
  processButton.disabled = true;
  applyXml.disabled = true;
  setStatus(options ? e.working : c.loading);
  try {
    const bytes = await file.arrayBuffer();
    if (mine !== revision) return;
    const task = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    worker = task;
    const fail = (message: string): void => {
      if (mine !== revision) return;
      stop();
      setStatus(message, true);
      processButton.disabled = !source;
      refreshFields();
    };
    task.onerror = () => {
      fail(c.errors.failed);
    };
    timeout = setTimeout(() => {
      fail(c.errors.timeout);
    }, 20000);
    task.onmessage = (event: MessageEvent<Response>) => {
      if (mine !== revision) return;
      stop();
      const response = event.data;
      if (!response.ok) {
        fail(responseError(response.error));
        return;
      }
      if (response.output) {
        result = response;
        processedView.disabled = false;
        outputUrl = URL.createObjectURL(
          new Blob([response.output], { type: response.summary.mime }),
        );
        preview('image-preview', outputUrl, response);
        facts('sizes', [
          [c.original, size(file?.size ?? 0)],
          [c.cleaned, size(response.output.byteLength)],
          [e.changedSize, size(response.output.byteLength - (file?.size ?? 0))],
        ]);
        facts('hashes', [
          [c.originalHash, response.beforeHash ?? ''],
          [c.outputHash, response.afterHash ?? ''],
        ]);
        show('output-result', true);
        validateName();
        setStatus(response.unchanged ? e.unchanged : e.done);
      } else {
        source = response;
        element('selected-file-name', HTMLHeadingElement).textContent =
          file?.name ?? '';
        element('file-format', HTMLElement).textContent =
          response.summary.format;
        element('file-size', HTMLElement).textContent = size(file?.size ?? 0);
        element('file-dimensions', HTMLElement).textContent =
          String(response.summary.width) +
          ' × ' +
          String(response.summary.height);
        element('xmp-presence', HTMLParagraphElement).textContent =
          response.hasXmp ? e.sourceXmp : e.newXmp;
        show('credentials', response.credentials > 0);
        sourceUrl = URL.createObjectURL(
          new Blob([bytes], { type: response.summary.mime }),
        );
        preview('source-preview', sourceUrl, response);
        filename.value =
          'image.' +
          (response.summary.format === 'JPEG'
            ? 'jpg'
            : response.summary.format.toLowerCase());
        show('file-info', true);
        show('editor-workspace', true);
        restore();
      }
      render(response);
      processButton.disabled = false;
      refreshFields();
    };
    const request: Request = { bytes, ...(options ? { options } : {}) };
    task.postMessage(request);
  } catch {
    if (mine === revision) {
      stop();
      setStatus(c.errors.failed, true);
      processButton.disabled = !source;
      refreshFields();
    }
  }
}
function choose(files: FileList | File[]): void {
  const chosenFiles = [...files];
  reset();
  if (chosenFiles.length !== 1) {
    setStatus(c.errors.multiple, true);
    return;
  }
  const chosen = chosenFiles[0];
  if (!chosen) return;
  if (chosen.size > MAX_FILE_BYTES) {
    setStatus(c.errors.large, true);
    return;
  }
  file = chosen;
  clear.disabled = false;
  void run();
}
for (const property of properties) {
  valueControl(property.id).addEventListener('input', () => {
    drafts[property.id] = valueControl(property.id).value;
    actionControl(property.id, 'set').checked = true;
    valueControl(property.id).removeAttribute('aria-invalid');
    refreshFields();
    invalidate();
  });
  for (const action of ['keep', 'set', 'remove'])
    actionControl(property.id, action).addEventListener('change', () => {
      refreshFields();
      invalidate();
    });
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (removeXmp.checked) {
    void run({ removeXmp: true, removeOther: removeOther.checked });
    return;
  }
  const changes: Changes = {};
  for (const property of properties) {
    if (actionControl(property.id, 'keep').checked) continue;
    const control = valueControl(property.id);
    const action = actionControl(property.id, 'remove').checked
      ? 'remove'
      : 'set';
    if (action === 'set') {
      try {
        validateValue(property, control.value);
      } catch {
        control.setAttribute('aria-invalid', 'true');
        control.focus();
        setStatus(e.invalidField, true);
        return;
      }
    }
    changes[property.id] = { action, value: control.value };
  }
  void run({ changes, removeOther: removeOther.checked });
});
removeXmp.addEventListener('change', () => {
  refreshFields();
  invalidate();
});
removeOther.addEventListener('change', invalidate);
xml.addEventListener('input', () => {
  xml.removeAttribute('aria-invalid');
  invalidate();
});
applyXml.addEventListener('click', () => {
  void run({ xml: xml.value, removeOther: removeOther.checked });
});
element('reset-edits', HTMLButtonElement).addEventListener('click', restore);
clear.addEventListener('click', reset);
input.addEventListener('change', () => {
  if (input.files) choose(input.files);
});
filename.addEventListener('input', validateName);
originalView.addEventListener('click', () => {
  if (source) render(source);
});
processedView.addEventListener('click', () => {
  if (result) render(result);
});
function save(bytes: ArrayBuffer, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
download.addEventListener('click', () => {
  if (result?.output && validName())
    save(result.output, filename.value, result.summary.mime);
});
element('report', HTMLButtonElement).addEventListener('click', () => {
  if (!shown) return;
  save(
    new TextEncoder().encode(
      JSON.stringify(
        {
          view: shown === source ? 'original' : 'edited',
          format: shown.metadata.format,
          fields: shown.metadata.fields,
          warnings: shown.metadata.warnings,
          blocks: shown.summary.blocks,
          beforeHash: shown.beforeHash,
          afterHash: shown.afterHash,
          removed: shown.removed,
          scope: e.coverage,
        },
        null,
        2,
      ),
    ).buffer,
    'metadata-report.json',
    'application/json',
  );
});
element('download-xmp', HTMLButtonElement).addEventListener('click', () => {
  if (source)
    save(
      new TextEncoder().encode(xml.value).buffer,
      'metadata.xmp',
      'application/rdf+xml',
    );
});
const dropzone = element('dropzone', HTMLDivElement);
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.dataset['active'] = 'true';
});
dropzone.addEventListener('dragleave', () => {
  dropzone.dataset['active'] = 'false';
});
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.dataset['active'] = 'false';
  if (event.dataTransfer) choose(event.dataTransfer.files);
});
document.addEventListener('paste', (event) => {
  if (
    (event.target instanceof HTMLInputElement &&
      event.target.type !== 'file') ||
    event.target instanceof HTMLTextAreaElement
  )
    return;
  const files = [...(event.clipboardData?.files ?? [])];
  if (files.length) {
    event.preventDefault();
    choose(files);
  }
});
window.addEventListener('pagehide', reset);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) reset();
});
input.disabled = false;
