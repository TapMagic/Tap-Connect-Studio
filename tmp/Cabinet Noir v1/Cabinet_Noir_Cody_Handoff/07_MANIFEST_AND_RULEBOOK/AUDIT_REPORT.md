# Cabinet Noir Package Audit Report

Date: 2026-08-17

## Results

- Every PNG included in the package has an RGBA alpha channel.
- Every included PNG has transparent pixels (`alpha_min = 0`).
- Source `CN-040 ... 2.png` is byte-identical to canonical CN-040 and was quarantined.
- Older CN-043 center-spine revisions are not runtime authorities; the certified `SEGMENT 2` master with SHA-256 `45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea` is the sole production authority.
- Google G source was numbered `CN-36`; package canonical ID is normalized to `CN-036`.
- macOS `__MACOSX` metadata was discarded.
- No image pixels were modified during organization; production files are copied byte-for-byte from the supplied archive under normalized filenames.

## Final replacement certification reconciliation

- CN-011 is certified PASS at 2172×724 with SHA-256 `98375c60b7fd240eda469f650bcf0d3bfc8d41df763f01b91d573868a31db990`. Its live-text and guarded-center rectangles are fully calm.
- CN-039 is certified PASS at 2172×724 with SHA-256 `539f056571632cc93175079b4d96a0f1f2f39ad39663db05fe07b27fd2013c78`. It represents one Standard Action cadence with a 724 px runtime stride and zero preferred overlap.
- CN-042 is certified PASS at 2172×362 with SHA-256 `39972ed76575213469916dcdc2744ea1367533c0ee1f7d895edecb430c350a08`. It represents one paired level with a 362 px runtime stride and zero preferred overlap.
- CN-043 is certified PASS at 1024×1536 with SHA-256 `45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea`. It scales deterministically to one 362 px paired-level cadence with zero preferred overlap.
- The packaged canonical production copies were refreshed byte-for-byte from these certified masters. Superseded CN-011, CN-039, CN-042, and CN-043 hashes and failed measurements are not active authorities.
- CN-039, CN-042, and CN-043 tile continuously at 0, 1, and 2 px test overlaps. Runtime uses 0 overlap; no compensating overlap is required.
- Assets under `99_SUPERSEDED_DO_NOT_DEPLOY/` remain quarantine-only and are excluded from runtime registry metadata.
- Final family geometry/readiness status is **PASS**. See `GEOMETRY_CERTIFICATION.md`.

## Open governance items (not silently invented)

1. Exact color hex/token values are not present in this asset archive. Use the existing approved Studio color chart.
2. Champagne Gold + blackened gunmetal is the only fully certified finish in this pack. Brushed Silver, Warm Copper, and Gunmetal-led finishes were discussed but need manufactured visual certification before release.
3. Third-party platform/logo usage should pass brand/legal review before public release; Exact Asset mode may be required for official marks.
