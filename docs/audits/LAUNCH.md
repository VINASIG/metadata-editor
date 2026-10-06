# Metadata Editor launch evidence - 6 October 2026

This document records the new separate project. Verification and publication observations are added only after execution. Private images, identifiers, XML, screenshots and local account captures stay in ignored output. Public tests use synthetic fixtures.

## Established source and repository

The reviewed base is VINASIG/metadata-cleaner fd81542e1f7f1539d04465a3e61370a1e22ab514. Shared web-design-system chrome is pinned at f0fc7e5d04bbc2d70499a2aece59d6992b36d03e, with original artwork and font digests. The new project does not change either existing metadata tool.

GitHub repository VINASIG/metadata-editor was created public within the existing publication authorization. Description, README homepage and ten relevant topics were set during creation and read back with gh repo view. The canonical website destination is https://edit.vinasig.io.vn/ and /en/. A canonical About homepage is set only after live HTTPS is verified.

## Local verification

Source checks PASS with zero Astro errors, warnings or hints, typed ESLint, CSS lint, formatting, the 51-file standards integrity check and license validation. All 44 unit tests PASS, including Unicode, dates, arrays, packet ambiguity, Extended XMP refusal, bounded compressed XMP, display hints, provenance removal and byte preservation. Built HTML, bilingual metadata, CSP, all nine original asset digests and distributed license copies PASS.

All 27 browser tests PASS across Chromium, Firefox and WebKit. Both locales and themes cover 320 through 1440 px, 759/760/761 px breakpoint neighbors, 200 percent text, no script, native keyboard/forced-color controls, downloads, reset, stale output, safe filenames, output metadata and real decoded JPEG/WebP pixel equality. Interface, control-surface, indicator, header-brand and shared-chrome inspectors PASS with actual control counts. The header logo performs native home navigation in both locales at 320 and 1440 px.

Five owner-provided local PNG, JPEG and WebP images PASS 15 real-file flows across the three engines. Downloaded XMP values reread correctly, all compressed payloads and dimensions are unchanged, and decoded pixel SHA-256 values match before/after. Original file hashes are unchanged, with no outbound requests or page errors during processing. Private filenames, fields, images, hashes and screenshots remain only in ignored output/real-files.

Initial English 200 percent text overflow was traced to the application's radio sizing and flex wrapping. The source fix preserves native radios, full visible labels and 44 px label targets. The original failure screenshot/trace is retained in ignored output/responsive/before. Final responsive captures were opened, including mobile, full edited form and shared footer.

Lighthouse ran three mobile and three desktop measurements for each locale before and after isolating the XML parser in the worker. Initial mobile median LCP was 2363 ms Vietnamese and 2358 ms English. Final medians are 1737/1727 ms mobile and 402/402 ms desktop. CLS and TBT are zero throughout. Performance is 99 mobile and 100 desktop, accessibility and best practices 100. SEO is 92 with the deliberate no-connect CSP, while generated robots/sitemap/canonical checks PASS separately. The initial UI JavaScript was 128909 bytes, now 44213 bytes. Budgets are unchanged. Full reports and timings remain in ignored output/lighthouse. Field metrics, physical devices, screen-reader certification and fresh agent discovery are NOT_RUN.

Repository push, exact-commit CI, deployed HTTPS, DNS and Search Console are post-commit observations and remain pending at the time of this source audit.

## First publication observed

The signed initial commit a9ec4b93153e3467846c5d82e48b1146e09b8662 was pushed to main and matched the remote. Run 37412476562 passed both operating systems, all engines and required budgets, then deployed that revision. Cloudflare now has CNAME edit to vinasig.github.io, DNS only and Auto TTL. Both 1.1.1.1 and 8.8.8.8 return the intended Pages addresses and permitted certificate issuers. GitHub's initial negative DNS result was resolved by the visible Check again action after public DNS verification. Its certificate is approved and HTTPS enforcement is enabled. No record was removed or proxy/security protection disabled.

Actual HTTPS serves both locales, robots and the two-URL XML sitemap with HTTP 200. The source-revision metadata and footer link match the checked commit. All six deployed locale/engine flows PASS the interface, controls, header, chrome, reflow and axe checks in both themes, with native homepage navigation. All 15 deployed real-image flows PASS the same payload/dimension/pixel equality, edited-field rereading, original-file hashes and no-upload checks. Detailed receipts and private captures stay in ignored output/live and output/real-files/live. Initial live verification helper failures were corrected by using an explicit browser context for axe and awaiting the theme-selected original logo image load. Product gates and assertions were unchanged.

Repo details now point to verified https://edit.vinasig.io.vn/ and their description, ten topics and public visibility were read back. The homepage inventory and both organization profile languages were updated in their own signed commits. Their exact live observations and Search Console's submission/processing state are recorded separately at handoff. A final copy refinement explicitly labels the original image's XMP/C2PA facts, avoiding confusion with the processed inspector. That copy refinement undergoes the same source, build and browser gates, with its own post-commit CI and deployed revision verification.
