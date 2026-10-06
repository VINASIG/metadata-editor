# Dependency selection - 6 October 2026

All direct package versions were checked against official registry.npmjs.org metadata during project creation and locked with npm 12.2.0. Astro 7.3.5, Lucide Astro 1.52.0, xmldom 0.9.12 and ExifReader 4.46.0 are current stable compatible selections. No extra runtime dependency is needed for writing metadata. The standards, assets and existing parser source are reused with their original notices.

TypeScript 7.0.2 is latest, while typescript-eslint 8.71.1 requires a version below 6.1. TypeScript 6.0.3 remains the compatible selection. Node types 24.19.1 match pinned Node 24.21.0 rather than latest types major 26. Remaining direct development dependencies match their current stable releases. CI actions are pinned to the reviewed sibling's full commit IDs.

The runtime audit has zero vulnerabilities. The full development audit reports seven high findings in the build-only braces chain through Stylelint and its configuration. The incompatible force downgrade is not applied. This distinction does not claim the full graph is advisory-free. The original notices for production dependencies are distributed at their exact locked versions.

Local browser tests use the existing isolated official pinned Chromium, Firefox and WebKit cache. CI installs and tests all three engines on both Windows and Ubuntu. The shared global Firefox cache's earlier assembly problem is not bypassed by skipping an engine. Performance remains a local laboratory observation, not field INP or physical-device certification.
