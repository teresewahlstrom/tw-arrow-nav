# TW Arrow Nav

Navigate the Obsidian file explorer with a plugin-owned keyboard cursor, preview files and folders as you move, and open the anchored file with Enter.


## Support

If this plugin helps you, you can support development here: [Buy me a coffee](https://buymeacoffee.com/bytess)

## Features

- Click a file or folder in the explorer to establish the navigation cursor.
- Use Arrow Up and Arrow Down to move through visible explorer items.
- Use Arrow Left to collapse the current folder, or collapse the immediate parent folder of a nested file.
- Use Arrow Right to expand the currently anchored folder.
- Preview files while moving and show a simple folder summary when the cursor lands on a folder.
- Press Enter to open the anchored file for editing.
- Arrow handling stays out of the way while you are typing in inputs, textareas, contenteditable fields, and modal dialogs.
- The navigation cursor resets when you click away from the explorer or when Obsidian loses visibility.

## How It Works

- The plugin owns one logical navigation anchor in the file explorer.
- A lightweight plugin cursor marks that anchor instead of mutating Obsidian's internal focused or selected explorer classes.
- File and folder previews reuse one retained workspace leaf.
- Folder previews show direct and total file and subfolder counts.

## Install Locally

1. Open the plugin folder in a terminal and install the dependencies:

```bash
cd tw-arrow-nav
npm install
```

2. Build the plugin:

```bash
npm run build
```

3. Copy the plugin folder into your Vault's community plugins folder, or create it if it does not exist:

- Windows: `%USERPROFILE%\\<Vault>\\.obsidian\\plugins\\tw-arrow-nav`

Copy the built files (`manifest.json`, `main.js`, and any assets) into that plugin folder.

4. In Obsidian, open Settings → Community plugins, refresh the list, then turn on "TW Arrow Nav".

## Naming

The npm package, plugin id, and public plugin name all use the same identity: `tw-arrow-nav` / `TW Arrow Nav`.

Notes:
- The preview surface is reused for both file previews and folder summaries.
- Enter opens the currently anchored file and clears the plugin cursor.

## Release Checklist

- Build the plugin before publishing with `npm run build`.
- Include `manifest.json` and `main.js` in the release.
- Keep `manifest.json`, `package.json`, `package-lock.json`, and `versions.json` on the same plugin version.
- Test it after minimizing and restoring Obsidian.

## License

This plugin is released under the MIT License. See [LICENSE](LICENSE).
