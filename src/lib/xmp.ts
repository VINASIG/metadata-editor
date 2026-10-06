import { DOMParser, XMLSerializer, onErrorStopParsing } from '@xmldom/xmldom';
import type { Document, Element } from '@xmldom/xmldom';
import { MetadataError, requireBytes } from './binary.ts';

export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XMLNS = 'http://www.w3.org/2000/xmlns/';
import {
  MAX_XMP_BYTES,
  properties,
  forbiddenXml,
  validateValue,
} from './xmp-properties.ts';
import type { Changes, Values } from './xmp-properties.ts';
export { MAX_XMP_BYTES, properties, validateValue } from './xmp-properties.ts';
export type { PropertyId, Changes, Values } from './xmp-properties.ts';
export const emptyXmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="${RDF}"><rdf:Description rdf:about=""/></rdf:RDF></x:xmpmeta>`;
export function parseXmp(xml: string): Document {
  requireBytes(new TextEncoder().encode(xml).length <= MAX_XMP_BYTES);
  requireBytes(!/<!DOCTYPE|<!ENTITY/i.test(xml));
  requireBytes(!forbiddenXml(xml));
  requireBytes((xml.match(/</g)?.length ?? 0) <= 20000);
  let document: Document;
  try {
    document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(
      xml,
      'application/xml',
    );
  } catch {
    throw new MetadataError('invalid');
  }
  const root = document.documentElement;
  requireBytes(
    root &&
      ((root.namespaceURI === 'adobe:ns:meta/' &&
        root.localName === 'xmpmeta') ||
        (root.namespaceURI === RDF && root.localName === 'RDF')),
  );
  const rdf = document.getElementsByTagNameNS(RDF, 'RDF');
  requireBytes(rdf.length === 1);
  let nodes = 0;
  function bounded(element: Element, depth: number): void {
    requireBytes(depth <= 32 && ++nodes <= 10000);
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes.item(i);
      if (child?.nodeType === 1) bounded(child as Element, depth + 1);
    }
  }
  bounded(root, 0);
  return document;
}
function descriptions(document: Document): Element[] {
  const rdf = document.getElementsByTagNameNS(RDF, 'RDF').item(0);
  requireBytes(rdf);
  const values: Element[] = [];
  for (let i = 0; i < rdf.childNodes.length; i++) {
    const child = rdf.childNodes.item(i);
    if (child?.nodeType !== 1) continue;
    const element = child as Element;
    requireBytes(
      element.namespaceURI === RDF && element.localName === 'Description',
    );
    if (!element.getAttributeNS(RDF, 'about')) values.push(element);
  }
  if (!values.length) {
    const description = document.createElementNS(RDF, 'rdf:Description');
    description.setAttributeNS(RDF, 'rdf:about', '');
    rdf.appendChild(description);
    values.push(description);
  }
  return values;
}
export function readXmpValues(xml: string): Values {
  const document = parseXmp(xml);
  const roots = descriptions(document);
  return Object.fromEntries(
    properties.map((property) => {
      let value = '';
      for (const root of roots) {
        if (root.hasAttributeNS(property.namespace, property.name)) {
          value = root.getAttributeNS(property.namespace, property.name) ?? '';
          break;
        }
        const elements = root.getElementsByTagNameNS(
          property.namespace,
          property.name,
        );
        const element = Array.from(elements).find((e) => e.parentNode === root);
        if (!element) continue;
        const items = Array.from(element.getElementsByTagNameNS(RDF, 'li'));
        value =
          property.kind === 'Alt'
            ? ((
                items.find(
                  (li) =>
                    li.getAttributeNS(
                      'http://www.w3.org/XML/1998/namespace',
                      'lang',
                    ) === 'x-default',
                ) ?? items[0]
              )?.textContent ??
              element.textContent ??
              '')
            : items.length
              ? items.map((item) => item.textContent ?? '').join('\n')
              : (element.textContent ?? '');
        break;
      }
      return [property.id, value];
    }),
  ) as Values;
}
export function updateXmp(xml: string, changes: Changes): string {
  const document = parseXmp(xml);
  const roots = descriptions(document);
  const target = roots[0];
  requireBytes(target);
  requireBytes(
    Object.keys(changes).every((id) => properties.some((p) => p.id === id)),
  );
  for (const property of properties) {
    const change = changes[property.id];
    if (!change) continue;
    if (change.action === 'set') validateValue(property, change.value);
    for (const root of roots) {
      root.removeAttributeNS(property.namespace, property.name);
      for (const element of Array.from(
        root.getElementsByTagNameNS(property.namespace, property.name),
      )) {
        if (element.parentNode === root) root.removeChild(element);
      }
    }
    if (change.action === 'remove') continue;
    target.setAttributeNS(
      XMLNS,
      'xmlns:' + property.prefix,
      property.namespace,
    );
    const element = document.createElementNS(
      property.namespace,
      property.prefix + ':' + property.name,
    );
    if (['Alt', 'Bag', 'Seq'].includes(property.kind)) {
      const array = document.createElementNS(RDF, 'rdf:' + property.kind);
      const values =
        property.kind === 'Alt'
          ? [change.value]
          : change.value
              .split('\n')
              .map((v) => v.trim())
              .filter(Boolean);
      requireBytes(values.length > 0);
      for (const value of values) {
        const item = document.createElementNS(RDF, 'rdf:li');
        if (property.kind === 'Alt')
          item.setAttributeNS(
            'http://www.w3.org/XML/1998/namespace',
            'xml:lang',
            'x-default',
          );
        item.appendChild(document.createTextNode(value));
        array.appendChild(item);
      }
      element.appendChild(array);
    } else element.appendChild(document.createTextNode(change.value));
    target.appendChild(element);
  }
  return serializeXmp(document);
}
export function serializeXmp(document: Document): string {
  const root = document.documentElement;
  requireBytes(root);
  const xml = new XMLSerializer().serializeToString(root);
  requireBytes(new TextEncoder().encode(xml).length <= MAX_XMP_BYTES);
  parseXmp(xml);
  return xml;
}
export function displayHints(xml: string): string {
  const document = parseXmp(xml);
  return [
    ['http://ns.adobe.com/tiff/1.0/', 'Orientation'],
    ['http://ns.adobe.com/exif/1.0/', 'ColorSpace'],
  ]
    .map(([namespace, name]) => {
      requireBytes(namespace && name);
      const roots = descriptions(document);
      return roots.map((root) => [
        root.getAttributeNS(namespace, name),
        ...Array.from(root.getElementsByTagNameNS(namespace, name)).map(
          (item) => item.textContent,
        ),
      ]);
    })
    .map((value) => JSON.stringify(value))
    .join('|');
}
