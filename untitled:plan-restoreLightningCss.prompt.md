## Plan: Restore Lightning CSS

The lockfile already includes `lightningcss-linux-x64-gnu@1.32.0`; it was skipped because dependencies were installed with optional packages omitted.

**Steps**
1. Stop any active npm/Next process if necessary.
2. Run `npm install --include=optional --no-audit --no-fund`.
3. Confirm `node_modules/lightningcss-linux-x64-gnu` exists and can be required.
4. Run `npm run lint` and `npm run build`.
5. Restart `npm run dev` and verify `http://localhost:3000`.

**Scope**
- No changes to [postcss.config.mjs](postcss.config.mjs), [globals.css](src/app/globals.css), or application code.
- The fix is dependency restoration only.
