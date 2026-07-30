# Creative Studio Asset Rights and Attribution

**Classification:** `IMPLEMENTATION IN PROGRESS`

TapConnect stores media provenance; it does not claim ownership of provider or uploaded assets.

## Persisted provenance

`MediaAsset` records:

- source and provider ID
- original source URL
- attribution name and URL
- dimensions and MIME type
- rights note
- import timestamp
- TapConnect-controlled URL when import storage is configured

## Source rules

- **Upload:** the Owner supplied the file and is responsible for usage rights.
- **Pexels:** preserve photo ID, original Pexels page, photographer, photographer URL, dimensions, and Pexels license note.
- **Logo.dev:** preserve normalized company/domain identifier and Logo.dev source. Trademark rights remain with the brand owner.
- **Wikimedia or favicon fallback:** identify the actual source. Do not promote the result to Brand-approved automatically.
- **Advanced URL:** identify it as externally hosted and rights-unverified.
- **Procedural patterns/textures:** generated from code; no unlicensed bundled imagery.

## Safety

- No arbitrary remote-host import.
- No arbitrary unsanitized SVG mask upload.
- No silent permanent hotlink when durable import is available.
- No false imported/connected state.
- No provider token in returned media URLs, JSON, logs, or committed files.

