# Editor Target / Scope Contract

**Authority:** `lib/fusion/creative-studio/editor-context.ts`  
**Consumers:** contextual toolbar, canvas selection chrome, deep-left drawer, mutation fan-out

## Resolved EditorContext

Every visible editor command derives from one resolution:

```ts
EditorContext {
  selectionMode
  selectedTargets
  parentTarget
  childTarget
  activeScope
  objectFamily
  capability
  groupId
  exclusiveGroupToolbar
  awaitingContentChild
}
```

Selection + Scope + Target + Capability must agree across Canvas, toolbar, drawer header, Layers, mutation, and renderer.

## Selection modes (mutually exclusive)

| Mode | Toolbar chrome |
| --- | --- |
| `NONE` | none |
| `SINGLE_OBJECT` | object family |
| `MULTI_SELECTION` | multi (+ Group) |
| `GROUP_PARENT` | **Group only** |
| `GROUP_CONTENT` | Finish + child object (after Owner pick) |
| `COMPONENT_PARENT` | component parent |
| `COMPONENT_CONTENT` | child object |
| `CARD_ROOT` | card root |

## Critical toolbar rule

`GROUP_PARENT` never renders Text / Button / Badge / Icon chrome merely because the primary member happens to be one of those types.

One Appearance command on Group. No duplicate Appearance.
