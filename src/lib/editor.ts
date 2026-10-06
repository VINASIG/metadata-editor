import {
  ascii,
  equal,
  join,
  MetadataError,
  pngChunk,
  requireBytes,
  view,
} from './binary.ts';
import { clean, inspect, MAX_FILE_BYTES } from './container.ts';
import type { Block, Inspection } from './container.ts';
import { jpegSegment } from './exif.ts';
import {
  displayHints,
  emptyXmp,
  MAX_XMP_BYTES,
  parseXmp,
  readXmpValues,
  serializeXmp,
  updateXmp,
} from './xmp.ts';
import type { Changes, Values } from './xmp.ts';
const encoder = new TextEncoder();
const prefix = 'http://ns.adobe.com/xap/1.0/\0';
const extended = 'http://ns.adobe.com/xmp/extension/\0';
const keyword = 'XML:com.adobe.xmp';
export interface Editable {
  xml: string;
  values: Values;
  xmpBlocks: string[];
  inspection: Inspection;
  credentials: string[];
}
async function inflate(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([data.slice()])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > MAX_XMP_BYTES) {
        await reader.cancel();
        throw new MetadataError('large');
      }
      parts.push(item.value);
    }
  } catch (error) {
    if (error instanceof MetadataError) throw error;
    throw new MetadataError('invalid');
  } finally {
    reader.releaseLock();
  }
  return join(parts);
}
function jpegData(bytes: Uint8Array, block: Block): Uint8Array {
  let start = block.offset;
  while (bytes[start] === 255) start++;
  return bytes.subarray(start + 3, block.offset + block.length);
}
async function xmpPacket(
  bytes: Uint8Array,
  block: Block,
  format: Inspection['format'],
): Promise<Uint8Array | null> {
  if (format === 'JPEG' && block.name === 'XMP or APP1') {
    const data = jpegData(bytes, block);
    if (ascii(data, 0, extended.length) === extended)
      throw new MetadataError('unsafe');
    return ascii(data, 0, prefix.length) === prefix
      ? data.subarray(prefix.length)
      : null;
  }
  if (format === 'WebP' && block.name === 'XMP ')
    return bytes.subarray(
      block.offset + 8,
      block.offset + 8 + view(bytes).getUint32(block.offset + 4, true),
    );
  if (format !== 'PNG' || !['iTXt', 'tEXt', 'zTXt'].includes(block.name))
    return null;
  const data = bytes.subarray(
    block.offset + 8,
    block.offset + block.length - 4,
  );
  const end = data.indexOf(0);
  if (end < 0 || ascii(data, 0, end) !== keyword) return null;
  if (block.name === 'tEXt') return data.subarray(end + 1);
  if (block.name === 'zTXt') {
    requireBytes(data[end + 1] === 0);
    return inflate(data.subarray(end + 2));
  }
  const compressed = data[end + 1];
  requireBytes((compressed === 0 || compressed === 1) && data[end + 2] === 0);
  const languageEnd = data.indexOf(0, end + 3);
  const translatedEnd = data.indexOf(0, languageEnd + 1);
  requireBytes(languageEnd >= end + 3 && translatedEnd > languageEnd);
  const text = data.subarray(translatedEnd + 1);
  return compressed === 1 ? inflate(text) : text;
}
export async function readEditable(bytes: Uint8Array): Promise<Editable> {
  const inspection = inspect(bytes);
  if (inspection.format === 'GIF') throw new MetadataError('unsupported');
  const packets: Uint8Array[] = [];
  const ids: string[] = [];
  const credentials = inspection.blocks
    .filter((b) => b.name === 'caBX' || b.name === 'C2PA')
    .map((b) => b.id);
  for (const block of inspection.blocks) {
    const packet = await xmpPacket(bytes, block, inspection.format);
    if (!packet) continue;
    requireBytes(packet.length <= MAX_XMP_BYTES);
    packets.push(packet);
    ids.push(block.id);
  }
  if (packets.length > 1) throw new MetadataError('unsafe');
  let xml = emptyXmp;
  if (packets[0]) {
    try {
      xml = new TextDecoder('utf-8', { fatal: true }).decode(packets[0]);
    } catch {
      throw new MetadataError('invalid');
    }
    parseXmp(xml);
    if (/HasExtendedXMP/.test(xml)) throw new MetadataError('unsafe');
  }
  return {
    xml,
    values: readXmpValues(xml),
    xmpBlocks: ids,
    inspection,
    credentials,
  };
}
function riffChunk(name: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(data.length + 8 + (data.length % 2));
  output.set(encoder.encode(name));
  view(output).setUint32(4, data.length, true);
  output.set(data, 8);
  return output;
}
function withPacket(
  bytes: Uint8Array<ArrayBuffer>,
  before: Inspection,
  xml: string | null,
): Uint8Array<ArrayBuffer> {
  const packet = xml === null ? null : encoder.encode(xml);
  if (!packet) return bytes;
  if (before.format === 'JPEG') {
    requireBytes(packet.length + prefix.length <= 65533);
    return join([
      bytes.subarray(0, 2),
      jpegSegment(0xe1, join([encoder.encode(prefix), packet])),
      bytes.subarray(2),
    ]);
  }
  if (before.format === 'PNG') {
    const end = before.blocks.find((b) => b.name === 'IEND');
    requireBytes(end);
    return join([
      bytes.subarray(0, end.offset),
      pngChunk(
        'iTXt',
        join([encoder.encode(keyword), new Uint8Array(5), packet]),
      ),
      bytes.subarray(end.offset),
    ]);
  }
  requireBytes(before.format === 'WebP');
  const tail = before.blocks.find((b) => b.name === 'Trailing data');
  const end = bytes.length - (tail?.length ?? 0);
  const vp8x = before.blocks.find((b) => b.name === 'VP8X');
  let body: Uint8Array<ArrayBuffer>;
  if (!vp8x) {
    const header = new Uint8Array(10);
    header[0] =
      4 |
      (before.blocks.some((b) => b.name === 'EXIF') ? 8 : 0) |
      (before.blocks.some((b) => b.name === 'ICCP') ? 32 : 0);
    const image = before.blocks.find((b) => b.name === 'VP8L');
    if (image && view(bytes).getUint32(image.offset + 9, true) & 0x10000000)
      header[0] |= 16;
    for (const [offset, value] of [
      [4, before.width - 1],
      [7, before.height - 1],
    ]) {
      requireBytes(offset !== undefined && value !== undefined);
      header[offset] = value & 255;
      header[offset + 1] = (value >>> 8) & 255;
      header[offset + 2] = (value >>> 16) & 255;
    }
    body = join([
      bytes.subarray(0, 12),
      riffChunk('VP8X', header),
      bytes.subarray(12, end),
      riffChunk('XMP ', packet),
      bytes.subarray(end),
    ]);
  } else {
    body = join([
      bytes.subarray(0, end),
      riffChunk('XMP ', packet),
      bytes.subarray(end),
    ]);
    body[vp8x.offset + 8] = (body[vp8x.offset + 8] ?? 0) | 4;
  }
  view(body).setUint32(4, body.length - (tail?.length ?? 0) - 8, true);
  return body;
}
export interface EditOptions {
  changes?: Changes;
  xml?: string;
  removeXmp?: boolean;
  removeOther?: boolean;
}
export async function editMetadata(
  bytes: Uint8Array,
  options: EditOptions,
): Promise<{
  bytes: Uint8Array<ArrayBuffer>;
  before: Inspection;
  after: Inspection;
  removed: string[];
  xml: string | null;
}> {
  const source = await readEditable(bytes);
  const noChange =
    !options.removeOther &&
    !options.removeXmp &&
    options.xml === undefined &&
    !Object.keys(options.changes ?? {}).length;
  if (noChange)
    return {
      bytes: bytes.slice(),
      before: source.inspection,
      after: source.inspection,
      removed: [],
      xml: source.xml,
    };
  requireBytes(
    !(
      options.removeXmp &&
      (options.xml !== undefined || Object.keys(options.changes ?? {}).length)
    ),
  );
  const xml =
    options.removeXmp ||
    (!source.xmpBlocks.length &&
      options.xml === undefined &&
      !Object.keys(options.changes ?? {}).length)
      ? null
      : options.xml === undefined
        ? updateXmp(source.xml, options.changes ?? {})
        : serializeXmp(parseXmp(options.xml));
  if (xml === null && displayHints(source.xml) !== displayHints(emptyXmp))
    throw new MetadataError('unsafe');
  if (xml !== null)
    requireBytes(displayHints(source.xml) === displayHints(xml));
  const remove = source.inspection.blocks
    .filter(
      (b) =>
        b.reason === 'metadata' &&
        (options.removeOther ||
          source.xmpBlocks.includes(b.id) ||
          source.credentials.includes(b.id)),
    )
    .map((b) => b.id);
  const stripped = clean(bytes, remove);
  const output = withPacket(stripped.bytes, stripped.after, xml);
  if (output.length > MAX_FILE_BYTES) throw new MetadataError('large');
  const after = inspect(output);
  requireBytes(
    source.inspection.width === after.width &&
      source.inspection.height === after.height,
  );
  requireBytes(
    source.inspection.compressed.length === after.compressed.length &&
      source.inspection.compressed.every((p, i) =>
        equal(p, after.compressed[i] ?? new Uint8Array()),
      ),
  );
  const roundtrip = await readEditable(output);
  if (xml !== null) requireBytes(serializeXmp(parseXmp(roundtrip.xml)) === xml);
  else requireBytes(roundtrip.xmpBlocks.length === 0);
  return {
    bytes: output,
    before: source.inspection,
    after,
    removed: remove,
    xml,
  };
}
