# AGENTS.md

## Project context

This is an Obsidian plugin named `TW Arrow Nav`.

The plugin lets users navigate the Obsidian file explorer with arrow keys, preview files while moving, and open the selected file with Enter.

## Important files

Runtime files used by Obsidian:

- `manifest.json`
- `main.js`

Source and build files:

- `main.ts` — primary plugin behavior
- `rollup.config.js` — build configuration
- `package.json` — dependency and script definitions
- `package-lock.json` — locked dependency graph
- `tsconfig.json` — TypeScript configuration
- `versions.json` — Obsidian version compatibility
- `.gitignore` — excludes generated and local files

Documentation and metadata:

- `README.md`
- `LICENSE`

## Edge-case triage

For functional behavior issues, inspect `main.ts` first.

Examples:

- Arrow keys trigger unexpectedly
- Arrow keys do nothing
- Preview opens the wrong file
- Enter opens the wrong file or does nothing
- Behavior after minimize/restore
- Behavior after clicking outside explorer
- Collapsed-folder or hidden-file behavior

For build failures, inspect:

- `rollup.config.js`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

For Obsidian loading or release issues, inspect:

- `manifest.json`
- `versions.json`
- generated `main.js`
- GitHub release assets

For documentation or expectation mismatch, inspect:

- `README.md`
- `manifest.json` description

## Release policy

Do not commit `main.js` to the source repository.

`main.js` is generated with:

```bash
npm run build
```





## File Explorer Keyboard Navigation Behavior

The plugin should create a true keyboard-owned navigation cursor in the Obsidian file explorer.

Navigation ownership must be independent of Obsidian’s currently open file, native file selection memory, and stale DOM focus artifacts. The plugin must maintain exactly one logical navigation anchor at all times.

The plugin may render a lightweight plugin-owned cursor style to show that navigation anchor. It must not rely on or mutate Obsidian’s internal focused/selected explorer classes to pretend that Obsidian owns the focus.

## Core Rule

The plugin decides which explorer item owns navigation focus.
The DOM should reflect that ownership.
The plugin must not infer ownership from stale DOM state after an action has completed.

After every navigation action, exactly one explorer item should own navigation focus.

## Arrow Up / Arrow Down

Pressing Arrow Up or Arrow Down should move the navigation anchor to the previous or next visible file explorer item.

The newly anchored item should receive the plugin’s visible navigation cursor state. The previous item should lose navigation ownership. Preview should update when the new anchor is a file.

## Enter

Pressing Enter should open the file currently owned by the navigation anchor.

After opening, the navigation anchor should remain on that same file item.

## Left Arrow

### When the anchor is on an expanded folder

Pressing Left Arrow should collapse that exact folder.

Before collapse, ownership should be explicitly confirmed on that folder. After collapse, the folder must remain the sole navigation anchor and should retain the plugin’s visible navigation cursor state.

No child item inside that folder may remain remembered.

### When the anchor is on a file inside a folder

Pressing Left Arrow should:

1. Resolve the file’s immediate containing folder.
2. Transfer navigation ownership fully from the file to that folder.
3. Collapse that folder.

After this action, the file must not remain remembered, selected, focused, or used as the basis for future navigation. Future Arrow Up, Arrow Down, Enter, or Left actions must start from the folder.

Visually, the result should be equivalent to the folder itself owning the plugin’s visible navigation cursor and then being collapsed.

### When the anchor is on a root-level file

Pressing Left Arrow should do nothing.

It must not collapse a previously interacted folder, fall back to stale folder memory, or use any hidden/previous child item as context.

## Forbidden Behavior

The plugin must never allow:

* more than one item to own navigation focus
* a hidden child item to remain remembered after its parent folder is collapsed
* a root-level file to collapse an unrelated folder
* native active-file styling to be treated as navigation ownership
* mutating Obsidian’s internal focused/selected classes to imitate ownership
* `document.activeElement` to override the plugin’s explicit navigation anchor after navigation state has been established

## Implementation Principle

All navigation decisions should be based on the plugin’s own current navigation anchor first.

DOM focus may be used only as an initial fallback when no plugin anchor exists yet, such as immediately after a user click. Once the plugin has established an anchor, that anchor is the source of truth.
