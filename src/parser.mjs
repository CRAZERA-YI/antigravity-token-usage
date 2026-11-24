import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const fileCache = new Map();

function getBrainRoots() {
  if (process.env.ANTIGRAVITY_BRAIN_DIRS) {
    return process.env.ANTIGRAVITY_BRAIN_DIRS.split(path.delimiter)
      .map((dir) => dir.trim())
      .filter(Boolean)
      .map((dir) => ({ surface: path.basename(path.dirname(dir)) || 'antigravity', dir }));
  }
  const geminiRoot = path.join(os.homedir(), '.gemini');
  return [
    { surface: 'antigravity', dir: path.join(geminiRoot, 'antigravity', 'brain') },
    { surface: 'antigravity-cli', dir: path.join(geminiRoot, 'antigravity-cli', 'brain') },
    { surface: 'antigravity-ide', dir: path.join(geminiRoot, 'antigravity-ide', 'brain') },
  ];
}

function toLocalDateKey(isoOrMs) {
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function cleanTitle(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '')
    .replace(/<\/?USER_REQUEST>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function parseTranscriptFile(filePath, conversationId, surface) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }

  const cached = fileCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.data;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  let title = '';
  let startedAt = null;
  let updatedAt = null;
  const steps = [];
  const modelSet = new Set();

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line[0] !== '{') continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    const createdAt = typeof obj.created_at === 'string' ? obj.created_at : null;
    if (createdAt) {
      if (!startedAt || createdAt < startedAt) startedAt = createdAt;
      if (!updatedAt || createdAt > updatedAt) updatedAt = createdAt;
    }

    if (!title && obj.type === 'USER_INPUT' && typeof obj.content === 'string') {
      const candidate = cleanTitle(obj.content, '');
      if (candidate) title = candidate;
    }

    const hasTokens =
      typeof obj.input_tokens === 'number' ||
      typeof obj.cache_read_tokens === 'number' ||
      typeof obj.output_tokens === 'number';

    if (hasTokens) {
      const inputTokens = Number(obj.input_tokens) || 0;
      const cacheReadTokens = Number(obj.cache_read_tokens) || 0;
      const outputTokens = Number(obj.output_tokens) || 0;
      const totalInputTokens = inputTokens + cacheReadTokens;
      const totalTokens = totalInputTokens + outputTokens;
      const model = typeof obj.model === 'string' && obj.model ? obj.model : 'unknown';

      if (totalTokens > 0 || obj.type === 'PLANNER_RESPONSE') {
        modelSet.add(model);
        steps.push({
          stepIndex: typeof obj.step_index === 'number' ? obj.step_index : steps.length + 1,
          createdAt: createdAt || stat.mtime.toISOString(),
          model,
          inputTokens,
          cacheReadTokens,
          totalInputTokens,
          outputTokens,
          totalTokens,
        });
      }
    }
  }

  const fallbackTime = stat.mtime.toISOString();
  const data = {
    conversationId,
    surface,
    title: title || `Conversation ${conversationId.slice(0, 8)}`,
    startedAt: startedAt || fallbackTime,
    updatedAt: updatedAt || fallbackTime,
    models: Array.from(modelSet).sort(),
    steps,
  };

  fileCache.set(filePath, {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    data,
  });

  return data;
}

export function loadAllConversations() {
  const results = [];
  const seenIds = new Set();

  for (const { surface, dir } of getBrainRoots()) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const conversationId = entry.name;
      const key = `${surface}:${conversationId}`;
      if (seenIds.has(key)) continue;

      const logsDir = path.join(dir, conversationId, '.system_generated', 'logs');
      const compactPath = path.join(logsDir, 'transcript.jsonl');
      const fullPath = path.join(logsDir, 'transcript_full.jsonl');

      const targetPath = fs.existsSync(compactPath)
        ? compactPath
        : fs.existsSync(fullPath)
          ? fullPath
          : null;

      if (!targetPath) continue;

      const parsed = parseTranscriptFile(targetPath, conversationId, surface);
      if (parsed && parsed.steps.length > 0) {
        seenIds.add(key);
        results.push(parsed);
      }
    }
  }

  return results;
}

function getCutoffMs(range) {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (range === '7d') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  }
  if (range === '30d') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getTime();
  }
  return 0;
}

export function queryTokenUsage({
  range = 'all',
  model = 'all',
  query = '',
  sortBy = 'updatedAt',
  limit = 100,
  lang = 'auto',
} = {}) {
  const validRanges = new Set(['today', '7d', '30d', 'all']);
  const normalizedRange = validRanges.has(range) ? range : 'all';
  const normalizedModel = model && model !== 'all' ? String(model) : 'all';
  const normalizedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
  const normalizedLang = lang === 'zh' || lang === 'en' ? lang : 'auto';
  const cutoffMs = getCutoffMs(normalizedRange);

  const allConversations = loadAllConversations();
  const availableModelsSet = new Set();

  let totalInput = 0;
  let totalCacheRead = 0;
  let totalOutput = 0;
  let totalTurns = 0;
  let peakContextTokens = 0;

  const modelMap = new Map();
  const dailyMap = new Map();
  const conversations = [];

  for (const conv of allConversations) {
    for (const m of conv.models) availableModelsSet.add(m);

    if (normalizedQuery) {
      const hay = `${conv.title} ${conv.conversationId} ${conv.models.join(' ')}`.toLowerCase();
      if (!hay.includes(normalizedQuery)) continue;
    }

    let cInput = 0;
    let cCache = 0;
    let cOutput = 0;
    let cTurns = 0;
    let cPeak = 0;
    let cStarted = null;
    let cUpdated = null;
    const cModels = new Set();

    for (const step of conv.steps) {
      if (normalizedModel !== 'all' && step.model !== normalizedModel) continue;

      const stepMs = Date.parse(step.createdAt);
      if (cutoffMs > 0 && (!Number.isFinite(stepMs) || stepMs < cutoffMs)) continue;

      cInput += step.inputTokens;
      cCache += step.cacheReadTokens;
      cOutput += step.outputTokens;
      cTurns += 1;
      cModels.add(step.model);
      if (step.totalInputTokens > cPeak) cPeak = step.totalInputTokens;
      if (step.totalInputTokens > peakContextTokens) peakContextTokens = step.totalInputTokens;

      if (!cStarted || step.createdAt < cStarted) cStarted = step.createdAt;
      if (!cUpdated || step.createdAt > cUpdated) cUpdated = step.createdAt;

      let mAgg = modelMap.get(step.model);
      if (!mAgg) {
        mAgg = {
          model: step.model,
          turns: 0,
          conversationsSet: new Set(),
          inputTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
        };
        modelMap.set(step.model, mAgg);
      }
      mAgg.turns += 1;
      mAgg.conversationsSet.add(conv.conversationId);
      mAgg.inputTokens += step.inputTokens;
      mAgg.cacheReadTokens += step.cacheReadTokens;
      mAgg.outputTokens += step.outputTokens;

      const dayKey = toLocalDateKey(step.createdAt);
      if (dayKey) {
        let dAgg = dailyMap.get(dayKey);
        if (!dAgg) {
          dAgg = {
            date: dayKey,
            turns: 0,
            inputTokens: 0,
            cacheReadTokens: 0,
            outputTokens: 0,
          };
          dailyMap.set(dayKey, dAgg);
        }
        dAgg.turns += 1;
        dAgg.inputTokens += step.inputTokens;
        dAgg.cacheReadTokens += step.cacheReadTokens;
        dAgg.outputTokens += step.outputTokens;
      }
    }

    if (cTurns === 0) continue;

    const cTotalInput = cInput + cCache;
    const cTotal = cTotalInput + cOutput;

    totalInput += cInput;
    totalCacheRead += cCache;
    totalOutput += cOutput;
    totalTurns += cTurns;

    conversations.push({
      conversationId: conv.conversationId,
      surface: conv.surface,
      title: conv.title,
      startedAt: cStarted || conv.startedAt,
      updatedAt: cUpdated || conv.updatedAt,
      models: Array.from(cModels).sort(),
      turns: cTurns,
      inputTokens: cInput,
      cacheReadTokens: cCache,
      totalInputTokens: cTotalInput,
      outputTokens: cOutput,
      totalTokens: cTotal,
      peakContextTokens: cPeak,
      cacheHitRate: cTotalInput > 0 ? cCache / cTotalInput : 0,
    });
  }

  if (sortBy === 'totalTokens') {
    conversations.sort((a, b) => b.totalTokens - a.totalTokens);
  } else if (sortBy === 'outputTokens') {
    conversations.sort((a, b) => b.outputTokens - a.outputTokens);
  } else if (sortBy === 'turns') {
    conversations.sort((a, b) => b.turns - a.turns);
  } else {
    conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const byModel = Array.from(modelMap.values())
    .map((m) => {
      const totalInputTokens = m.inputTokens + m.cacheReadTokens;
      const totalTokens = totalInputTokens + m.outputTokens;
      return {
        model: m.model,
        turns: m.turns,
        conversations: m.conversationsSet.size,
        inputTokens: m.inputTokens,
        cacheReadTokens: m.cacheReadTokens,
        totalInputTokens,
        outputTokens: m.outputTokens,
        totalTokens,
        cacheHitRate: totalInputTokens > 0 ? m.cacheReadTokens / totalInputTokens : 0,
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const daily = Array.from(dailyMap.values())
    .map((d) => ({
      ...d,
      totalInputTokens: d.inputTokens + d.cacheReadTokens,
      totalTokens: d.inputTokens + d.cacheReadTokens + d.outputTokens,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalInputTokens = totalInput + totalCacheRead;
  const totalTokens = totalInputTokens + totalOutput;
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 100, 300));

  return {
    filters: {
      range: normalizedRange,
      model: normalizedModel,
      query: normalizedQuery,
      sortBy,
      lang: normalizedLang,
    },
    generatedAt: new Date().toISOString(),
    availableModels: Array.from(availableModelsSet).sort(),
    summary: {
      totalTokens,
      inputTokens: totalInput,
      cacheReadTokens: totalCacheRead,
      totalInputTokens,
      outputTokens: totalOutput,
      cacheHitRate: totalInputTokens > 0 ? totalCacheRead / totalInputTokens : 0,
      conversationsCount: conversations.length,
      turnsCount: totalTurns,
      peakContextTokens,
      avgTokensPerTurn: totalTurns > 0 ? Math.round(totalTokens / totalTurns) : 0,
    },
    byModel,
    daily,
    conversations: conversations.slice(0, cappedLimit),
    totalConversationsMatched: conversations.length,
  };
}

export function getConversationDetail(conversationId) {
  if (!conversationId || typeof conversationId !== 'string') return null;
  const all = loadAllConversations();
  const conv = all.find(
    (c) => c.conversationId === conversationId || c.conversationId.startsWith(conversationId),
  );
  if (!conv) return null;

  let inputTokens = 0;
  let cacheReadTokens = 0;
  let outputTokens = 0;
  let peakContextTokens = 0;

  for (const s of conv.steps) {
    inputTokens += s.inputTokens;
    cacheReadTokens += s.cacheReadTokens;
    outputTokens += s.outputTokens;
    if (s.totalInputTokens > peakContextTokens) peakContextTokens = s.totalInputTokens;
  }

  const totalInputTokens = inputTokens + cacheReadTokens;
  const totalTokens = totalInputTokens + outputTokens;

  return {
    conversationId: conv.conversationId,
    surface: conv.surface,
    title: conv.title,
    startedAt: conv.startedAt,
    updatedAt: conv.updatedAt,
    models: conv.models,
    turns: conv.steps.length,
    inputTokens,
    cacheReadTokens,
    totalInputTokens,
    outputTokens,
    totalTokens,
    peakContextTokens,
    cacheHitRate: totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0,
    steps: conv.steps,
  };
}
