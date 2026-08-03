# Creative Studio object capability matrix

Baseline revision: `acfdfa34273d57ba213db6bd36e2c1037223cdf6`

Object types audited: **31**. This is a product-support matrix, not a promise that every capability is valid for every object.

Codes: ✓ working path; ◐ partial or unproved UI; × unsupported and must be hidden; L legacy adapter; — not applicable. Common persistence columns are summarized separately to keep the matrix readable.

## Authoring and direct manipulation

| Object | Add | Direct / Layers selection | Move | Resize / ratio | Rotate | Replace / Convert | Group | Duplicate / Delete | Main forensic disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Document root | ✓ | ✓ / — | — | — | — | clone/adapt ✓ | — | clone ✓ | preserve authority |
| Page/artboard | — | — | — | — | — | — | — | — | Tap Card has governed single page; generic pages hidden |
| Card root | ✓ | ✓ / ✓ | — | responsive governed | — | background ✓ | — | clone ✓ | target-labelled root tools |
| Section | ✓ | ✓ / ✓ | reorder ✓ | height/width ◐ | — | surface preset ◐ | — | ✓ | shared Surface and plane proof |
| Group | relationship ✓ | ◐ / × | ✓ | ◐ | ◐ | × | ungroup ✓ | ◐ | add Layer entity/boundary |
| Text | ✓ | ✓ / ✓ | ✓ | ✓ / unlocked | ✓ | content ✓ | ✓ | ✓ | shared Text engine |
| Heading | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | text style ✓ | ✓ | ✓ | shared Text engine |
| Subheading | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | text style ✓ | ✓ | ✓ | shared Text engine |
| Curved Text | ✓ | ✓ / ✓ | ✓ | inaccurate box ◐ | ✓ | curve ✓ | ✓ | ✓ | geometry audit |
| Image | ✓ | ✓ / ✓ | ✓ | ◐ / default flag only | ✓ | media L | ✓ | ✓ | remove Inspector placeholder; Media path |
| Product thumbnail | ✓ | ✓ / ✓ | ✓ | ◐ / default flag | ✓ | media ◐ | ✓ | ✓ | Media parity |
| Logo | ✓ | ◐ / ✓ | ◐ | ◐ / default flag | ◐ | media ◐ | ✓ | ✓ | direct acquisition and ratio proof |
| Secondary Logo | ✓ | ◐ / ✓ | ◐ | ◐ / default flag | ◐ | media ◐ | ✓ | ✓ | multiple-logo proof |
| Icon | ✓ | ✓ / ✓ | ✓ | ◐ / missing default | ✓ | icon choice ◐ | ✓ | ✓ | visual library/capabilities |
| Badge | ✓ | unreliable / ✓ | ◐ | ◐ / missing default | ✓ | wording/style L | ✓ | ✓ | dedicated library and shared Text/Surface |
| Button | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | style/action ◐ | ✓ | ✓ | additive insertion and nested content |
| Button label | L | × / × | × | × | × | string adapter L | — | — | make child-selectable Text |
| Button description | L | × / × | × | × | × | props adapter L | — | — | make optional child Text |
| Button Icon | L | × / × | × | × | × | props adapter L | — | — | make child selectable |
| Map | ✓ | ✓ / ✓ | ✓ | ◐ | ✓ | setup ◐ | ✓ | ✓ | no Inspector/provider-free path |
| Divider | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | line style ◐ | ✓ | ✓ | Transform/Surface subset |
| Gallery | ✓ | ✓ / ✓ | ✓ | ◐ | ✓ | media ◐ | ✓ | ✓ | media collection parity |
| Video | ✓ | ✓ / ✓ | ✓ | ◐ / default flag | ✓ | media ◐ | ✓ | ✓ | honest provider/readiness |
| Offer code | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | text ✓ | ✓ | ✓ | shared Text |
| Terms | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | text ✓ | ✓ | ✓ | shared Text |
| QR | ✓ | ✓ / ✓ | ✓ | ◐ / default flag | ✓ | operation hidden | ✓ | ✓ | artwork only; QR operations out of scope |
| Reusable composition | ✓ | instance nodes / ◐ | nodes ✓ | nodes ◐ | nodes ◐ | independent place ✓ | groupId L | ✓ | Layer hierarchy/resource identity |
| Campaign link | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | binding ◐ | ✓ | ✓ | preserve operation hooks |
| Experience link | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | binding ◐ | ✓ | ✓ | preserve operation hooks |
| Contact form link | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | binding ◐ | ✓ | ✓ | no form-system expansion |
| Decorative shape | ✓ | ✓ / ✓ | ✓ | ✓ | ✓ | shape ◐ | ✓ | ✓ | Surface subset |

## Capability parity

| Object family | Text | Surface | Media | Effects | Motion | Position/Layers | Action | A11y/Tracking | Responsive | Repair rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Card root | × | ✓ | background ✓ | ◐ | × | root ✓ | × | ◐ | governed ✓ | hide invalid object controls |
| Section | × | ◐ | background ◐ | shadow/glow ◐ | × | ✓ | × | ◐ | ✓ | one shared Surface model |
| Text family | ◐ | × | × | ◐ | ✓ | ✓ | registry says Action ◐ | ◐ | ✓ | one Text panel |
| Image/Logo/Thumbnail/Gallery/Video | × | frame ◐ | ◐ | ◐ | ✓ | ✓ | ◐ | ◐ | ✓ | ratio lock and visual Media path |
| Icon | × | backing ◐ | × | ◐ | ✓ | ✓ | ◐ | ◐ | ✓ | shared Transform/Motion/Action |
| Badge | L | L | × | ◐ | ✓ | ✓ | registry ✓ / UI ◐ | ◐ | ✓ | Text child + Surface parity |
| Button parent | child L | ◐ | optional × | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | preserve bindings during style |
| Button children | × | × | × | × | × | × | — | × | × | rebuild as addressable child path |
| Map | caption L | frame ◐ | static preview ◐ | ◐ | ✓ | ✓ | Directions ✓ | ◐ | ✓ | provider-free fallback |
| Divider/shape | × | subset ◐ | × | ◐ | ✓ | ✓ | ◐ | ◐ | ✓ | capability-based visibility |
| QR | × | frame ◐ | managed artwork ◐ | ◐ | ✓ | ✓ | gateway hidden | ✓ | ✓ | no QR operations in this pass |
| Group/reusable | children | optional ◐ | children | children | children | ◐ | children | children | ◐ | no flattening |

## Cross-cutting persistence requirements

Every supported canonical object must pass unique identity, labelled Undo/Redo, quiet autosave, reload, Preview, public-render compatibility where already supported, copy/paste, and document clone. Initial audit finds these broadly present for top-level composition nodes but unproved or missing for nested Button children, Group hierarchy, Badge shared text, and resource-backed Media replacement.

Unsupported or out-of-scope capabilities remain hidden: generic page/artboard operations in Tap Card, QR operations, live Campaign deployment, scheduling, messaging, payment, Wallet, Coupon/Ticket/Form systems, social publication, and Autopilot execution.

## Completion delta

The direct-manipulation families exercised by the master Card are now on canonical paths:

| Object/family | Final capability result |
| --- | --- |
| Root and Section | insertion destination is explicit; unknown targets fail; Section surface panels are target-labelled and docked |
| Badge | additive collision-aware placement; direct/Layers selection; shared Text and Surface controls; transform/duplicate/delete through the common node path |
| Button | additive placement; shared parent Surface/Action/Motion/Position; label and icon are stable nested composition children surfaced through Layers and child-path selection |
| Image/thumbnail | Assets-first insertion; shared Media replace; alt/decorative fields; no legacy Inspector placeholder |
| Logo | ordinary canonical Image node with direct and Layers selection and the shared transform/media paths |
| All top-level nodes | common duplicate/delete/reorder/visibility/lock navigation through Layers and the object kernel |

Button children remain constrained content inside the Button’s governed action boundary rather than free-floating top-level canvas objects. This preserves click-target semantics while making each child independently addressable for selection and editing. Generic group-layer entities, cross-browser clipboard transport, and unrelated operational systems were not expanded in this completion pass.
