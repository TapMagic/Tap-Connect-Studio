# EverEncore / Love & Theft visual fidelity gap audit

Status before correction: **rejected**. This audit compares the current deterministic 390 px Love & Theft runtime, the approved guitar-pick construction described by the Product Owner, and the existing Cabinet Noir phone/runtime evidence.

## Evidence inspected

- Current Love & Theft: `runtime/everencore-love-and-theft-hero-phone390.png`, all other current presentation captures, and `runtime/live-device-gallery-phone390.png`.
- Guitar-pick authority: aged-brass pick visibly above a long glass bar, layered cast/machined construction, recessed semantic icon, thin warm rim, controlled specular response, internal glass depth, elegant label/sublabel hierarchy, and restrained floating contact shadow.
- Cabinet Noir benchmark: `../cabinet-noir-compact-stacked/01-current-standalone-action.png`, `../cabinet-noir-final-tuning/01-single-stack-4-phone.png`, and `../cabinet-noir-final-tuning/02-twin-rail-4-phone.png`.

## Exact deficiencies before correction

| Area | Current Love & Theft failure | Guitar-pick target / Cabinet Noir benchmark gap |
| --- | --- | --- |
| Pick silhouette | The outline reads as a soft rounded triangle with nearly uniform curvature and line weight. | The authority calls for a substantial cast silhouette. Cabinet Noir retains crisp silhouette breaks and multiple edge planes at phone size. |
| Pick perimeter | One dark stroke, one brass stroke, and one faint inner line do almost all the work. | There is no distinct dark contact edge, raised rim, inner bevel, face plate, or hairline highlight hierarchy. |
| Brass material | The face is a broad gold/brown gradient with little localized wear. | It lacks directional polish, patina variation, edge burnishing, lowlight separation, and small-scale specular control. It reads as gold fill rather than aged brass hardware. |
| Pick/bar contact | The pick overlaps the bar geometrically, but its shadow is diffuse and the shared edge is not convincingly occluded. | The reference requires the pick to sit physically above the bar. Cabinet Noir has a clear contact plane and darker occlusion at component junctions. |
| Engraved icon | The canonical icon is darkened with two drop shadows but has no cavity, inner wall, or metal lip. Filled brand marks read as pasted decals. | It lacks a recessed well, opposing edge highlight, dark cavity, and consistent relief for both fill and stroke icons. |
| Bar construction | The bar is a rounded capsule with uniform concentric outlines. | It has no distinct outer chassis, metal lip, glass face, internal trough, or lower weight. It reads as a CSS pill rather than luxury music hardware. |
| Glass depth | The fill is a single family gradient and the material renderer drops declared highlight/shine/texture response layers. | The glass has weak translucency, no environmental reflection band, limited internal shade, and insufficient separation from the brass rim. |
| Material variants | Black, burgundy, charcoal, and blue share almost identical directional response. | They are hue swaps more than distinct materials: burgundy has no warm record-like reflection; frost has no diffuse scatter; blue has no cool glass edge response. |
| Edge control | Highlights and lowlights are long, uniform strokes with limited taper or interruption. | Cabinet Noir uses several crisp edge planes, dark separators, localized bright accents, and controlled corners without muddying. |
| Shadow | The whole object uses broad soft shadows and the pick uses a generic drop shadow. | Contact, ambient lift, pick overlap, and internal depth are not separated into controlled shadow roles. |
| Typography | Georgia is centered safely, but the title and sublabel read like application text placed into a button. | The title lacks a deliberately composed display face/weight, optical tracking, and presentation-specific hierarchy. The sublabel is too small and compressed in Twin Rail. |
| Hero hierarchy | Hero is mainly a taller Standard pill. | It lacks a more authoritative chassis, wider breathing room, stronger glass response, and clearly elevated title/sublabel composition. |
| Left/right authorship | The bar is symmetric and the same visual lighting is used without authored termination cues. | Text insets work, but the opposite end and contact plane do not visually acknowledge which side owns the pick. |
| Single Stack | Thin side rails and repeated identical pills create a framed wallpaper effect. | The rails do not feel structural, row separators are weak, and cadence depends on repetition rather than manufactured junctions. |
| Twin Rail | It saves space, but small repeated trim, undersized copy, and a thin center line make it feel like a technical two-column layout. | It needs a stronger central spine, paired-level rhythm, cleaner outer chassis, and better plug/icon retention at 390 px. |
| Overall quality | The family is functional and coherent but visibly flatter and cheaper beside Cabinet Noir. | It does not yet answer “different family, same premium manufacturing platform.” |

## Correction rules

The correction will retain canonical labels, sublabels, actions, semantic icons, presentation identity, material selection, persistence, Preview, and Live Device. It will rebuild only the reusable family vector chassis and the smallest shared material/icon response needed to render already-declared highlight, shine, texture, bevel, and engraved-depth channels.

## Binding image re-audit · 2026-09-28

The actual production target was subsequently supplied at /Users/rcs/Downloads/ChatGPT Image Sep 26, 2026 at 11_14_49 PM.png. Direct comparison against the corrected runtime exposed additional, concrete gaps that were not observable from the earlier text-only brief:

| Area | Current corrected runtime | Binding cut-sheet authority |
| --- | --- | --- |
| Pick proportion | The pick is substantial but still reads closer to a medallion attached to the bar. | The pick is approximately one-third taller than the body, with a broad shoulder and emphatic pointed lower silhouette. |
| Brass face | The runtime face is dark brown with controlled edge polish. | The target face is materially brighter and visibly cast: mottled wear, pits, scratches, burnished high points, dark recesses, and uneven aged-gold coloration. |
| Ornament | The runtime face contains only the semantic cavity. | Every target pick includes a lower engraved scroll/flourish that makes the blank area authored and collectible. |
| Semantic mark | Runtime marks are readable but sit in a round recessed well. | Target marks are much larger, cut directly into the pick face, and use dark recessed artwork with a precise opposing brass lip. |
| Body-only system | No governed body-only presentation exists. | The body is visually complete independent of the pick: closed rim, deep glass, typographic field, and terminal affordance. |
| Affordance | Runtime bars end cleanly but do not carry the reference chevron. | The target uses a thin warm-metal chevron on the free end, reinforcing direction without resembling app chrome. |
| Glass specificity | Runtime materials are distinct gradients, but the surface response remains comparatively clean. | Black includes smoky shadow imagery, blue has a cool luminous edge and concert silhouette, burgundy has visible vinyl grooves, and charcoal has diffuse frost/noise. |
| Typography | Runtime title is readable and premium relative to the rejected version. | Target title is materially larger and more editorial, with highly tracked uppercase subcopy and stronger left-aligned composition. |
| Hierarchy rhythm | Existing stacks repeat a plug on every row. | The requested system explicitly requires body-only and optional-plug rows so collectible emphasis can be reserved for featured actions. |

The next correction therefore adds a family-neutral optional-plug capability, a complete body-only presentation, a larger ornamental cast-brass plug face, free-end affordance behavior, and stronger material-specific surface responses without flattening live text or semantic icons.

## Production-master correction · 2026-09-29

The Product Owner then made the final EverEncore / Love & Theft board at `/var/folders/dm/c55lvq296g9gfjvjjlg46cdc0000gn/T/codex-clipboard-d77486fc-3667-47c9-ba20-59e23c99d9d6.png` the exact visual reference. The shared renderer now resolves the selected material through four isolated transparent production masters instead of repainting the body with a generic CSS gradient:

- Smoky Black Glass
- Burgundy Plum
- Frosted Charcoal
- Deep Blue Glass

Each master contains only the manufactured body: glass face, dimensional rim, warm metallic edging, internal depth, reflection, bevel, and contact shadow. The guitar-pick plug, engraved semantic icon, editable label, editable sublabel, destination, and affordance remain governed live layers. The same body authority is used for left-pick, right-pick, and body-only compositions, so removing the signature plug produces a quieter complete object rather than an unfinished button.

The concert-background treatment is a separate reusable silhouette layer. Its figures were redrawn with distinct heads, shoulders, raised forearms, and hand shapes so the reflection reads as fans rather than abstract texture. A per-action **Background reflection** precision control exposes a governed 0–100% range (48% default), independent of the selected body color. This permits the reflection to be enhanced or suppressed without baking it into a material master or disturbing live text.

The deterministic 390 px evidence set was regenerated for Hero, Standard Left, Standard Right, Standard Body, Single Stack, and Twin Rail. Runtime assertions now require all four material IDs to resolve to their named production PNGs, require the production-master fill authority, and verify the independent reflection setting survives compiled rendering.
