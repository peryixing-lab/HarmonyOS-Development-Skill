# HarmonyOS Development Skill

给 AI 编程 Agent 使用的鸿蒙开发技能包。从 API 查证、ArkTS/ArkUI 编写，到 DevEco 构建、设备验证和崩溃分诊，按任务加载对应的资料与脚本。[技能入口](SKILL.md)

## 能做什么

- **开发与迁移**涵盖 Stage 模型、ArkUI 组件、V1/V2 状态管理、Navigation、Kit、版本与权限。
- **工程验证**涵盖 ArkTS 审查、DevEco CLI、Hvigor、签名、部署和编译排查。
- **设备与故障排查**涵盖 HDC、截图、HiLog、JSCrash、CppCrash、AppFreeze、AppAnalyzer 和临时 DeepLink UI 验证。
- **设计转代码**涵盖 Pixso、Figma、MasterGo、ArkUI/HDS 和多设备适配。

包内有 28 篇 OpenHarmony 中文文档节选，可按主题、标签和小节离线查阅。构建、真机、模拟器和设计稿连接按任务使用已安装的工具。脚本的运行条件和示例见[工具链说明](references/toolchains.md)。

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
│   ├── deveco-code-configuration/     # DevEco Code 配置
│   ├── fault-log-analysis/            # 故障日志分诊和分析
│   ├── harmonyos-development-handbook/ # 鸿蒙开发手册与示例
│   └── openharmony-knowledge/         # 离线文档、索引和溯源
└── scripts/knowledge.mjs             # 离线文档查询
```

技能入口按任务链接到各专题的 `GUIDE.md`，各专题的资料和脚本放在对应目录。完整清单见[来源与目录](references/sources.md)。

## 安装到编程 Agent

安装对象是整个 `harmonyos-development-skill` 目录，`references/` 和 `scripts/` 必须与 `SKILL.md` 同级。先确认本机已有这份技能包，再从下方选一个安装路径。项目级路径从**要开发的鸿蒙工程根目录**计算。`~` 表示用户主目录。

### 原生技能目录

- **Codex 桌面版、CLI、IDE 扩展**使用项目 `.agents/skills` 或全局 `~/.agents/skills`。打开一个新会话，用 `$harmonyos-development-skill` 指定技能。[Codex Skills](https://developers.openai.com/codex/skills)
- **Claude Code** 使用项目 `.claude/skills` 或全局 `~/.claude/skills`。用 `/harmonyos-development-skill` 调用。[Claude Code Skills](https://code.claude.com/docs/en/skills)
- **Cursor** 使用项目 `.cursor/skills` 或全局 `~/.cursor/skills`。在 Customize → Skills 中查看，或在 Agent 对话中用 `/harmonyos-development-skill` 调用。[Cursor Agent Skills](https://cursor.com/docs/skills)
- **GitHub Copilot（VS Code、CLI、云端 Agent）**使用项目 `.github/skills`。本机也可使用全局 `~/.copilot/skills`。云端 Agent 从自己的仓库检出项目级文件，需将有权提交的技能目录加入该项目仓库。[Copilot Agent Skills](https://docs.github.com/en/copilot/concepts/customizations/agent-skills)
- **Gemini CLI** 使用项目 `.gemini/skills` 或全局 `~/.gemini/skills`。也可执行 `gemini skills install "$SKILL_SRC" --scope workspace`，然后用 `gemini skills list` 验证。[Gemini CLI Agent Skills](https://geminicli.com/docs/cli/skills/)
- **Windsurf / Cascade** 使用项目 `.windsurf/skills` 或全局 `~/.codeium/windsurf/skills`。在 Cascade 对话中指定 `harmonyos-development-skill`。安装目录可从跨 Agent 安装器的 Windsurf 配置核对。[Windsurf 安装目录定义](https://github.com/vercel-labs/skills/blob/main/src/agents.ts)
- **OpenCode** 使用项目 `.opencode/skills` 或全局 `~/.config/opencode/skills`，也支持共享的 `.agents/skills` 目录。在任务里明确要求加载 `harmonyos-development-skill`。[OpenCode Skills](https://opencode.ai/docs/skills/)
- **DevEco Code** 使用项目 `.deveco/skills` 或全局 `~/.config/deveco/skills`。复制后重启 DevEco Code，从鸿蒙工程打开新会话并指定技能名称。[DevEco Code](https://gitcode.com/openharmony-sig/deveco-code)
- **Cline** 使用项目 `.cline/skills` 或全局 `~/.cline/skills`。在 Skills 配置里启用后，通过对话指定技能。[Cline Skills](https://docs.cline.bot/customization/skills)
- **Roo Code** 使用项目 `.roo/skills` 或全局 `~/.roo/skills`。在支持 Skills 的版本中，从对话指定技能。[Roo Code Skills](https://roocodeinc.github.io/Roo-Code/features/skills/)
- **Amp** 使用项目 `.agents/skills` 或全局 `~/.config/agents/skills`。可运行 `amp skills list` 查看。[Amp Skills](https://ampcode.com/docs/customize/skills)
- **腾讯 CodeBuddy** 使用项目 `.codebuddy/skills`，也可从 Skills 设置中导入本地技能。[CodeBuddy 文档](https://staticintl.cloudcachetci.com/doc/pdf/product/pdf/1256_77276_zh.pdf)
- **腾讯 WorkBuddy** 在左侧「技能」中选择「添加技能 → 上传技能」，然后导入本地技能包。在「已安装」中查找该技能。[WorkBuddy 技能文档](https://intl.cloud.tencent.com/zh/document/product/1316/84503)

### macOS / Linux

先进入鸿蒙工程根目录。将 `SKILL_SRC` 改为完整技能包的位置，再将 `SKILLS_DIR` 改为上面对应的安装路径。本例使用 Codex 的项目目录；全局安装可改为 `SKILLS_DIR="$HOME/.agents/skills"`。

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

### Windows PowerShell

先进入鸿蒙工程根目录，修改 `$SkillSrc` 和 `$SkillsDir` 后运行。本例使用 Codex 的项目目录；全局安装可改为 `$SkillsDir = Join-Path $HOME '.agents\skills'`。

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

完整文档库包含较深的目录。若 Windows 报路径过长，将源目录和鸿蒙工程放到较短的路径，并确认当前 Windows 和客户端支持长路径。[Windows 路径长度说明](https://learn.microsoft.com/zh-cn/windows/win32/fileio/maximum-file-path-limitation)

安装后从 Agent 的技能列表选择或在会话中指定 `harmonyos-development-skill`。多个 Agent 共用 `.agents/skills` 时安装一次即可。

### WorkBuddy 本地包

客户端要求 ZIP 时，从技能目录的上一级运行下列任一命令，再在 WorkBuddy 中导入生成的文件。

```bash
zip -qr harmonyos-development-skill.zip harmonyos-development-skill -x '*/.DS_Store'
```

```powershell
tar.exe -a -cf harmonyos-development-skill.zip harmonyos-development-skill
```

## 通过规则或上下文接入

- **支持 `AGENTS.md` 的 Agent（如 Jules）**可以把「处理鸿蒙任务前，按需读取 `<相对路径>/harmonyos-development-skill/SKILL.md`」追加到项目级 `AGENTS.md`，并把可读取的本地技能完整放在指定路径。远程 Agent 使用其仓库或运行环境内可访问的路径。[Jules 项目说明](https://jules.google/docs/)
- **Aider** 从工程根目录用 `aider --read /path/to/harmonyos-development-skill/SKILL.md` 加载入口。还可用 `--read` 加载本次需要的参考文件。[Aider 代码约定](https://aider.chat/docs/usage/conventions.html)
- **ChatGPT、Gemini 网页版、DeepSeek、通义、Kimi 等聊天工具**可在会话中上传或粘贴 `SKILL.md` 和相关资料，例如 [HarmonyOS 开发手册](references/harmonyos-development-handbook/harmonyos-development/GUIDE.md)。遇到入口里的相对引用时，将所需参考文件一并提供。CLI、设备和脚本能力取决于宿主环境。

### Continue

先按项目级安装将技能目录放到 `.agents/skills`。再在鸿蒙工程内创建 `.continue/rules/harmonyos.md`，加入以下内容。打开 Continue Agent 会话，发送下面的验证请求。[Continue Rules](https://docs.continue.dev/customize/deep-dives/rules)

```markdown
---
name: HarmonyOS Development
alwaysApply: true
---

处理 HarmonyOS、ArkTS 或 ArkUI 任务时，读取项目内的
`.agents/skills/harmonyos-development-skill/SKILL.md`，再按任务读取其中指向的参考资料。
```

## 验证安装

开启新会话后，发一条只读请求确认入口和相对引用都可用。

> 请使用 `harmonyos-development-skill`。先说明你会查哪份包内文档，再说明在 HarmonyOS 项目中如何核对 Navigation API 的可用版本。先不用修改文件。

也可以在技能包根目录用 Node.js 验证 OpenHarmony 离线文档查询。

```bash
node scripts/knowledge.mjs catalog
node scripts/knowledge.mjs search Navigation 路由
node scripts/knowledge.mjs read Navigation
node scripts/knowledge.mjs read Navigation 1
```

## 参考项目与许可

- **HarmonyOS AI Skill** 提供鸿蒙开发手册、示例、主题索引和分发范本。[上游项目](https://github.com/DengShiyingA/harmonyos-ai-skill) · [MIT 许可证](references/harmonyos-development-handbook/LICENSE)
- **OpenHarmony 离线知识**来自 OpenHarmony Project Contributors，适用 CC BY 4.0。知识索引保留原始提交、逐篇来源和哈希。[OpenHarmony 文档项目](https://gitee.com/openharmony/docs) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [知识索引](references/openharmony-knowledge/index.json)

其他专题随附的许可与署名保存在对应目录。[来源与目录](references/sources.md)
