# Plugins

This repository contains a curated collection of Codex plugin examples.

Each plugin lives under `plugins/<name>/` with a required
`.codex-plugin/plugin.json` manifest and optional companion surfaces such as
`skills/`, `.app.json`, `.mcp.json`, plugin-level `agents/`, `commands/`,
`hooks.json`, `assets/`, and other supporting files.

Highlighted richer examples in this repo include:

- `plugins/figma` for `use_figma`, Code to Canvas, Code Connect, and design system rules
- `plugins/notion` for planning, research, meetings, and knowledge capture
- `plugins/build-ios-apps` for SwiftUI implementation, refactors, performance, and debugging
- `plugins/build-macos-apps` for macOS SwiftUI/AppKit workflows, build/run/debug loops, and packaging guidance
- `plugins/build-web-apps` for deployment, UI, payments, and database workflows
- `plugins/expo` for Expo and React Native apps, SDK upgrades, EAS workflows, and Codex Run actions
- `plugins/netlify`, `plugins/remotion`, and `plugins/google-slides` for additional public skill- and MCP-backed plugin bundles

---

> **Personal fork notes:** I'm primarily studying the `plugins/build-web-apps` and `plugins/expo` examples.
> Upstream repo: [openai/plugins](https://github.com/openai/plugins)
>
> **Study log:**
> - `plugins/build-web-apps` — paying close attention to the payments and database workflow skills; want to adapt these for a side project using Stripe + Supabase.
> - `plugins/expo` — exploring EAS workflow hooks to understand how Codex Run actions are structured before writing my own.
>
> **Next steps:**
> - Draft a minimal `plugin.json` manifest for my Stripe + Supabase side project, modeled after `plugins/build-web-apps`.
> - Cross-reference the EAS hook examples in `plugins/expo/hooks.json` with the Codex Run docs to map out the action lifecycle.
> - Look into how `plugins/netlify` structures its MCP config — may be useful for hosting the Stripe + Supabase plugin once it's working.
> - ✅ Confirmed: Supabase does have an official MCP server (`@supabase/mcp-server-supabase`). Use that instead of rolling a custom one.
>
> **Notes to self:**
> - The `skills/` directory in `plugins/build-web-apps` has separate files per workflow; keep my own skills granular the same way.
> - Remember to check if Supabase has an official MCP server before rolling a custom one.
