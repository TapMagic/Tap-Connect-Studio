# Deep Editor Route and Selection Repair

Status: assembly candidate — human verification required.  
Starting SHA: `7f0f16aedf93bdea7020f28edcee47260b694f8b`

## Authority chain

```
SelectionRef (exact target)
  → Toolbar command (exact capability)
  → DeepEditorRoute push (exact page)
  → Canonical mutation (SelectionRef + generation)
  → Edit renderer
  → Preview renderer
  → Persistence / reload
```

No Card Root fallback. No generic shared form for unrelated commands.

## SelectionRef

| Field | Role |
| --- | --- |
| `documentId` | Document identity |
| `pageId` | Page identity |
| `revision` | Document revision |
| `selectionGeneration` | Generation — reject stale mutations |
| `objectId` | Selected object |
| `parentId` | Parent container / page |
| `childPath` | Nested path |
| `objectKind` | Kind discriminator |
| `targetLevel` | `document` \| `card-root` \| `component-parent` \| `component-child` \| `text-content` \| `icon-content` \| `surface` \| `frame` |
| `selectedCapability` | Capability open in deep-left when applicable |

## No selection

- No contextual toolbar
- No active edit drawer
- No handles
- Never promote Card Root

## Card Root

Only via: visible Card background click, Layers → Card root, Background, Page size.

## Icon selected

Toolbar: `Icon · Fill · Stroke · Appearance · Action · Animate · Position · More`  
Breadcrumb: `Icon` or `Container › Icon` — never `Card Root`.

## DeepEditorRoute stack

```ts
DeepEditorRoute = {
  routeId, target, capability, page, title,
  parentRouteId, dataSource
}
session.routeStack: DeepEditorRoute[]
```

Back pops one route. Close clears stack → library.

## Minimum real pages

| Capability | Pages |
| --- | --- |
| Color | overview, design-colors, brand-colors, photo-colors, recent-colors, solid-colors, gradient-colors, custom-color |
| Icon | overview, recommended, search-results, recent, favorites, collection, change-icon |
| Material | overview, flat, raised, recessed, glass, metallic, enamel, neon, texture, custom |
| Border | overview, style, width, color, radius |

## Command ledger (visible → status)

| Object | Level | Toolbar | Deep route | Mutation | Edit | Preview | Persist | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Icon | parent | Icon label | — | selection only | canvas | public card | JSON | unit+e2e | repair |
| Icon | parent | Change Icon | icon/change-icon | replace IconAsset | SVG body | same | props | unit+e2e | repair |
| Text | text-content | Color | color/overview→solid/gradient/photo | glyph color | canvas | same | props | unit+e2e | repair |
| Surface | surface | Material | material/overview | MaterialRecipe | CSS recipe | same | props | unit | repair |
| Surface | surface | Border None | border/style | clear border* | no border CSS | same | props | unit | repair |
| Badge | parent | Shape / Material | material + shape | independent props | canvas | same | props | unit | repair |
| Button | parent/label/icon | Surface / Label / Icon | material / color / icon | separated targets | canvas | same | props | unit | repair |

## Anchors

- `lib/fusion/creative-studio/selection-ref.ts`
- `lib/fusion/creative-studio/selection-mode.ts`
- `lib/fusion/creative-studio/deep-left-editor.ts`
- `components/fusion/card/card-contextual-object-toolbar.tsx`
- `components/card/tap-card-builder.tsx`
