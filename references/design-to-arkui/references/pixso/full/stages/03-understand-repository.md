# 03 - 理解目标 ArkTS 工程

## 阶段元数据

- id: 03
- title: 03 - 理解目标 ArkTS 工程
- variant: full
- designSource: pixso
- instruction: references/pixso/full/stages/03-understand-repository.md
- 子 Agent: 有（general 子 agent，代码仓理解）

## 强制阶段入口 Todo 同步

在本阶段执行任何工作前：

1. 读取成功的 `stage-start` 调用返回的 `todoPayloadPath`。
2. 原样调用一次 `todowrite`，传入 `todo-payload.json.todos`，不得修改。
3. 不得翻译、摘要、重建、追加、删除或重排 Todo 项。
4. 不得运行 `status` 来准备本次同步；`stage-start` 已经刷新过 payload。
5. 只有 `todowrite` 成功后，才可以加载所需能力、查看项目文件、修改代码、构建、截图或发送阶段进度回复。

必须始终执行本次同步。不要试图判断 UI 是否已经包含相同的 Todo 列表。在阶段入口完整重放一次列表是有意为之且幂等的。

## 目标

通过 `hmos-d2a-repo-understand` 理解目标 ArkTS 工程结构、入口、路由、状态管理、数据模型、资源目录和构建命令，识别阶段 2 代码实际写入位置及与存量项目的差异，为后续阶段提供工程上下文。

## 必需输入

- project_root_path
- dsl_path
- stage2_integrated_code_paths
- image_assets_manifest_path
- stage2_build_report_path
- task_description
- ledger_path: `<designToArktsRunDir>/capability-invocation-ledger.json`
- `<designToArktsRunDir>/requirement-clarification.json`（由阶段 1 创建；缺失或无法解析时以 blocked 结束阶段 3，不得在本阶段新建或补造该文件）

## 执行步骤

加载能力 `hmos-d2a-repo-understand`（注册表 → references/capabilities/hmos-d2a-repo-understand/INSTRUCTIONS.md），并完整执行，输入阶段 1 实例解绑 DSL、阶段 2 已集成代码、资源 manifest、构建报告和当前项目源码。

工程分析完成后，更新 `<designToArktsRunDir>/requirement-clarification.json` 中由规范分配给阶段 3 的 `targetModule` 字段，保持其他字段不变：不得覆盖预检用户选择和阶段 1 已补全的字段，也不得改写 `startupPagePolicy.userOverride`。启动页现状分析继续写入本阶段原有的 `<designToArktsRunDir>/stage3-repo-understand-report.json`/`.md`。

如果 `hmos-d2a-repo-understand` 不存在、不可用或无法读取其 `INSTRUCTIONS.md`/必要 references，必须暂停阶段 3 并询问用户如何处理，明确说明缺失能力、阶段和影响；不得通过 `task`/`general` 子 agent 的普通仓库探索能力、文件搜索、代码审查、手写总结或主 agent 自行理解来替代。

必须覆盖：

- 工程结构、入口、路由、状态管理、数据模型、资源目录、构建命令。
- 阶段 2 代码实际写入位置。
- 阶段 2 代码和存量项目的差异、冲突和可复用点。
- 启动页现状：识别 `EntryAbility`、`WindowStage.loadContent`、`main_pages.json`、默认 `pages/Index`、已有业务首页、上一轮 design-to-arkts 运行记录；判断当前工程是否为新建模板工程。新建模板工程判定至少包含：仅有模板 `Index`/Hello World 启动页、无明确业务首页、无历史 design-to-arkts run-index 或历史入口依赖、用户未提供保留原入口说明。
- 后续代码组织建议。

## 子 Agent 执行指令

⚠️ 本步骤默认通过 task 工具委托给 general 类型子 agent 执行。

调用参数：

```yaml
subagent_type: "general"
description: "阶段 3: 代码仓理解"
prompt: 见下方任务模板
```

```text
## 任务：03 - 理解目标 ArkTS 工程

路径与加载约定：本模板中的 `references/…` 路径相对本 skill 安装根目录（入口 skill：`hmos-design-to-arkts`，安装于 `~/.local/share/deveco/skills/hmos-design-to-arkts/`）。能力不是注册 skill：不得调用 skill 工具加载能力，用文件读取工具打开指定 INSTRUCTIONS.md 并全文执行。模板中的输入名与 `<designToArktsRunDir>` 等占位符由父 Agent 替换为实际值后发送；若你收到未替换的占位符，按缺失输入立即终止并向父 Agent 返回报告。
你是 HarmonyOS/ArkTS 代码仓分析 agent。加载能力 `hmos-d2a-repo-understand`（注册表 → references/capabilities/hmos-d2a-repo-understand/INSTRUCTIONS.md），并完整执行。若 hmos-d2a-repo-understand 不存在、不可用或无法读取其 INSTRUCTIONS.md/必要 references，必须立即终止本子任务并向父 Agent 返回缺失报告（缺失能力、阶段和影响），由父 Agent 询问用户；不得说"使用可用的探索能力替代"，不得用普通搜索、代码审查、手写总结或主 agent 自行理解替代。

输入：
- project_root_path
- dsl_path
- stage2_integrated_code_paths
- image_assets_manifest_path
- stage2_build_report_path
- task_description
- ledger_path: <designToArktsRunDir>/capability-invocation-ledger.json

步骤：
1. 向 ledger 追加 invoked 条目：`{ "capability": "hmos-d2a-repo-understand", "status": "invoked" }`；条目 JSON 键固定为 "capability"，不得改用其他字段名。ledger 文件整体为 JSON 数组（每项一条调用记录，禁止 `entries` 等对象包裹；文件不存在时先创建 `[]` 再追加）。
2. 加载能力 `hmos-d2a-repo-understand`（注册表 → references/capabilities/hmos-d2a-repo-understand/INSTRUCTIONS.md），并完整执行。
3. 分析 UI、路由、逻辑、数据、资源、构建命令、阶段 2 集成位置。
4. 输出 repo_context 和差异分析。
5. 写入 <designToArktsRunDir>/stage3-repo-understand-report.json 和 .md。
6. 更新 ledger。

职责边界：`<designToArktsRunDir>/requirement-clarification.json` 不在本子任务范围内，不得创建、修改或删除该文件；阶段 3 负责的 `targetModule` 字段由父 Agent 依据你的工程分析报告（工程结构、阶段 2 代码写入位置、后续代码组织建议）补全。
```

## 必需产物

- `<designToArktsRunDir>/stage3-repo-understand-report.json`
- `<designToArktsRunDir>/stage3-repo-understand-report.md`

## 完成条件

### 通过条件

- `stage3-repo-understand-report.json` 和 `stage3-repo-understand-report.md` 均存在且可解析。
- `requirement-clarification.json` 中阶段 3 负责的 `targetModule` 已补全，且预检字段和阶段 1 字段未被覆盖。
- `capability-invocation-ledger.json` 中有 `hmos-d2a-repo-understand` 的 `completed` 调用证据。
- 报告覆盖工程结构、入口、路由、状态管理、数据模型、资源目录、构建命令、阶段 2 代码写入位置、差异分析、启动页现状和后续代码组织建议。

### 阻塞或失败条件

- `hmos-d2a-repo-understand` 不存在、不可用或无法读取其 `INSTRUCTIONS.md`/必要 references 时，必须暂停阶段 3 并询问用户如何处理。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 3 --result passed
```

无法继续时，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 3 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。
## 禁止事项

- 不得通过 `task`/`general` 子 agent 的普通仓库探索能力、文件搜索、代码审查、手写总结或主 agent 自行理解来替代。
- 不得说"使用可用的探索能力替代"。
