import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://edit.vinasig.io.vn',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'never' },
});
