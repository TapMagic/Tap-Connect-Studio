# Left Edit Drawer Specification

The compact contextual toolbar is the fast launcher; the target-aware drawer is the complete editor. Desktop placement is immediately beside the permanent left rail. Narrow viewports use the existing bottom-sheet geometry. No object editor is mounted on the right.

The drawer preserves the selected `SelectionRef`, generation, parent/child target, object family, command subsection, current canonical properties, history transaction, autosave, and Preview/Public renderer. Its header exposes object name, family/type, root breadcrumb, lock and visibility status, subsection, and Close. Long panels scroll independently.

Routes are resolved through `dispatchEditorCommand`. The dispatcher validates the object family against the command registry and opens the command’s exact subsection. Toolbar, left-library shortcut, and More entry points must call this dispatcher; they may not own parallel mutation state.

Group conventions:

- highlight current values with `aria-pressed` or the native selected value;
- keep None/Transparent/No motion explicit;
- expose Reset group and Reset capability where applicable;
- make Undo available from More and global history;
- identify Brand/provider inheritance and draft-only readiness;
- hide unsupported groups instead of showing disabled unrelated effects;
- use one substantial drawer at a time;
- restore the previous library when the drawer closes (session-memory follow-up is tracked as a human-verification item).

Nested components enter content mode and expose canonical child selection. The child then receives the normal Text/Icon/Image/Button/QR editor; parent action and identity do not migrate to the child.
