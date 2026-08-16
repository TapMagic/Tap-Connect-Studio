# Signature System v1 live socket map

| Role | Canonical Studio object | Live content |
| --- | --- | --- |
| Circle Icon Action | Button | identity/icon and Action |
| Badge / Shield Action | Button | identity/icon, title, description, Action |
| Portrait Anchor / Extended Team Action | Button | portrait/media, title, description, Action |
| Identity masters | Image | image/logo/portrait media |
| Stages | Composition/container | independent Action, Identity, Divider, and Micro Part children |
| Dividers | Divider | no invented sockets |
| Status Chip | Button with `actionType: none` | status text |
| Alert Token | Button with `actionType: none` | status text and icon/media |
| Rating Star | Image | independent repeatable token |
| Icon Row Token | Image | independent repeatable icon/media token |

All edit, Preview, live-device, and future public rendering use `SignatureMasterBridge`; the raster shell is not decomposed or rewritten.
