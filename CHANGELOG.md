# Changelog

## 1.0.3

- New **Data storage** setting (Settings → Data): keep everything in the browser, or connect an Obsidian vault folder so the calendar writes its Markdown notes into that vault. The same choice works in the bundled web build, not only inside Obsidian.
- Connecting a vault folder runs a write test first and remembers the folder, so the next launch reconnects without picking it again when the browser keeps the permission.
- Status in the top bar now follows the chosen storage: `Obsidian · <vault>` when connected, `Data kept in this browser` otherwise.
- Fixed: the general settings tab (nickname, page title, DDL message) is shown again after the settings panes were reorganised.
- Fixed: clicking the folder button inside Obsidian explains that the plugin writes to the vault directly instead of raising a directory-picker error.

## 1.0.2

- Bundle rebuilt from the current page; no behaviour change for existing users.

## 1.0.1

- README rewritten with installation and usage instructions in English.
- Release assets now carry GitHub build provenance attestations.

## 1.0.0

- First release: week, month and year views, timetable, DDL countdown, habit tracking, daily mood and daily review, stored as Markdown in the vault.
