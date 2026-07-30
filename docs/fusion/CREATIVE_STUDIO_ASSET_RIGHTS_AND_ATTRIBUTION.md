# Creative Studio Asset Rights and Attribution

**Classification:** `IMPLEMENTATION IN PROGRESS`

Tap Connect can store supplied media provenance; it does not establish ownership,
permission, trademark clearance, or legal reuse rights.

## Implemented data and API fields

`MediaAsset` records:

- source and provider ID
- original source URL
- attribution name and URL
- dimensions and MIME type
- rights note
- import timestamp
- TapConnect-controlled URL when import storage is configured

The schema and API support these fields, and the shared browser can display supplied
metadata before insertion. That does not prove a production migration has been applied,
that every legacy asset has metadata, or that a provider import persisted successfully.
No credentialed provider/R2 persistence was available during this closeout.

## Source rules

- **Upload:** the Owner supplied the file and is responsible for usage rights.
- **Pexels:** preserve photo ID, original Pexels page, photographer, photographer URL, dimensions, and Pexels license note.
- **Logo.dev:** preserve normalized company/domain identifier and Logo.dev source.
  Trademark rights remain with the trademark owner; search presence is not permission.
- **Wikimedia or favicon fallback:** identify the actual source. Do not promote the result to Brand-approved automatically.
- **Advanced URL:** identify it as externally hosted and rights-unverified.
- **Procedural patterns/textures:** generated from code; no unlicensed bundled imagery.

## Safety

- No arbitrary remote-host import.
- No arbitrary unsanitized SVG mask upload.
- No silent permanent hotlink when durable import is available.
- No false imported/connected state.
- No provider token in returned media URLs, JSON, logs, or committed files.

## Remaining work

- Durable Brand approval/rejection and approved variants: `NOT IMPLEMENTED`
- Credentialed Pexels/Logo.dev/R2 provenance persistence proof:
  `IMPLEMENTATION IN PROGRESS`
- Backfill and quality checks for existing `MediaAsset` records:
  `IMPLEMENTATION IN PROGRESS`
- Rights-policy review and Owner-facing legal guidance:
  `IMPLEMENTATION IN PROGRESS`
- Cross-surface attribution rendering requirements:
  `IMPLEMENTATION IN PROGRESS`

