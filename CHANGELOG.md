# Changelog

## 1.0.5

- Categories are now yours to edit: rename, recolor, add or delete them by clicking a legend entry. Colors flow through event cards, the timetable and both charts.
- Moods are editable too: rename, recolor, add or delete, with a soft palette picker; the mood grid and the 7-day trend use the same colors.
- Habits get their own color palette in settings, and the timetable uses category colors instead of a fixed list.
- Repeat dates: a multi-select date picker for new and existing events, kept in sync across a group.
- Year view: evenly spaced heat scale, larger weekday labels, navigation in the top bar plus a "This year" button and image export.
- Export the current view as an image (copied to the clipboard) from the toolbar.
- Charts: a daily completed bar chart next to the pie, refreshed after every edit; the pie also follows custom category colors.
- Timetable cards show the course name inline, and urgent DDLs are highlighted.
- DDL countdown: configurable urgent threshold (Settings → Calendar), no end-cap dashes, new items appear right after saving.
- Settings are grouped into four tabs with clearer hierarchy, a narrower dialog and three evenly sized action buttons.
- Project tracking refreshes when you switch views or save an entry.
- The bundled page is rebuilt from the merged full version.
## 1.0.4

- Week view is now a time grid: an hour scale on the left, events placed at their start time, short events kept at a readable minimum height and pushed down so they never overlap, plus a "now" line in today's column that follows the clock.
- Week view fits the window height: the hour height is computed on load and on resize (14–56 px) instead of always scrolling.
- New **Show time axis in week view** switch (Settings → Display). Turning it off returns the week grid to a plain seven-column list; the automatic time-range option is disabled while the axis is off.
- Clicking an empty half-hour slot opens the add dialog with that hour pre-filled (start `HH:00`, end `HH+1:00`), and the end date defaults to the same day.
- Multi-day events in the all-day row no longer overlap their checkbox; each chip shows a `跨天` / `续` marker, with a solid left border on the first day and a dashed one on the following days.
- The page title moved into the top bar; the header row is shorter and the view controls stay on one line.
- Connection dot: green when a vault is connected, neutral grey otherwise, no halo.
- Sync status now reflects what is actually in the vault: the month files are read back and compared before saying whether Obsidian is in sync, instead of assuming it is not.
- Startup shows a single "connected" message instead of two.

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
