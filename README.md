# Metadata Editor

Edit image XMP metadata in your browser while preserving the original compressed image data. This is a separate VINASIG project alongside [Metadata Reader](https://metadata.vinasig.io.vn/) and [Metadata Cleaner](https://clean.vinasig.io.vn/).

The canonical website is [edit.vinasig.io.vn](https://edit.vinasig.io.vn/), with Vietnamese at the root and English at [/en/](https://edit.vinasig.io.vn/en/). Publication observations are recorded separately in [the launch audit](docs/audits/LAUNCH.md).

Choose one JPEG, PNG or WebP up to 100 MiB. Each form field offers Keep original, Set value or Remove field. Typing selects Set value. Create the output, inspect its actual metadata and download a copy. The original file is never overwritten. There is no upload API, account, analytics, server processing or persistence of personal metadata. Theme preference is the only stored value.

The form edits 11 XMP properties: title, description, author list, rights, keywords, creation date, content modification date, metadata modification date, creator tool, rating and label. The advanced XML editor handles other properties in a supported single XMP packet. Form edits and advanced XML edits are separate explicit actions. Unknown XMP properties are preserved when editing the form. Changing a property replaces its complete value, including language alternatives or qualifiers. Dates are never generated automatically.

EXIF and IPTC are preserved by default and displayed for comparison. An XMP edit does not synchronize the corresponding EXIF or IPTC value. Optional choices remove all XMP, or supported metadata outside XMP. Necessary display orientation, color, transparency and animation remain. Editing is not a guarantee of privacy cleanup. Use Metadata Cleaner for that goal. Stale embedded C2PA manifest blocks are removed after a metadata change. The editor never signs an image or verifies its provenance.

JPEG uses standard APP1 XMP. PNG uses UTF-8 iTXt with a verified CRC. WebP uses RIFF XMP with repaired lengths, padding and feature flags, adding VP8X for simple files when needed. Every output is inspected again, every compressed payload is compared byte for byte and dimensions must match. The output inspector shows its reread metadata and the compressed-payload SHA-256 values.

GIF, HEIC, AVIF, TIFF, raw images, JPEG XL, JPEG JUMBF, multiple-image JPEG, HDR gain maps, Extended XMP and multiple XMP packets are rejected. XML must be valid UTF-8 and remain within 1 MiB, 10000 element nodes and depth 32. DTD and XML entity declarations are rejected. Production processing is bounded to 20 seconds in a replaceable worker. No embedded URL or XML content is executed.

## Development

Use Node 24.21.0 and npm 12.2.0. Exact dependencies and CI actions are pinned. Direct dependency selection was checked against the official npm registry on 6 October 2026. TypeScript 6.0.3 remains selected because the current ESLint adapter excludes TypeScript 7. Node types match runtime major 24.

```sh
npx --yes npm@12.2.0 ci
npx --yes npm@12.2.0 run check
npx --yes npm@12.2.0 test
npx --yes npm@12.2.0 run build
npx --yes npm@12.2.0 exec playwright -- install --with-deps chromium firefox webkit
npx --yes npm@12.2.0 run test:browser
npx --yes npm@12.2.0 run test:performance
```

CI checks Ubuntu and Windows, all three supported engines and Linux performance before deploying the exact checked revision with GitHub Pages. The production CSP blocks connections and form submission. Hosting still receives requests for static pages and assets.

## Sources and rights

The reader, container surgery, shared chrome, original assets and tooling are adapted from [VINASIG/metadata-cleaner at fd81542e1f7f1539d04465a3e61370a1e22ab514](https://github.com/VINASIG/metadata-cleaner/tree/fd81542e1f7f1539d04465a3e61370a1e22ab514). Changes add XMP serialization, editing flows and their validation. The shared design-system revision and asset digests remain in [the brand record](docs/BRAND.md). The approved agent-standards snapshot and installer provenance are in [the standards record](docs/STANDARDS.md).

Software uses [AGPL-3.0-or-later](LICENSE). Documentation uses CC-BY-SA-4.0. Space Grotesk retains OFL-1.1. VINASIG identity uses the separate brand policy. Original dependency licenses and literal notices are distributed with the site. User files and independent outputs keep their own rights. See [LICENSES.md](LICENSES.md), [the license review](docs/audits/LICENSING.md), [product scope](docs/PRODUCT.md) and [technical references](docs/RESEARCH.md).

System defaults and shared deliberate theme/language choices follow [the ecosystem preference contract](docs/LOCALIZATION.md). Active work is preserved when another tab changes language.
