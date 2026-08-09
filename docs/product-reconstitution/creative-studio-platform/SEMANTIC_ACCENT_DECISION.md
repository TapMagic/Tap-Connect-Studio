# Semantic domain accents — headed evaluation decision

## Decision

**SHIPPED** — restrained semantic accents on the Creative Studio left rail.

Authority: `lib/fusion/creative-studio/semantic-accents.ts`  
Wiring: `components/fusion/card/card-creative-tool-rail.tsx` (`data-semantic-domain`)

## Headed comparison

Evaluated in headed Chromium against the dark Studio chrome:

| Option | Observation |
| --- | --- |
| No accents | Domains feel flat; Host must read every label |
| Strong panel recolor | Noisy; competes with customer artwork |
| Narrow edge / active chip hue | Quiet orientation; readable on dark UI |

## Mapping

| Domain | Hue family | Examples |
| --- | --- | --- |
| Text / Typography | Sky | Text, Fonts |
| Media / Imagery | Soft rose | Media, Background, Logos |
| Appearance | Soft violet | Appearance, Materials, Patterns |
| Structure | Soft green | Layers, Align, Group |
| Assist | Brand lime | Writing Assist |
| Action | Soft amber | Bind / Action where present |

## Constraints honored

- No large panel recolor
- Does not compete with Card artwork
- Accessible contrast on dark chrome
- Learned through repetition, not rainbow chrome

## Rejected alternative

Full rainbow drawer headers — rejected as visual noise.
