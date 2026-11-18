# 工具链使用说明

先确认工程根目录、可用工具和目标 SDK。命令里的 `SKILL_ROOT` 是技能包根目录的绝对路径。示例中的输入文件和设备参数需换成实际值。

## 离线查询 OpenHarmony 文档

查询脚本需要 Node.js，使用包内的 [28 篇 OpenHarmony 文档及索引](openharmony-knowledge/index.json)。

```bash
node "$SKILL_ROOT/scripts/knowledge.mjs" catalog
node "$SKILL_ROOT/scripts/knowledge.mjs" search Navigation 路由
node "$SKILL_ROOT/scripts/knowledge.mjs" read Navigation
node "$SKILL_ROOT/scripts/knowledge.mjs" read Navigation 1
```

`search` 按主题、标签和小节标题匹配。`read` 可传目录返回的小节编号，也可以传小节标题。返回的 `sourceUrl` 和 `sourceSha` 用于定位原文。确认 API 签名和版本时，再核对目标 SDK 声明和当前官方文档。

## 构建、静态检查与设备

- 在工程根目录用 `devecocli check arkts`、`devecocli check lint` 和 `devecocli build` 检查或构建。设备可先用 `devecocli device list` 确认，再用 `devecocli run --skip-build --device <目标>` 部署已构建的产物。截图和日志用 `devecocli ui screenshot` 与 `devecocli log`。参数和版本条件见 [DevEco CLI 工作流](deveco-cli-workflows/GUIDE.md)。
- 若工程已有可用的 DevEco Studio 或 Command Line Tools，按项目配置使用 `hvigorw`、ohpm 和 HDC。`hdc list targets` 可列出设备，多设备时后续命令指定 `hdc -t <序列号>`。核查实际设备状态和构建产物。[构建签名参考](harmonyos-development-handbook/harmonyos-development/references/build-sign-release.md)
- `verify_ui`、AppAnalyzer 和设计平台 MCP 由宿主提供。在使用对应流程前，核对工具列表、工程和设备能力。[DeepLink UI 验证](deeplink-ui-verification/GUIDE.md) · [AppAnalyzer](app-quality-verification/GUIDE.md) · [设计稿转 ArkUI](design-to-arkui/GUIDE.md)

## 日志与故障脚本

```bash
python3 "$SKILL_ROOT/references/fault-log-analysis/scripts/identify_fault_log.py" --path /绝对路径/faultlog.txt
node "$SKILL_ROOT/references/arkts-crash-debugging/scripts/parse-jscrash-log.mjs" --log-file /绝对路径/jscrash.txt --include-text
```

先读对应指南再选脚本。文档中的 `<skill-base>`、`<designToArktsSkillRoot>` 和 `{SKILL_DIR}` 分别指 `fault-log-analysis/`、`design-to-arkui/` 和 `arkts-crash-debugging/` 专题目录的绝对路径。
