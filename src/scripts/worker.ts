import { readEditable, editMetadata } from '../lib/editor.ts';
import { equal, join, MetadataError } from '../lib/binary.ts';
import { readImageMetadata } from '../lib/image-metadata.ts';
import type { Request, Response, Summary } from '../lib/messages.ts';
import type { Inspection } from '../lib/container.ts';
interface WorkerScope {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: Response, transfer?: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;
function summarize(value: Inspection): Summary {
  return {
    format: value.format,
    mime: value.mime,
    width: value.width,
    height: value.height,
    blocks: value.blocks.map((b) => ({
      id: b.id,
      name: b.name,
      offset: b.offset,
      length: b.length,
      reason: b.reason,
    })),
  };
}
async function hash(parts: Uint8Array[]): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', join(parts))),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
scope.onmessage = (event): void => {
  void (async () => {
    try {
      const bytes = new Uint8Array(event.data.bytes);
      const edited = event.data.options
        ? await editMetadata(bytes, event.data.options)
        : null;
      const inspected = await readEditable(edited?.bytes ?? bytes);
      let metadata;
      try {
        metadata = await readImageMetadata(edited?.bytes ?? bytes);
      } catch {
        metadata = {
          format: inspected.inspection.format,
          scope: 'image' as const,
          fields: [],
          warnings: ['image-parse'],
        };
      }
      const response: Response = {
        ok: true,
        metadata,
        summary: summarize(inspected.inspection),
        xml: inspected.xml,
        values: inspected.values,
        hasXmp: inspected.xmpBlocks.length > 0,
        credentials: inspected.credentials.length,
        ...(edited
          ? {
              output: edited.bytes.buffer,
              removed: edited.removed,
              beforeHash: await hash(edited.before.compressed),
              afterHash: await hash(edited.after.compressed),
              unchanged: equal(bytes, edited.bytes),
            }
          : {}),
      };
      scope.postMessage(response, response.output ? [response.output] : []);
    } catch (error) {
      scope.postMessage({
        ok: false,
        error: error instanceof MetadataError ? error.code : 'failed',
      });
    }
  })();
};
