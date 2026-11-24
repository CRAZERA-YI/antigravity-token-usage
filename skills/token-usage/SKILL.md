---
name: token-usage
description: Inspect Antigravity token usage across conversations, models, and dates, or open the interactive bilingual (EN/ZH) Token Usage dashboard in the side pane. Use whenever the user asks how many tokens they have used, wants a token usage breakdown, cache hit rate, or asks to open the token usage panel (in English or Chinese).
---

# Token Usage

Use the `token-usage` MCP tools provided by this plugin to inspect token consumption from local Antigravity transcripts (`~/.gemini/antigravity/brain/*/transcript.jsonl`, plus CLI and IDE transcript roots when present).

## Available Tools

- `open_token_usage`: Opens the interactive bilingual (English / Simplified Chinese) Token Usage dashboard (in the side pane, sidebar, or inline) with KPI cards, daily stacked trend chart, per-model breakdown, and expandable per-conversation turn inspection. Pass `lang: "zh"` when the user writes in Chinese and `lang: "en"` when in English.
- `get_token_usage`: Queries aggregated token usage data (`range`: `today` | `7d` | `30d` | `all`, plus optional `model`, `query`, `sortBy`, `limit`, `lang`).
- `get_conversation_detail`: Returns step-by-step token breakdown for a specific conversation ID.

## Token Definitions

- **Fresh Input (`input_tokens`)**: Newly processed (uncached) prompt tokens.
- **Cache Read (`cache_read_tokens`)**: Prompt tokens served from context cache.
- **Total Input**: `input_tokens + cache_read_tokens`.
- **Output (`output_tokens`)**: Generated tokens (thinking + response).
- **Total Tokens**: `input_tokens + cache_read_tokens + output_tokens`.
- **Cache Hit Rate**: `cache_read_tokens / (input_tokens + cache_read_tokens)`.

## Guidelines

- Match the user's language (English or Chinese) in both tool `lang` argument and your reply.
- When the user asks to open or view token usage visually, call `open_token_usage` and summarize the key totals concisely.
- Format large numbers clearly (e.g., `1.24M` / `1,240,512`) and distinguish fresh input, cache read (with hit rate), and output tokens.
