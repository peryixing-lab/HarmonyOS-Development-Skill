# HarmonyOS Development Skill

> 别再让你的 Coding Agent 把 TypeScript 语法往 ArkTS 里硬塞了——给它装上全套鸿蒙 NEXT 手册、28 篇离线文档、DevEco 工作流与崩溃分诊工具。

写鸿蒙 NEXT 应用时，普通 AI 编程助手经常会在几个经典坑里反复横跳：

- 把 `any`、对象字面量当类型、动态扩展属性往 `.ets` 里写，一进 DevEco 编译直接满屏红；
- 新旧 API 傻傻分不清，动不动掏出早已过时的 FA 模型或 `@ohos.router`，或者漏查 `@since`、`@syscap` 与权限声明；
- 拿到设计稿只靠「目测还原」，不提取节点证据，也不管多设备断点；
- 一旦遇上编译报错、签名失败、或者 `AppFreeze` / `CppCrash` / `JSCrash` FaultLog，只会反复试错猜原因。

**`harmonyos-development-skill`** 就是一份开箱即用的**鸿蒙 NEXT 全链路开发技能包**（[技能入口 `SKILL.md`](SKILL.md)）：让 Agent 写代码前先查官方离线知识与规则卡片，编译部署走 DevEco CLI / Hvigor / HDC 工具链，遇到真机闪退直接跑脚本抓栈分诊。

---

## 这套技能包能搞定什么？

- **离线查 API，不凭记忆瞎编**：内置 28 篇 OpenHarmony 中文文档节选与索引，通过 [`scripts/knowledge.mjs`](scripts/knowledge.mjs) 本地搜索 Navigation、Window、Ability、状态管理、权限、文件、网络、日志等接口原文与 `sourceUrl`。
- **守住 ArkTS / ArkUI 工程规范**：按任务加载 [开发手册](references/harmonyos-development-handbook/harmonyos-development/GUIDE.md) 与 [ArkTS/ArkUI 编码指南](references/arkts-arkui-coding/GUIDE.md) 的 API 与规则卡片，严守 Stage 模型、V1/V2 状态管理与 ArkTS 静态检查要求。
- **设计稿转 ArkUI**：覆盖 Pixso、Figma、MasterGo 工作流，完成来源预检、设计证据采集、布局还原与构建验证。
- **构建、部署与自动化体验**：串联 `devecocli`（检查、构建、签名、部署、截图、日志、热重载）与 `hvigorw` / `ohpm` / `hdc` 兜底方案（见 [工具链说明](references/toolchains.md)），并支持 AppAnalyzer 应用体检与临时 DeepLink UI 验证。
- **崩溃日志分诊与调试**：提供 Python 与 Node.js 解析脚本，覆盖 `AppFreeze`、`CppCrash`、`JSCrash` FaultLog 分诊，以及 ArkTS 运行异常与 HiLog 证据采集。

---

## 目录结构

```text
harmonyos-development-skill/
├── SKILL.md                           # 唯一的 Agent 技能入口
├── references/
│   ├── app-quality-verification/       # AppAnalyzer 应用体检
│   ├── arkts-arkui-coding/             # ArkTS 和 ArkUI 编码
│   ├── arkts-crash-debugging/          # ArkTS 运行异常调试
│   ├── deeplink-ui-verification/       # DeepLink UI 验证
│   ├── design-to-arkui/               # 设计稿转 ArkUI
│   ├── deveco-cli-workflows/          # DevEco CLI 工作流
│   ├── fault-log-analysis/            # 故障日志分诊和分析
│   ├── harmonyos-development-handbook/ # 鸿蒙开发手册与示例
│   └── openharmony-knowledge/         # 离线文档、索引和溯源
└── scripts/knowledge.mjs             # 离线文档查询
```

完整专题与来源索引见 [来源与目录](references/sources.md)。

---

## 安装到编程 Agent

> 仓库地址：`peryixing-lab/HarmonyOS-Development-Skill`
> 安装后技能名称：`harmonyos-development-skill`

### 1. 一行命令极速安装（推荐，无需提前下载）

只要本机装有 **Node.js 22.20+**，一行 `npx skills add` 即可自动识别已安装的 Coding Agent 并完成安装（`references/` 与 `scripts/` 会随包完整挂载）：

```bash
# 全局安装（推荐：所有鸿蒙工程通用）
npx skills add peryixing-lab/HarmonyOS-Development-Skill -g

# 仅安装到当前鸿蒙工程（适合随项目共享）
npx skills add peryixing-lab/HarmonyOS-Development-Skill
```

想先不落盘试用一次，或指定工具静默直装：

```bash
# 不落盘生成技能上下文 Prompt
npx skills use peryixing-lab/HarmonyOS-Development-Skill@harmonyos-development-skill

# 非交互直装到指定 Agent（例如 Claude Code）
npx skills add peryixing-lab/HarmonyOS-Development-Skill -g -a claude-code -y
```

### 2. 主流 Coding Agent 目录与唤醒方式

常见 Agent 对应的 `--agent` 参数、默认目录与调用方式如下（完整支持列表见 [Vercel Skills CLI 支持列表](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)）：

| 工具 | `--agent` 参数 | 工程目录 | 全局目录（`-g`） | 会话中怎么叫它 |
|---|---|---|---|---|
| **Claude Code** | `claude-code` | `.claude/skills/` | `~/.claude/skills/` | `/harmonyos-development-skill` 或直接提问 ([文档](https://code.claude.com/docs/en/skills)) |
| **Codex** | `codex` | `.agents/skills/` | `~/.agents/skills/` | `$harmonyos-development-skill` 点名 ([文档](https://developers.openai.com/codex/skills)) |
| **Cursor** | `cursor` | `.agents/skills/` / `.cursor/skills/` | `~/.cursor/skills/` | `/harmonyos-development-skill` 或对话触发 ([文档](https://cursor.com/docs/skills)) |
| **OpenCode** | `opencode` | `.agents/skills/` / `.opencode/skills/` | `~/.config/opencode/skills/` | 在任务中指定技能名称 ([文档](https://opencode.ai/docs/skills/)) |
| **Antigravity** | `antigravity` | `.agents/skills/` | `~/.gemini/config/skills/` | 直接描述鸿蒙任务或点名该技能 |
| **Gemini CLI** | `gemini-cli` | `.agents/skills/` / `.gemini/skills/` | `~/.gemini/skills/` | 自动匹配，可用 `/skills list` 核对 ([文档](https://geminicli.com/docs/cli/skills/)) |
| **GitHub Copilot** | `github-copilot` | `.agents/skills/` / `.github/skills/` | `~/.copilot/skills/` | 对话提及；云端 Agent 需将项目目录入库 ([文档](https://docs.github.com/en/copilot/concepts/customizations/agent-skills)) |
| **Windsurf / Cascade** | `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` | 在 Cascade 对话中指定 `harmonyos-development-skill` |
| **Cline / Roo Code / Amp** | `cline` / `roo` / `amp` | `.cline/skills/` / `.roo/skills/` / `.agents/skills/` | `~/.cline/skills/` / `~/.roo/skills/` / `~/.config/agents/skills/` | 对话中指定技能（Amp 可用 `amp skills list`） |
| **Trae / CodeBuddy / Qoder / Kiro CLI** | `trae` / `codebuddy` / `qoder` / `kiro-cli` | 见[支持列表](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) | 见[支持列表](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) | 新会话中按技能名或鸿蒙关键词触发 |

> 小提示：多个工具共用 `.agents/skills/` 或 `~/.agents/skills/` 时安装一次即可。若你用 `-g` 安装到 `~/.agents/skills/` 或 `~/.claude/skills/`，包括 **DevEco Code**、**DeepSeek Harness** 在内的工具都能直接扫描复用。

### 3. 特定工具与图形化安装

[DevEco Code](#deveco-code) · [DeepSeek Harness](#deepseek-harness) · [Gemini CLI](#gemini-cli) · [腾讯 WorkBuddy](#腾讯-workbuddy)

#### DevEco Code

- **方式 A（零重复配置）**：若已通过 `npx skills add ... -g` 安装到 `~/.agents/skills/` 或 `~/.claude/skills/`，DevEco Code 启动时会自动加载。
- **方式 B（全局专属目录）**：直接克隆到 `~/.config/deveco/skills/`（注意是 `~/.config/deveco/`，而非 `~/.deveco/`）：
  ```bash
  mkdir -p ~/.config/deveco/skills
  git clone --depth 1 https://github.com/peryixing-lab/HarmonyOS-Development-Skill.git \
    ~/.config/deveco/skills/harmonyos-development-skill
  ```
- **方式 C（仅当前鸿蒙工程）**：在工程根目录运行，导出为 `.deveco/skills/harmonyos-development-skill/`（剔除 `.git` 避免子仓库冲突）：
  ```bash
  skill_checkout="$(mktemp -d)"
  git clone --depth 1 https://github.com/peryixing-lab/HarmonyOS-Development-Skill.git "$skill_checkout"
  mkdir -p .deveco/skills
  git -C "$skill_checkout" archive --prefix=harmonyos-development-skill/ HEAD \
    | tar -x -C .deveco/skills
  rm -rf "$skill_checkout"
  ```

安装或更新后请**重启 DevEco Code**，在鸿蒙工程打开新会话即可使用（[DevEco Code 项目页](https://gitcode.com/openharmony-sig/deveco-code)）。

#### DeepSeek Harness

除了自动识别 `.agents/skills/` 与 `~/.agents/skills/`，也可克隆到 `$DSH_HOME/skills`（默认 `~/.dsh/skills/`）：

```bash
dsh_skill_root="${DSH_HOME:-$HOME/.dsh}/skills"
mkdir -p "$dsh_skill_root"
git clone --depth 1 https://github.com/peryixing-lab/HarmonyOS-Development-Skill.git \
  "$dsh_skill_root/harmonyos-development-skill"
```

#### Gemini CLI

除了 `npx skills add ... -a gemini-cli`，也可使用原生命令安装并用 `/skills list` 或 `gemini skills list` 核对：

```bash
gemini skills install https://github.com/peryixing-lab/HarmonyOS-Development-Skill.git
```

#### 腾讯 WorkBuddy

适合在桌面端直接上传导入（[WorkBuddy 技能文档](https://intl.cloud.tencent.com/zh/document/product/1316/84503)）：

1. 在 GitHub 仓库页面点击 **Code → Download ZIP**（或在本机用下方命令打包）：
   ```bash
   # Git 仓库内打包（推荐，干净无多余文件）
   git archive --format=zip --output=../harmonyos-development-skill.zip HEAD

   # 或从上级目录打包（macOS / Linux）
   zip -qr harmonyos-development-skill.zip harmonyos-development-skill -x '*/.DS_Store' '*/.git*'
   ```
   ```powershell
   # Windows PowerShell 从上级目录打包
   tar.exe -a -cf harmonyos-development-skill.zip harmonyos-development-skill
   ```
2. 在 WorkBuddy 左侧「技能 → 添加技能 → 上传技能」中导入文件夹或 ZIP，然后在「已安装」中搜索 `harmonyos-development-skill`。

### 4. 离线手动复制与跨规则接入

必须保证 `references/`、`scripts/` 与 `SKILL.md` 位于同一级目录。

<details>
<summary>展开查看：本地目录复制脚本（macOS / Linux / Windows PowerShell）与 Windows 长路径提醒</summary>

#### macOS / Linux

先进入鸿蒙工程根目录，将 `SKILL_SRC` 改为本地技能包路径，将 `SKILLS_DIR` 改为目标工具目录（全局安装可设为 `"$HOME/.agents/skills"`）：

```bash
SKILL_SRC="/path/to/harmonyos-development-skill"
SKILLS_DIR=".agents/skills"
SKILL_DEST="$SKILLS_DIR/harmonyos-development-skill"

if [ ! -f "$SKILL_SRC/SKILL.md" ]; then
  printf '找不到技能入口：%s\n' "$SKILL_SRC" >&2
  false
elif [ -e "$SKILL_DEST" ] || [ -L "$SKILL_DEST" ]; then
  printf '目标已存在，请先确认如何处理旧版：%s\n' "$SKILL_DEST" >&2
  false
else
  mkdir -p "$SKILLS_DIR" && cp -R "$SKILL_SRC" "$SKILL_DEST" && test -f "$SKILL_DEST/SKILL.md"
fi
```

#### Windows PowerShell

先进入鸿蒙工程根目录，修改 `$SkillSrc` 和 `$SkillsDir` 后运行（全局安装可改为 `Join-Path $HOME '.agents\skills'`）：

```powershell
$SkillSrc = 'C:\path\to\harmonyos-development-skill'
$SkillsDir = '.agents\skills'
$SkillDest = Join-Path $SkillsDir 'harmonyos-development-skill'

if (-not (Test-Path -LiteralPath (Join-Path $SkillSrc 'SKILL.md') -PathType Leaf)) {
    throw "找不到技能入口：$SkillSrc"
}
if (Test-Path -LiteralPath $SkillDest) {
    throw "目标已存在，请先确认如何处理旧版：$SkillDest"
}
New-Item -ItemType Directory -Path $SkillsDir -Force -ErrorAction Stop | Out-Null
Copy-Item -LiteralPath $SkillSrc -Destination $SkillDest -Recurse -Force -ErrorAction Stop
Test-Path -LiteralPath (Join-Path $SkillDest 'SKILL.md') -PathType Leaf
```

> **Windows 长路径提醒**：完整文档库包含较深的子目录。若 Windows 报路径过长，请将技能包与鸿蒙工程放在较短的路径下，并确认系统和客户端已开启长路径支持（[Windows 路径长度说明](https://learn.microsoft.com/zh-cn/windows/win32/fileio/maximum-file-path-limitation)）。

</details>

<details>
<summary>展开查看：通过规则或上下文接入（Jules / Aider / Continue / 网页对话工具）</summary>

- **支持 `AGENTS.md` 的 Agent（如 Jules）**：将「处理鸿蒙任务前，按需读取 `<相对路径>/harmonyos-development-skill/SKILL.md`」追加到项目级 `AGENTS.md`，并确保运行环境可访问该路径（[Jules 文档](https://jules.google/docs/)）。
- **Aider**：从工程根目录运行 `aider --read /path/to/harmonyos-development-skill/SKILL.md`，按需再用 `--read` 挂载具体参考文档（[Aider 代码约定](https://aider.chat/docs/usage/conventions.html)）。
- **Continue**：先将技能放到 `.agents/skills/harmonyos-development-skill`，再在工程内创建 `.continue/rules/harmonyos.md`（[Continue Rules](https://docs.continue.dev/customize/deep-dives/rules)）：
  ```markdown
  ---
  name: HarmonyOS Development
  alwaysApply: true
  ---

  处理 HarmonyOS、ArkTS 或 ArkUI 任务时，读取项目内的
  `.agents/skills/harmonyos-development-skill/SKILL.md`，再按任务读取其中指向的参考资料。
  ```
- **网页版对话工具（ChatGPT、Gemini、DeepSeek、通义、Kimi 等）**：直接上传或粘贴 `SKILL.md` 与对应专题资料（如 [HarmonyOS 开发手册](references/harmonyos-development-handbook/harmonyos-development/GUIDE.md)），并一并提供引用的参考文件。

</details>

### 5. 检查、更新与卸载

```bash
# 查看已安装技能（全局加 -g）
npx skills list
npx skills list -g

# 检查远端更新 / 更新 / 卸载（全局安装需加 -g）
npx skills check
npx skills update harmonyos-development-skill
npx skills update -g
npx skills remove harmonyos-development-skill
npx skills remove -g harmonyos-development-skill
```

---

## 验证安装 & 试试这些提问

开启一个新会话后，先用一条只读请求测试入口与相对路径是否全部畅通：

> 请使用 `harmonyos-development-skill`。先说明你会查哪份包内文档，再说明在 HarmonyOS 项目中如何核对 Navigation API 的可用版本。先不用修改文件。

日常干活时可以直接这样下指令：

- **写对 ArkTS / 查兼容版本**：`用 harmonyos-development-skill 审查当前页面的状态管理与 ArkTS 语法，把 Legacy router 迁移到 Navigation，并核对目标 SDK 下的 API 兼容版本。`
- **DevEco 构建与真机验证**：`按 harmonyos-development-skill 用 devecocli 检查并构建当前工程，部署到连接设备后截取首页截图并核对日志。`
- **分析崩溃 FaultLog**：`用 harmonyos-development-skill 分诊这份 FaultLog，先跑脚本定位根因和异常栈帧，再给出最小修复方案。`

### 单独测试离线文档查询

在技能包根目录用 Node.js 就能直接检索随包附带的 28 篇 OpenHarmony 文档：

```bash
node scripts/knowledge.mjs catalog
node scripts/knowledge.mjs search Navigation 路由
node scripts/knowledge.mjs read Navigation
node scripts/knowledge.mjs read Navigation 1
```

---

## 参考项目与许可

- 本仓库根级原创与汇编分发采用 [MIT 许可证](LICENSE)。
- **HarmonyOS AI Skill** 提供鸿蒙开发手册、示例、主题索引和分发范本。[上游项目](https://github.com/DengShiyingA/harmonyos-ai-skill) · [MIT 许可证](references/harmonyos-development-handbook/LICENSE)
- **OpenHarmony 离线知识**来自 OpenHarmony Project Contributors，适用 CC BY 4.0，知识索引保留原始提交、逐篇来源和哈希。[OpenHarmony 文档项目](https://gitee.com/openharmony/docs) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [知识索引](references/openharmony-knowledge/index.json)

其他专题随附的许可与署名保存在对应目录，完整清单见 [来源与目录](references/sources.md)。
