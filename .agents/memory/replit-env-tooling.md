---
name: Replit env tooling for this repo
description: How to get node and Playwright browsers working in the bare Replit shell for this project
---
- The bare ShellExec PATH has no node/npm. Get a working node with `available-pid2-node-paths` (in the replit-runtime-path bin) and prefix `export PATH=<nodejs>/bin:$PATH`.
- Playwright chromium headless-shell needs Nix system deps: glib, nss, nspr, at-spi2-atk, cups, dbus, libdrm, expat, libxkbcommon, pango, cairo, alsa-lib, mesa, libgbm, xorg.libX11/Xcomposite/Xdamage/Xext/Xfixes/Xrandr/libxcb, gtk3 (via installSystemDependencies). These land in replit.nix — keep replit.nix out of git via .git/info/exclude on the penthouse branch.
- E2E runs against the dev server with `BASE_URL=http://127.0.0.1:5000 npx playwright test ...`.
**Why:** first e2e attempt failed with exit 127 loading shared libs; `npx playwright install --with-deps` cannot install OS deps here.
**How to apply:** any time e2e or node scripts are needed in a fresh session on this repo.
