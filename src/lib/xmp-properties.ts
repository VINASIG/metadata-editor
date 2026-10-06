import { requireBytes } from './binary.ts';
export const MAX_XMP_BYTES = 1024 * 1024;
const DC = 'http://purl.org/dc/elements/1.1/';
const XMP = 'http://ns.adobe.com/xap/1.0/';
export const properties = [
  { id: 'title', namespace: DC, prefix: 'dc', name: 'title', kind: 'Alt' },
  {
    id: 'description',
    namespace: DC,
    prefix: 'dc',
    name: 'description',
    kind: 'Alt',
  },
  { id: 'creator', namespace: DC, prefix: 'dc', name: 'creator', kind: 'Seq' },
  { id: 'rights', namespace: DC, prefix: 'dc', name: 'rights', kind: 'Alt' },
  { id: 'subject', namespace: DC, prefix: 'dc', name: 'subject', kind: 'Bag' },
  {
    id: 'CreateDate',
    namespace: XMP,
    prefix: 'xmp',
    name: 'CreateDate',
    kind: 'date',
  },
  {
    id: 'ModifyDate',
    namespace: XMP,
    prefix: 'xmp',
    name: 'ModifyDate',
    kind: 'date',
  },
  {
    id: 'MetadataDate',
    namespace: XMP,
    prefix: 'xmp',
    name: 'MetadataDate',
    kind: 'date',
  },
  {
    id: 'CreatorTool',
    namespace: XMP,
    prefix: 'xmp',
    name: 'CreatorTool',
    kind: 'text',
  },
  {
    id: 'Rating',
    namespace: XMP,
    prefix: 'xmp',
    name: 'Rating',
    kind: 'rating',
  },
  { id: 'Label', namespace: XMP, prefix: 'xmp', name: 'Label', kind: 'text' },
] as const;
export type PropertyId = (typeof properties)[number]['id'];
export type Changes = Partial<
  Record<PropertyId, { action: 'set' | 'remove'; value: string }>
>;
export type Values = Record<PropertyId, string>;
export function forbiddenXml(value: string): boolean {
  return Array.from(value).some((character) => {
    const point = character.codePointAt(0) ?? 0;
    return (
      (point < 32 && ![9, 10, 13].includes(point)) ||
      (point >= 0xd800 && point <= 0xdfff) ||
      point === 0xfffe ||
      point === 0xffff
    );
  });
}

function validDate(value: string): boolean {
  const match =
    /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.exec(
      value,
    );
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone] = match;
  if (month && (Number(month) < 1 || Number(month) > 12)) return false;
  const y = Number(year);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day && (Number(day) < 1 || Number(day) > (days[Number(month) - 1] ?? 0)))
    return false;
  if (
    (hour && Number(hour) > 23) ||
    (minute && Number(minute) > 59) ||
    (second && Number(second) > 59)
  )
    return false;
  return (
    !zone ||
    zone === 'Z' ||
    (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4)) <= 59)
  );
}
export function validateValue(
  property: (typeof properties)[number],
  value: string,
): void {
  requireBytes(value.length <= 8192 && !forbiddenXml(value));
  requireBytes(value.length > 0);
  if (property.kind === 'date') requireBytes(validDate(value));
  if (property.kind === 'rating')
    requireBytes(/^-1$|^(?:[0-4](?:\.\d+)?|5(?:\.0+)?)$/.test(value));
  if (property.kind === 'Bag' || property.kind === 'Seq')
    requireBytes(value.split('\n').length <= 128);
}
