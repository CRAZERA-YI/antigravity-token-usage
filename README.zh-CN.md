# Antigravity Token 用量统计插件 (Token Usage)

[English](./README.md) | **简体中文**

一个轻量、100% 本地运行的 **Google Antigravity** 插件（MCP App + Skill），用于可视化统计和分析你在各个对话、模型与日期上的 Token 消耗，原生支持 **简体中文 / English 双语切换**。

- **免 `npm install`，开箱即用**：仓库已预打包单文件 MCP 服务（`server/bundle.mjs`），仅需本机安装 Node.js >= 18。
- **交互式可视化面板**：可直接从 Antigravity **左侧边栏**、**右侧辅助面板 `+` 菜单** 或聊天对话中打开。
- **完整 Token 拆解**：精确区分 **新输入 Token**（`input_tokens`）、**缓存读取 Token**（`cache_read_tokens`）、**缓存命中率**、**输出 Token**（`output_tokens`）以及 **峰值上下文窗口**。
- **中英双语自适应**：自动识别 Antigravity 语言环境，也可在面板右上角点击 **`中文` / `EN`** 一键切换。
- **原生深浅色主题**：自动跟随 Antigravity 主题色变量切换浅色 / 深色模式。
- **纯本地隐私安全**：仅读取本机对话日志（`~/.gemini/antigravity*/brain/*/transcript.jsonl`），不向任何外部服务器上传数据。

---

## 环境要求

- [Google Antigravity](https://antigravity.google/)（App / CLI / IDE 均可）
- [Node.js](https://nodejs.org/) >= 18

---

## 安装方式

以下任选一种即可，无需执行 `npm install` 或手动编译：

### 方式一：通过 Antigravity CLI 一键安装（推荐，已安装 `agy` 时）

```bash
agy plugin install https://github.com/<your-username>/antigravity-token-usage
```

### 方式二：直接 `git clone` 到 Antigravity 全局插件目录

**Windows（PowerShell）：**

```powershell
git clone https://github.com/<your-username>/antigravity-token-usage.git "$env:USERPROFILE\.gemini\config\plugins\token-usage"
```

**macOS / Linux：**

```bash
git clone https://github.com/<your-username>/antigravity-token-usage.git ~/.gemini/config/plugins/token-usage
```

### 方式三：克隆后运行安装脚本

```bash
git clone https://github.com/<your-username>/antigravity-token-usage.git
cd antigravity-token-usage
```

- **Windows（PowerShell）：** `.\install.ps1`
- **macOS / Linux：** `bash ./install.sh`

Antigravity 会自动发现并加载插件，无需重启应用（对话内的新 Skill 和 MCP 工具会在下一轮对话起自动生效）。

---

## 使用方法

1. **界面打开**：在 Antigravity **左侧边栏** 或 **右侧辅助面板 `+` 菜单** 中点击 **Token Usage**。
2. **对话调用**：在任意对话中直接提问，例如：
   - “打开 Token 用量面板”
   - “查看我今天和最近 7 天一共消耗了多少 token”
   - “按模型统计我所有对话的 token 消耗和缓存命中率”
3. **单轮明细钻取**：点击对话列表中的任意一条记录，即可展开查看该对话每一次模型调用（`Step`）的新输入、缓存读取、上下文总量与输出 Token。
4. **切换语言**：点击面板右上角的 **`EN` / `中文`** 按钮可随时切换界面语言。

---

## 统计口径说明

插件直接读取 Antigravity 本地 transcript 日志中每轮模型调用的原始字段：

| 指标 | 原始字段 | 说明 |
| :--- | :--- | :--- |
| **新输入 Token** | `input_tokens` | 本轮新处理的非缓存输入 Token |
| **缓存读取 Token** | `cache_read_tokens` | 命中上下文缓存、直接复用的输入 Token |
| **总输入 Token** | `input_tokens + cache_read_tokens` | 本轮模型实际看到的完整上下文大小 |
| **缓存命中率** | `cache_read_tokens / 总输入 Token` | 缓存读取占总输入的比例 |
| **输出 Token** | `output_tokens` | 模型生成的 Token（含思考过程与最终回复） |
| **总 Token** | `总输入 Token + output_tokens` | 综合 Token 总量 |
| **峰值上下文** | `max(总输入 Token)` | 单轮调用达到的最大上下文窗口大小 |

---

## 内置 MCP 工具

- `open_token_usage`：打开交互式 Token 用量面板（支持 `aux_pane` 侧边栏与 `global` 全页入口）并返回文字摘要。
- `get_token_usage`：按时间范围（`today` / `7d` / `30d` / `all`）、模型、关键词、排序方式和语言查询汇总数据。
- `get_conversation_detail`：查询指定 `conversationId` 的逐轮 Token 消耗明细。

---

## 卸载方式

在 Antigravity 的 **Skills & Customizations** 设置页中关闭或卸载 **Token Usage**，或直接删除 `~/.gemini/config/plugins/token-usage` 目录即可。

---

## 二次开发与重新打包

如需修改 `src/` 目录下的 MCP 服务端源码并重新生成 `server/bundle.mjs`：

```bash
npm install
npm run build
```

修改 `ui/dashboard.html` 无需重新打包，重新打开面板即可立即看到效果。

## 开源协议

[MIT](./LICENSE)
