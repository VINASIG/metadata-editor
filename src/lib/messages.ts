import type { Block, Format } from './container.ts';
import type { Metadata } from './fields.ts';
import type { EditOptions } from './editor.ts';
import type { Values } from './xmp.ts';
export interface Summary {
  format: Format;
  mime: string;
  width: number;
  height: number;
  blocks: Block[];
}
export interface Request {
  bytes: ArrayBuffer;
  options?: EditOptions;
}
export type Response =
  | {
      ok: false;
      error:
        'unsupported' | 'invalid' | 'large' | 'unsafe' | 'timeout' | 'failed';
    }
  | {
      ok: true;
      metadata: Metadata;
      summary: Summary;
      xml: string;
      values: Values;
      hasXmp: boolean;
      credentials: number;
      unchanged?: boolean;
      output?: ArrayBuffer;
      saved?: number;
      beforeHash?: string;
      afterHash?: string;
      removed?: string[];
    };
