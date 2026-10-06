import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { join, pngChunk, view } from '../src/lib/binary.ts';
import { inspect, clean } from '../src/lib/container.ts';
import { editMetadata, readEditable } from '../src/lib/editor.ts';
import { jpegSegment } from '../src/lib/exif.ts';
import { provenancePng } from './provenance-fixtures.ts';
import {
  emptyXmp,
  parseXmp,
  readXmpValues,
  updateXmp,
} from '../src/lib/xmp.ts';
import {
  pngFixture,
  jpegFixture,
  webpFixture,
  gifFixture,
  privateText,
} from './fixtures.ts';
const utf8 = new TextEncoder();
const title = 'Cà phê <Tokyo> & đêm 🌃';
export function taggedPng(
  xml: string,
  compressed = false,
): Uint8Array<ArrayBuffer> {
  const base = pngFixture();
  const end = inspect(base).blocks.find((b) => b.name === 'IEND');
  assert(end);
  return join([
    base.subarray(0, end.offset),
    pngChunk(
      'iTXt',
      join([
        utf8.encode('XML:com.adobe.xmp'),
        new Uint8Array([0, Number(compressed), 0, 0, 0]),
        compressed ? deflateSync(utf8.encode(xml)) : utf8.encode(xml),
      ]),
    ),
    base.subarray(end.offset),
  ]);
}
for (const [format, fixture] of [
  ['PNG', pngFixture],
  ['JPEG', jpegFixture],
  ['WebP', () => clean(webpFixture()).bytes],
] as const) {
  void test(`${format} keeps an untouched file byte for byte`, async () => {
    const bytes = fixture();
    assert.deepEqual((await editMetadata(bytes, {})).bytes, bytes);
  });
  void test(`${format} adds Unicode XMP, rereads values and preserves every compressed payload`, async () => {
    const bytes = fixture();
    const result = await editMetadata(bytes, {
      changes: {
        title: { action: 'set', value: title },
        creator: { action: 'set', value: 'First author\nTác giả hai' },
        subject: { action: 'set', value: 'cà phê\nTokyo' },
        CreateDate: { action: 'set', value: '2026-10-06T14:30:00+07:00' },
      },
    });
    const after = await readEditable(result.bytes);
    assert.equal(after.values.title, title);
    assert.equal(after.values.creator, 'First author\nTác giả hai');
    assert.equal(after.values.subject, 'cà phê\nTokyo');
    assert.equal(after.values.CreateDate, '2026-10-06T14:30:00+07:00');
    assert.deepEqual(result.before.compressed, result.after.compressed);
    assert.equal(result.before.width, result.after.width);
    assert.equal(result.before.height, result.after.height);
    for (const block of result.before.blocks.filter((b) =>
      ['color', 'animation', 'display', 'pixels'].includes(b.reason),
    )) {
      const matching = result.after.blocks.find(
        (b) => b.name === block.name && b.length === block.length,
      );
      assert(matching);
      assert.deepEqual(
        result.bytes.subarray(
          matching.offset,
          matching.offset + matching.length,
        ),
        bytes.subarray(block.offset, block.offset + block.length),
      );
    }
  });
}
void test('edited XMP preserves unknown structures and normalizes only the chosen complete property', async () => {
  const xml = emptyXmp.replace(
    'rdf:about=""/>',
    'rdf:about="" xmlns:p="urn:test"><p:history><rdf:Seq><rdf:li>Keep &amp; preserve</rdf:li></rdf:Seq></p:history></rdf:Description>',
  );
  const added = await editMetadata(taggedPng(xml), {
    changes: { title: { action: 'set', value: title } },
  });
  const removed = await editMetadata(added.bytes, {
    changes: { title: { action: 'remove', value: '' } },
  });
  const after = await readEditable(removed.bytes);
  assert.equal(after.values.title, '');
  assert(after.xml.includes('Keep &amp; preserve'));
  assert(new TextDecoder().decode(removed.bytes).includes(privateText));
  assert.equal(after.xml.includes('MetadataDate'), false);
});
void test('compressed PNG XMP is read with a bound and rewritten as UTF-8 iTXt', async () => {
  const input = taggedPng(
    updateXmp(emptyXmp, { title: { action: 'set', value: 'original' } }),
    true,
  );
  assert.equal((await readEditable(input)).values.title, 'original');
  const result = await editMetadata(input, {
    changes: { title: { action: 'set', value: title } },
  });
  assert.equal((await readEditable(result.bytes)).values.title, title);
  assert.deepEqual(result.before.compressed, result.after.compressed);
});
void test('outside-XMP removal preserves new values and display-only EXIF', async () => {
  const input = taggedPng(
    updateXmp(emptyXmp, { creator: { action: 'set', value: 'existing' } }),
  );
  const result = await editMetadata(input, {
    changes: { title: { action: 'set', value: title } },
    removeOther: true,
  });
  const after = await readEditable(result.bytes);
  assert.equal(after.values.title, title);
  assert.equal(after.values.creator, 'existing');
  assert.equal(
    new TextDecoder().decode(result.bytes).includes(privateText),
    false,
  );
  assert.deepEqual(result.before.compressed, result.after.compressed);
  assert(
    result.after.blocks.some(
      (b) => b.name === 'eXIf' && b.reason === 'display',
    ),
  );
});
void test('whole-XMP removal removes every property while retaining outside metadata by default', async () => {
  const input = taggedPng(
    updateXmp(emptyXmp, { title: { action: 'set', value: title } }),
  );
  const result = await editMetadata(input, { removeXmp: true });
  assert.equal((await readEditable(result.bytes)).xmpBlocks.length, 0);
  assert(new TextDecoder().decode(result.bytes).includes(privateText));
});
void test('simple WebP gains a correct extended header, metadata flag and RIFF length without touching alpha', async () => {
  const base = clean(webpFixture()).bytes;
  const image = inspect(base).blocks.find((b) => b.name === 'VP8L');
  assert(image);
  const simple = join([
    base.subarray(0, 12),
    base.subarray(image.offset, image.offset + image.length),
  ]);
  view(simple).setUint32(4, simple.length - 8, true);
  const result = await editMetadata(simple, {
    changes: { title: { action: 'set', value: title } },
  });
  assert.equal(result.bytes[20], 4);
  assert.equal(view(result.bytes).getUint32(4, true), result.bytes.length - 8);
  assert.deepEqual(result.before.compressed, result.after.compressed);
});
void test('ambiguous packets, extended JPEG metadata, GIF and invalid XML never produce an output', async () => {
  const input = taggedPng(emptyXmp);
  const end = inspect(input).blocks.find((b) => b.name === 'IEND');
  assert(end);
  const duplicate = join([
    input.subarray(0, end.offset),
    pngChunk(
      'iTXt',
      join([
        utf8.encode('XML:com.adobe.xmp'),
        new Uint8Array(5),
        utf8.encode(emptyXmp),
      ]),
    ),
    input.subarray(end.offset),
  ]);
  await assert.rejects(() => readEditable(duplicate), /unsafe/);
  const jpeg = jpegFixture();
  const extended = join([
    jpeg.subarray(0, 2),
    jpegSegment(0xe1, utf8.encode('http://ns.adobe.com/xmp/extension/\0')),
    jpeg.subarray(2),
  ]);
  await assert.rejects(() => readEditable(extended), /unsafe/);
  await assert.rejects(() => readEditable(gifFixture()), /unsupported/);
  await assert.rejects(
    () =>
      editMetadata(input, {
        xml: '<!DOCTYPE x [<!ENTITY y "private">]>' + emptyXmp,
      }),
    /invalid/,
  );
  assert.throws(() => parseXmp('<x/>'), /invalid/);
  assert.throws(() => parseXmp(emptyXmp.replace('</rdf:RDF>', '')), /invalid/);
  assert.throws(() => parseXmp('x'.repeat(1024 * 1024 + 1)), /invalid/);
});
void test('invalid values, dates, ratings and XML characters are rejected without normalizing them silently', () => {
  for (const date of [
    '2026-02-30',
    '0100-02-29',
    '2026-13-01',
    '2026-01-00',
    '2026-10-06T24:00:00Z',
    '2026-10-06T12:00:00+07:99',
    'tomorrow',
  ])
    assert.throws(
      () => updateXmp(emptyXmp, { CreateDate: { action: 'set', value: date } }),
      /invalid/,
    );
  for (const rating of ['6', '-2', 'NaN', ''])
    assert.throws(
      () => updateXmp(emptyXmp, { Rating: { action: 'set', value: rating } }),
      /invalid/,
    );
  for (const value of ['\0', '\uD800', 'x'.repeat(8193)])
    assert.throws(
      () => updateXmp(emptyXmp, { title: { action: 'set', value } }),
      /invalid/,
    );
  assert.equal(
    readXmpValues(
      updateXmp(emptyXmp, { Rating: { action: 'set', value: '4.5' } }),
    ).Rating,
    '4.5',
  );
  assert.equal(
    readXmpValues(
      updateXmp(emptyXmp, {
        CreateDate: { action: 'set', value: '0000-02-29' },
      }),
    ).CreateDate,
    '0000-02-29',
  );
});
void test('bounded decompression rejects oversized XMP before editing', async () => {
  const input = taggedPng(emptyXmp + ' '.repeat(1024 * 1024), true);
  await assert.rejects(() => readEditable(input), /large/);
});
void test('an unchanged C2PA image preserves its claim while an actual edit removes the stale claim', async () => {
  const input = provenancePng(true);
  assert.equal((await readEditable(input)).credentials.length, 1);
  assert.deepEqual((await editMetadata(input, {})).bytes, input);
  const result = await editMetadata(input, {
    changes: { title: { action: 'set', value: title } },
  });
  assert.equal((await readEditable(result.bytes)).credentials.length, 0);
  assert.equal((await readEditable(result.bytes)).values.title, title);
  assert.deepEqual(result.before.compressed, result.after.compressed);
});
void test('advanced XML cannot change orientation hints and whole removal cannot discard required XMP hints', async () => {
  const xml = emptyXmp.replace(
    'rdf:about=""/>',
    'rdf:about="" xmlns:t="http://ns.adobe.com/tiff/1.0/" t:Orientation="6"/>',
  );
  const input = taggedPng(xml);
  await assert.rejects(
    () =>
      editMetadata(input, {
        xml: xml.replace('Orientation="6"', 'Orientation="1"'),
      }),
    /invalid/,
  );
  await assert.rejects(
    () => editMetadata(input, { removeXmp: true }),
    /unsafe/,
  );
  assert.equal(
    (
      await readEditable(
        (
          await editMetadata(input, {
            changes: { title: { action: 'set', value: title } },
          })
        ).bytes,
      )
    ).values.title,
    title,
  );
});
