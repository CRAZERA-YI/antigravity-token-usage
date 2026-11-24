# Antigravity Token Usage Plugin

**English** | [简体中文](./README.zh-CN.md)

A lightweight, 100% local **Google Antigravity** plugin (MCP App + Skill) for viewing and analyzing token consumption across your conversations, models, and dates — with an interactive bilingual (**English / 简体中文**) dashboard.

- **Zero `npm install` needed** — ships with a pre-bundled single-file MCP server (`server/bundle.mjs`). Only Node.js >= 18 is required.
- **Interactive Dashboard** — opens from Antigravity's **left sidebar**, **side pane (`+` menu)**, or inline in chat.
- **Full Token Breakdown** — separates **Fresh Input** (`input_tokens`), **Cache Read** (`cache_read_tokens`), **Cache Hit Rate**, **Output** (`output_tokens`), and **Peak Context Window**.
- **Bilingual UI (`EN / 中文`)** — auto-detects Antigravity's locale and includes a one-click language switch in the header.
- **Light & Dark Theme Native** — adapts automatically to Antigravity's theme tokens.
- **100% Private & Local** — reads only your local transcript files (`~/.gemini/antigravity*/brain/*/transcript.jsonl`); no data ever leaves your machine.

---

## Requirements

- [Google Antigravity](https://antigravity.google/) (App, CLI, or IDE)
- [Node.js](https://nodejs.org/) >= 18

---

## Installation

Choose whichever method is easiest for you — no `npm install` or build step is required.

### Option 1: Antigravity CLI (Recommended if `agy` is installed)

```bash
agy plugin install https://github.com/<your-username>/antigravity-token-usage
```

### Option 2: Direct `git clone` into Antigravity's Global Plugins Folder

**Windows (PowerShell):**

```powershell
git clone https://github.com/<your-username>/antigravity-token-usage.git "$env:USERPROFILE\.gemini\config\plugins\token-usage"
```

**macOS / Linux:**

```bash
git clone https://github.com/<your-username>/antigravity-token-usage.git ~/.gemini/config/plugins/token-usage
```

### Option 3: Clone & Run the Install Script

```bash
git clone https://github.com/<your-username>/antigravity-token-usage.git
cd antigravity-token-usage
```

- **Windows (PowerShell):** `.\install.ps1`
- **macOS / Linux:** `bash ./install.sh`

Antigravity discovers new plugins automatically — no restart required (if a conversation is already open, the new skill & tools become available on your next turn).

---

## Usage

1. **Sidebar / Side Pane**: Click **Token Usage** in Antigravity's left sidebar or open it from the side pane's **`+`** menu.
2. **In Chat**: Ask Antigravity directly, for example:
   - `"Open the Token Usage dashboard"`
   - `"How many tokens have I used today and in the last 7 days?"`
   - `"打开 Token 用量面板"` / `"统计我今天消耗了多少 token"`
3. **Inspect Any Conversation**: Click any conversation row in the dashboard to expand a step-by-step table of every LLM turn (`input_tokens`, `cache_read_tokens`, context size, and `output_tokens`).
4. **Switch Language**: Click the **`中文` / `EN`** button in the top-right corner of the dashboard at any time.

---

## Token Metrics Explained

Antigravity records exact token counts on each model turn in local transcripts:

| Metric | Source Field | Description |
| :--- | :--- | :--- |
| **Fresh Input** | `input_tokens` | Newly processed (uncached) prompt tokens |
| **Cache Read** | `cache_read_tokens` | Prompt tokens served from context cache |
| **Total Input** | `input_tokens + cache_read_tokens` | Total prompt context sent to the model |
| **Cache Hit Rate** | `cache_read_tokens / Total Input` | Share of input tokens served from cache |
| **Output** | `output_tokens` | Generated model tokens (thinking + response) |
| **Total Tokens** | `Total Input + output_tokens` | Overall token volume |
| **Peak Context** | `max(Total Input)` | Largest single-turn context window reached |

---

## MCP Tools Exposed

- `open_token_usage` — Opens the interactive Token Usage dashboard (`aux_pane` & `global` entrypoints) and returns a summary.
- `get_token_usage` — Queries aggregated stats filtered by `range` (`today` | `7d` | `30d` | `all`), `model`, `query`, `sortBy`, `limit`, and `lang`.
- `get_conversation_detail` — Returns turn-by-turn token breakdown for a specific `conversationId`.

---

## Uninstall

Disable or uninstall **Token Usage** from Antigravity's **Skills & Customizations** settings page, or remove `~/.gemini/config/plugins/token-usage`.

---

## Development

If you want to modify the MCP server source under `src/` and rebuild `server/bundle.mjs`:

```bash
npm install
npm run build
```

UI edits in `ui/dashboard.html` are read fresh on every view open — no rebuild needed.

## License

[MIT](./LICENSE)
