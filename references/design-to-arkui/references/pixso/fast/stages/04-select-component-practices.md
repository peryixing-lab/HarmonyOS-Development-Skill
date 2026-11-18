# 04 - 选择 ArkUI/HDS 最佳实践

## 阶段元数据

- id: 04
- title: 04 - 选择 ArkUI/HDS 最佳实践
- variant: fast
- designSource: pixso
- instruction: references/pixso/fast/stages/04-select-component-practices.md
- 子 Agent: 有（general 子 agent，ArkUI 最佳实践识别与选择）

## 强制阶段入口 Todo 同步

在本阶段执行任何工作前：

1. 读取成功的 `stage-start` 调用返回的 `todoPayloadPath`。
2. 原样调用一次 `todowrite`，传入 `todo-payload.json.todos`，不得修改。
3. 不得翻译、摘要、重建、追加、删除或重排 Todo 项。
4. 不得运行 `status` 来准备本次同步；`stage-start` 已经刷新过 payload。
5. 只有 `todowrite` 成功后，才可以加载所需能力、查看项目文件、修改代码、构建、截图或发送阶段进度回复。

必须始终执行本次同步。不要试图判断 UI 是否已经包含相同的 Todo 列表。在阶段入口完整重放一次列表是有意为之且幂等的。

## 目标

通过 `hmos-d2a-arkui-component-best-practices` 识别并选择页面根布局、图片/图标约束、底部栏与安全区、视口边界策略、交互组件、HDS 候选区域和候选组件，为后续方案设计提供最佳实践依据。

## 必需输入

- dsl_path
- stage2_integrated_code_paths
- repo_understand_report_path
- requirement_clarification_path
- image_assets_manifest_path
- ledger_path

## 执行步骤

加载能力 `hmos-d2a-arkui-component-best-practices`（注册表 → references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md），并完整执行，必要时结合 `hmos-d2a-responsive-layout-generator` 的规则选择。

## 子 Agent 执行指令

⚠️ 本步骤默认通过 task 工具委托给 general 类型子 agent 执行。

调用参数：

```yaml
subagent_type: "general"
description: "阶段 4: ArkUI 最佳实践识别与选择"
prompt: 见下方任务模板
```

```text
## 任务：04 - 选择 ArkUI/HDS 最佳实践

路径与加载约定：本模板中的 `references/…` 路径相对本 skill 安装根目录（入口 skill：`hmos-design-to-arkts`，安装于 `~/.local/share/deveco/skills/hmos-design-to-arkts/`）。能力不是注册 skill：不得调用 skill 工具加载能力，用文件读取工具打开指定 INSTRUCTIONS.md 并全文执行。模板中的输入名与 `<designToArktsRunDir>` 等占位符由父 Agent 替换为实际值后发送；若你收到未替换的占位符，按缺失输入立即终止并向父 Agent 返回报告。
你是 ArkUI 最佳实践检索 agent。加载能力 `hmos-d2a-arkui-component-best-practices`（注册表 → references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md），并完整执行。

输入：
- dsl_path
- stage2_integrated_code_paths
- repo_understand_report_path
- requirement_clarification_path
- image_assets_manifest_path
- ledger_path

步骤：
1. 向 ledger 追加 hmos-d2a-arkui-component-best-practices invoked 条目。
2. 加载能力 `hmos-d2a-arkui-component-best-practices`（注册表 → references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md），并完整执行。
3. 识别布局、交互、资源、安全区、系统 UI 沉浸式边界、视口边界 edge-band 风险、HDS 候选项；必须区分背景延伸和内容避让。
4. 输出 selectedPractices、unselectedPractices、riskNotes。
5. 写入 <designToArktsFastRunDir>/stage4-selected-practices.json。
6. 更新 ledger。
```

## 必需产物

输出 `<designToArktsFastRunDir>/stage4-selected-practices.json`，必须包含：

- 页面根布局、Scroll/List/Grid/Tabs/Navigation/Stack 选择。
- 图片和图标尺寸、裁切、宽高比、min/max、响应式约束。
- 底部栏与系统手势区、安全区、沉浸背景延展；必须区分"背景延伸"和"内容避让"。
- 视口边界策略：根背景、Scroll 视口、底部安全区、固定底栏/卡片/Tab 之间的边界关系，禁止用内层容器背景或固定 padding 制造上下空白边。
- 交互组件、状态组件、弹窗、加载、空态。
- HDS 候选区域和候选组件。

## 完成条件

### 通过条件

- `<designToArktsFastRunDir>/stage4-selected-practices.json` 存在且可解析。
- `capability-invocation-ledger.json` 中有 `hmos-d2a-arkui-component-best-practices` 的 `completed` 调用证据。
- 产物包含页面根布局、图片/图标约束、底部栏与安全区、视口边界策略、交互组件、HDS 候选区域和候选组件。

### 阻塞或失败条件

- `hmos-d2a-arkui-component-best-practices` 不存在、不可用或无法读取其 `INSTRUCTIONS.md`/必要 references 时，必须暂停阶段 4 并询问用户如何处理。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 4 --result passed
```

无法继续时，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 4 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。
## 禁止事项

- 禁止用内层容器背景或固定 padding 制造上下空白边。
