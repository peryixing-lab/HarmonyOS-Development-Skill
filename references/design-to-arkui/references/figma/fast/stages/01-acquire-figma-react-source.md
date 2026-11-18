# 01 - 获取并校验 Figma React 设计源

## 阶段元数据

- id: 01
- title: 01 - 获取并校验 Figma React 设计源
- variant: fast
- designSource: figma
- instruction: references/figma/fast/stages/01-acquire-figma-react-source.md
- 子 Agent: 无

## 强制阶段入口 Todo 同步

开始任何阶段工作前，读取成功的 `stage-start` 返回的 `todoPayloadPath`，把其中 `.todos` 原样调用一次 `todowrite`。不得运行 `status` 准备同步，不得修改 Todo；同步成功前不得执行阶段工作。

## 目标与执行

使用 Anchor MCP 将带 `node-id` 的 Figma 单节点链接固化为 `hmos-d2a-react-to-arkui` 可消费的静态 React/Tailwind JSX、2 倍通用参考截图、1 倍组件识别专用截图和本地资源。本阶段不执行 JSX、不生成 ArkUI，也不加载能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md），并完整执行。

1. 创建 `<designToArktsFastRunDir>` 并写入 `requirement-clarification.json`；确认 `workflow-state.json.designSource=figma`。
2. 校验 Figma file key 和 `node-id`。
3. 执行 MCP 依赖检查（详细见 `references/mcp-dependency.md`）：**判定只看当前会话工具列表是否存在 figma 转换能力工具**（名称含 `figma_to_code_`；前缀以会话实际为准，如 `anchor-d2c-mcp_figma_to_code_convert`）；不存在即不满足（无需自行运行命令或探测端点；原因可由用户自查 `deveco mcp list`）。不满足时按 `references/mcp-dependency.md` 的引导向用户给出安装建议（方式 A 免安装 / 方式 B 全局安装，含完整命令与手动配置模板），并写入 `inputs-manifest.json.mcpDependencyCheck`（`status=not-satisfied`、`guidance` 填已给出的建议），以 `dependency_unavailable` 完成 blocked，不得切换 Pixso 链路。不得把 `FIGMA_ACCESS_TOKEN` 写入命令、manifest、报告或回复。
4. 调用 `figma_to_code_convert`，固定 `workspaceRoot=<designToArktsFastRunDir>/source/figma`、`useCache=true`、`framework=Tailwind`、`generationMode=jsx`。
5. 使用同一 Figma URL 和 workspaceRoot 分别调用 `figma_to_code_fetch_screenshot` 两次：
   - `scale=2`：固化为 `source/figma/reference-screenshot.png`，作为 2 倍通用视觉参考，供后续设计分析、UI 还原、视觉校准和评分使用；
   - `scale=1`：固化为 `source/figma/component-recognition-screenshot.png`，作为 1 倍组件识别专用输入，只能传给 `recognize_ui_components`。
   两张截图必须来自同一 Figma 节点，不得改用缓存中的 `preview_2x.png`、其它倍率截图，也不得通过本地放大或缩小其中一张来生成另一张。
6. 只根据结构化返回固化 `page.jsx`、两张截图、assets、响应和 warnings；不得记录 `FIGMA_ACCESS_TOKEN`。`inputs-manifest.json` 必须在 `screenshots` 中分别记录两张截图的用途（`general-visual-reference` / `recognize-ui-components-only`）、倍率、实际宽高、文件大小和 SHA-256；1 倍截图实际宽高必须与目标 Figma 节点的逻辑页面宽高一致，2 倍截图宽高必须分别等于逻辑宽高的两倍。

截图元数据字段名必须使用 width、height、size、sha256；size 为当前截图文件的实际字节数，sha256 必须由当前文件内容计算并使用 64 位小写十六进制。不得使用 fileSize 或 fileSizeBytes。
7. JSX 只读，不得执行、安装其依赖或启动 React 项目。审计 `<img>`、SVG、`backgroundImage` 和远程 URL，固化全部必需资源。
8. 校验路径不越出 runDir、文件类型、10MB 单资源上限、SHA-256 和设计文本不可信属性。必需图片/向量 warning 未解决时阻塞。

### 工程接入现状快照

与 Full 使用完全相同的工程接入现状契约。定位目标 ArkUI 工程根目录，读取并登记：

```text
.deveco/design-to-arkts-fast/run-index.json
EntryAbility.ets
main_pages.json
Index.ets
项目现有集中路由表（如存在）
```

在 `inputs-manifest.json.integrationSnapshot` 中记录：

```json
{
  "projectRootPath": "<工程根目录绝对或相对 runDir 路径>",
  "runIndexFile": ".deveco/design-to-arkts-fast/run-index.json",
  "existingGeneratedPages": [],
  "existingGeneratedRoutes": [],
  "startupPageBefore": "pages/Index",
  "defaultPageBefore": "",
  "indexPageFile": "entry/src/main/ets/pages/Index.ets",
  "entryAbilityFile": "entry/src/main/ets/entryability/EntryAbility.ets",
  "mainPagesFile": "entry/src/main/resources/base/profile/main_pages.json",
  "registrationMode": "index-navigation | route-table | existing-router"
}
```

不得形成与 Full 不同的字段集合；`indexPageFile` / `entryAbilityFile` / `mainPagesFile` 均为相对工程根目录的路径，`projectRootPath` 允许绝对路径或相对 runDir 的相对路径。

## 必需产物

```text
<designToArktsFastRunDir>/requirement-clarification.json
<designToArktsFastRunDir>/inputs-manifest.json
<designToArktsFastRunDir>/input-security-report.json
<designToArktsFastRunDir>/source/figma/page.jsx
<designToArktsFastRunDir>/source/figma/reference-screenshot.png
<designToArktsFastRunDir>/source/figma/component-recognition-screenshot.png
<designToArktsFastRunDir>/source/figma/assets/
<designToArktsFastRunDir>/source/figma/anchor-response.json
<designToArktsFastRunDir>/source/figma/anchor-warnings.json
<designToArktsFastRunDir>/source/figma/target-page-identity.json
```

只有输入安全通过、目标身份一致、双截图倍率与尺寸校验通过（2 倍通用图、1 倍组件识别专用图均来自同一目标节点）、`inputs-manifest.json.integrationSnapshot` 已记录工程接入现状且 `missingInputs=[]` 才能调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsFastRunDir> --stage 1 --result passed
```

失败时使用稳定 reason code 完成 blocked；不得切换 Pixso 链路或用占位资源继续。
