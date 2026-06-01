# TW Arrow Nav

Navigate the file explorer with the arrow keys and preview files without opening them.


## Support

If this plugin helps you, you can support development here: [Buy me a coffee](https://buymeacoffee.com/bytess)

## Features

- Move through files and folders with the arrow keys.
- Preview a file as you move without opening it.
- Press Enter to open the file you selected.
- Stay in control even after switching away from Obsidian and back again.

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
- Arrow keys move the selection, and Enter opens the file.
- The plugin stays out of the way while you are typing in a note, input, or editor.

## Release Checklist

- Build the plugin before publishing with `npm run build`.
- Include `manifest.json` and `main.js` in the release.
- Test it after minimizing and restoring Obsidian.

## License

This plugin is released under the MIT License. See [LICENSE](LICENSE).
