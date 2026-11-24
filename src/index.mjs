import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { queryTokenUsage, getConversationDetail } from './parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_HTML_PATH = path.resolve(__dirname, '..', 'ui', 'dashboard.html');
const APP_URI = 'ui://token-usage/dashboard.html';

function formatNum(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function formatPercent(r) {
  return `${((Number(r) || 0) * 100).toFixed(1)}%`;
}

function buildTextSummary(data) {
  const s = data.summary;
  const isZh = data.filters.lang === 'zh';

  if (isZh) {
    const rangeLabels = { today: '今天', '7d': '近 7 天', '30d': '近 30 天', all: '全部时间' };
    const lines = [
      `Antigravity Token 用量统计（${rangeLabels[data.filters.range] || data.filters.range}${data.filters.model !== 'all' ? `，模型=${data.filters.model}` : ''}）：`,
      `- 总 Token：${s.totalTokens.toLocaleString()}（${formatNum(s.totalTokens)}）`,
      `- 新输入 Token：${s.inputTokens.toLocaleString()}（${formatNum(s.inputTokens)}）`,
      `- 缓存读取 Token：${s.cacheReadTokens.toLocaleString()}（${formatNum(s.cacheReadTokens)}，命中率 ${formatPercent(s.cacheHitRate)}）`,
      `- 输出 Token：${s.outputTokens.toLocaleString()}（${formatNum(s.outputTokens)}）`,
      `- 对话数：${s.conversationsCount} | 调用轮次：${s.turnsCount} | 峰值上下文：${s.peakContextTokens.toLocaleString()}`,
    ];
    if (data.byModel.length > 0) {
      lines.push('', '按模型分布：');
      for (const m of data.byModel.slice(0, 10)) {
        lines.push(
          `  - ${m.model}：总计 ${formatNum(m.totalTokens)}（新输入 ${formatNum(m.inputTokens)}，缓存 ${formatNum(m.cacheReadTokens)} [${formatPercent(m.cacheHitRate)}]，输出 ${formatNum(m.outputTokens)}，${m.turns} 轮）`,
        );
      }
    }
    return lines.join('\n');
  }

  const rangeLabels = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All time' };
  const lines = [
    `Antigravity Token Usage (${rangeLabels[data.filters.range] || data.filters.range}${data.filters.model !== 'all' ? `, model=${data.filters.model}` : ''}):`,
    `- Total Tokens: ${s.totalTokens.toLocaleString()} (${formatNum(s.totalTokens)})`,
    `- Fresh Input: ${s.inputTokens.toLocaleString()} (${formatNum(s.inputTokens)})`,
    `- Cache Read: ${s.cacheReadTokens.toLocaleString()} (${formatNum(s.cacheReadTokens)}, hit rate ${formatPercent(s.cacheHitRate)})`,
    `- Output: ${s.outputTokens.toLocaleString()} (${formatNum(s.outputTokens)})`,
    `- Conversations: ${s.conversationsCount} | LLM Turns: ${s.turnsCount} | Peak Context: ${s.peakContextTokens.toLocaleString()}`,
  ];

  if (data.byModel.length > 0) {
    lines.push('', 'By Model:');
    for (const m of data.byModel.slice(0, 10)) {
      lines.push(
        `  - ${m.model}: total ${formatNum(m.totalTokens)} (fresh ${formatNum(m.inputTokens)}, cache ${formatNum(m.cacheReadTokens)} [${formatPercent(m.cacheHitRate)}], out ${formatNum(m.outputTokens)}, ${m.turns} turns)`,
      );
    }
  }

  return lines.join('\n');
}

const server = new McpServer(
  {
    name: 'token-usage',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

server.registerResource(
  'token-usage-dashboard',
  APP_URI,
  {
    title: 'Token Usage Dashboard',
    description: 'Interactive bilingual (EN/ZH) Antigravity token usage dashboard UI',
    mimeType: 'text/html;profile=mcp-app',
    _meta: {
      ui: {
        prefersBorder: false,
      },
    },
  },
  async () => {
    const html = fs.readFileSync(DASHBOARD_HTML_PATH, 'utf8');
    return {
      contents: [
        {
          uri: APP_URI,
          mimeType: 'text/html;profile=mcp-app',
          text: html,
          _meta: {
            ui: {
              prefersBorder: false,
            },
          },
        },
      ],
    };
  },
);

const queryInputShape = {
  range: z
    .enum(['today', '7d', '30d', 'all'])
    .optional()
    .describe('Time range filter: today, 7d, 30d, or all (default: all)'),
  model: z
    .string()
    .optional()
    .describe('Optional model ID filter, or "all" (default: all)'),
  query: z
    .string()
    .optional()
    .describe('Optional search substring for conversation title or ID'),
  sortBy: z
    .enum(['updatedAt', 'totalTokens', 'outputTokens', 'turns'])
    .optional()
    .describe('Sort order for conversations list (default: updatedAt)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(300)
    .optional()
    .describe('Max number of conversations to return (default: 100)'),
  lang: z
    .enum(['auto', 'en', 'zh'])
    .optional()
    .describe('Preferred language for text summary and dashboard: auto, en, or zh'),
};

server.registerTool(
  'open_token_usage',
  {
    title: 'Token Usage',
    description:
      'Open the interactive bilingual (EN/ZH) Antigravity Token Usage dashboard showing total, fresh input, cache read, and output tokens across conversations, models, and days.',
    inputSchema: queryInputShape,
    _meta: {
      ui: {
        resourceUri: APP_URI,
        visibility: ['model', 'app'],
      },
      'com.google.antigravity/ui': {
        entrypoints: [
          { type: 'aux_pane', title: 'Token Usage' },
          { type: 'global', title: 'Token Usage' },
        ],
      },
    },
  },
  async (args = {}) => {
    const data = queryTokenUsage(args || {});
    return {
      content: [{ type: 'text', text: buildTextSummary(data) }],
      structuredContent: data,
    };
  },
);

server.registerTool(
  'get_token_usage',
  {
    title: 'Get Token Usage Stats',
    description:
      'Query aggregated Antigravity token usage statistics from local transcripts across conversations, models, and dates.',
    inputSchema: queryInputShape,
    _meta: {
      ui: {
        visibility: ['model', 'app'],
      },
    },
  },
  async (args = {}) => {
    const data = queryTokenUsage(args || {});
    return {
      content: [{ type: 'text', text: buildTextSummary(data) }],
      structuredContent: data,
    };
  },
);

server.registerTool(
  'get_conversation_detail',
  {
    title: 'Get Conversation Token Detail',
    description:
      'Return step-by-step token usage breakdown (fresh input, cache read, output, context size) for a specific conversation ID.',
    inputSchema: {
      conversationId: z
        .string()
        .min(1)
        .describe('Conversation ID (full UUID or unique prefix)'),
    },
    _meta: {
      ui: {
        visibility: ['model', 'app'],
      },
    },
  },
  async ({ conversationId }) => {
    const detail = getConversationDetail(conversationId);
    if (!detail) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Conversation not found: ${conversationId}` }],
      };
    }
    const text = [
      `Conversation: ${detail.title} (${detail.conversationId})`,
      `Turns: ${detail.turns} | Total: ${detail.totalTokens.toLocaleString()} | Fresh Input: ${detail.inputTokens.toLocaleString()} | Cache Read: ${detail.cacheReadTokens.toLocaleString()} (${formatPercent(detail.cacheHitRate)}) | Output: ${detail.outputTokens.toLocaleString()} | Peak Context: ${detail.peakContextTokens.toLocaleString()}`,
    ].join('\n');
    return {
      content: [{ type: 'text', text }],
      structuredContent: detail,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[token-usage] Fatal error:', err);
  process.exit(1);
});
