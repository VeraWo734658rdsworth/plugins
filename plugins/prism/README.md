# Prism Plugin

Work with OpenAI Prism projects from Codex through the connected Prism app:
find projects, inspect files, read or update text files, upload external binary
files, and download binary project files.

Learn more about Prism at <https://openai.com/prism>.

## Bundled skill

The bundled `$prism` skill teaches Codex how to use the connected Prism app
safely:

- inspect project metadata before reading full file contents,
- prefer the narrowest remote project/file operation that satisfies the task,
- and use live Prism/browser workflows only when the user actually asks for live UI or compile interaction.

## Connected app

This plugin is app-backed through `.app.json`, which points Codex at the
connected Prism app for authenticated remote Prism work, including project
lookup and project-file operations.

## Local folder sync

The app-backed plugin does not currently provide whole-folder local sync parity:
there is no packaged pull/push helper or `.prism-sync.json` workflow in this
surface.
