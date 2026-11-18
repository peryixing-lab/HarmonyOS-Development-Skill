# 08 - 完成质量检查与构建

## 阶段元数据

- id: 08
- title: 08 - 完成质量检查与构建
- variant: full
- designSource: pixso
- instruction: references/pixso/full/stages/08-quality-build-and-audits.md
- 子 Agent: 有（general 类型子 agent，委托代码质量、构建、HDS 和系统 UI 沉浸式审计）

## 强制阶段入口 Todo 同步

在本阶段执行任何工作前：

1. 读取成功的 `stage-start` 调用返回的 `todoPayloadPath`。
2. 原样调用一次 `todowrite`，传入 `todo-payload.json.todos`，不得修改。
3. 不得翻译、摘要、重建、追加、删除或重排 Todo 项。
4. 不得运行 `status` 来准备本次同步；`stage-start` 已经刷新过 payload。
5. 只有 `todowrite` 成功后，才可以加载所需能力、查看项目文件、修改代码、构建、截图或发送阶段进度回复。

必须始终执行本次同步。不要试图判断 UI 是否已经包含相同的 Todo 列表。在阶段入口完整重放一次列表是有意为之且幂等的。

## 目标

必须执行八类检查，保留全部阻断能力。每项事实只有一个专项审计负责，其它小节引用该结果，不再重复执行完整检查。

## 必需输入

- 阶段 7 最终源码和 `logic-completion-report.md`。
- 设计文档、组件树、HDS 决策。
- `system-ui-policy.json`、`viewport-boundary-spec.json`、`system-ui-coordinate-normalization.json`、`safe-area-unit-contract.json`。
- `stage6-implementation-report.md`。
- 构建命令或工程构建入口。

## 执行步骤

### 共享证据收集

在执行各审计项前，先收集共享证据，在 `stage8-quality-audit.md` 开头形成索引。后续小节引用证据编号，禁止重复扫描和复制相同说明。

共享证据索引包含：

- 最终源码路径
- EntryAbility/WindowStage 路径
- 页面路由和目标身份
- 运行截图和稳定性证据
- 背景层、前景层、安全区消费层源码位置
- safe area 来源、赋值点、转换点、读取点和消费者
- mock 系统 UI 转换清单

如果阶段 8 需要运行应用、获取运行截图或用截图证明系统 UI/视口边界结论，必须先按需检查 DevEco 手机模拟器运行条件：确认模拟器已安装；若已安装但未运行，启动模拟器，并记录命令、退出码和输出；若命令不可用、启动失败、设备离线、无法安装应用、无法进入目标页或无法获取运行截图，暂停并提示具体原因。不得用代码审查、设计稿截图或其它页面截图替代运行截图。

### 实际执行顺序

报告仍按 8.1～8.8 的现有标题顺序输出，但实际检查按依赖关系执行：

```text
共享证据收集
→ 8.1 代码质量、8.2 HDS
→ 执行 8.3 的构建部分
→ 8.7 安全区单位、8.8 坐标归一化
→ 8.4 系统 UI 沉浸
→ 8.5 顶部碰撞、8.6 视口边界
→ 汇总 8.3 的一般几何结论
→ 按 8.1～8.8 顺序写入最终报告
```

不得因为报告标题编号靠前，就在其依赖审计尚未完成时提前写 PASS。

### 8.1 代码质量检视

唯一负责：

- ArkTS 语法、类型、import、资源引用。
- 状态装饰器、生命周期和事件回调。
- Navigation/router/Ability/Want/权限 API 正确性。
- ForEach key、命名、拆分和重复代码。

不要在此完整检查系统 UI 几何关系。

必须使用 DevEco Code 当前可用的 ArkTS/HarmonyOS 代码质量 skill。无可用质量 skill 时必须暂停并询问用户如何处理，不得用手写检查、普通搜索或经验判断冒充。

### 8.2 HDS 检视

唯一负责：

- `hds-decision.json` 是否要求 HDS。
- requiredComponents 是否真实 import、使用并通过构建。
- 不得在阶段 8 重新选择 HDS 或擅自降级。

HDS Navigation 的安全区表现交给 8.4/8.5，不在 8.2 重复检查。

读取 `<designToArktsRunDir>/hds-decision.json` 和 `<designToArktsRunDir>/design-doc.md`。

如果 `hdsRequired=true`，或设计文档任一章节要求使用 HDS 组件、HDS 材质、HDS Navigation/Tabs/ToolBar/沉浸光感能力：

- 加载能力 `hmos-d2a-arkui2hds`（注册表 → references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md），并完整执行。
- 检查设计文档要求的 HDS 组件是否实际 import 和使用。
- 逐项列出 requiredComponents、implementedComponents、missingComponents。
- 必须先尝试 import 和构建验证。不得以"兼容性风险""未声明依赖""标准 ArkUI 足够"、仅凭 API 版本推断"不支持"或未尝试 import/构建为由降级为标准 ArkUI。
- 只有真实 import/构建失败证据和用户批准同时存在时，才允许 fallback；fallback 必须写入失败日志、用户批准记录和替代实现范围。

如果 `hdsRequired=false` 且设计文档没有任何 HDS 要求：

- 记录决策来源，不得在阶段 8 重新自行判断。

HDS 文字审计结果写入 `stage8-quality-audit.md` 的"HDS"小节；结构化结果写入 `hds-audit.json`。

### 8.3 构建与一般几何

唯一负责：

- 构建验证和类型检查。
- 图片/图标尺寸、裁切、宽高比和响应式约束。
- 是否大面积绝对定位或固定屏幕高度。
- Navigation 是否持有 `NavPathStack`（每处 `Navigation(this.navStack)` 或确认已使用 `Column`/`Stack` 替代）。

移出以下内容（归其它审计）：

- 顶部/底部白边、黑边和系统默认底色 → 归 8.6。
- px/vp、唯一消费者和 safeBottom 重复消费 → 归 8.7。
- mock 状态栏/手势条坐标叠加 → 归 8.8。

8.3 可以引用 8.6～8.8 结论，但不得再独立评级同一问题。

写入 `<designToArktsRunDir>/stage8-build-command.json`、`<designToArktsRunDir>/stage8-build-report.md`。

### 8.4 系统 UI 沉浸式审计

唯一负责：

- EntryAbility/WindowStage 的窗口级沉浸配置。
- 系统栏透明或同色配置。
- 根背景是否覆盖完整窗口。
- 背景沉浸层和前景安全区层是否分离。
- 是否错误地通过关闭全屏解决重叠。
- 是否重复绘制假状态栏或手势条。

8.4 不再完整检查（引用其它审计结论）：

- px/vp 转换和唯一消费者 → 引用 8.7。
- mock 坐标转换 → 引用 8.8。
- 顶部组件逐项碰撞 → 引用 8.5。
- 顶部/底部像素边带 → 引用 8.6。

读取 `system-ui-policy.json`、design-doc、EntryAbility/WindowStage、最终页面根组件和视觉参考截图，执行独立审计。

### 8.5 顶部安全区碰撞 top-overlap 审计

唯一负责：

- `topViewportSpec` 中每个顶部前景组件是否位于状态栏以下。
- TitleBar 所在 Navigation/HDS Navigation 是否错误 TOP expand。
- expanded 容器是否直接承载顶部前景组件。
- 截图和源码是否共同证明前景不重叠。
- 截图前是否已经达到稳定状态。

8.5 必须引用（不重复展开）：

- 8.4 的沉浸和分层结论。
- 8.7 的单位、消费者和无效值结论。
- 8.8 的顶部坐标归一化结论。

不得在 8.5 再次展开完整 px/vp、所有赋值点和 mock 坐标审计。

读取 `topViewportSpec`、`system-ui-policy.json`、EntryAbility/WindowStage、最终页面 ArkTS/ETS 源码和运行截图证据，执行独立审计。该审计不得被阶段 9 视觉评分取代；即使视觉评分脚本忽略顶部状态栏像素，也必须执行本审计。

### 8.6 视口边界 edge-band 审计

唯一负责：

- 顶部和底部是否存在白边、黑边、纯色边或系统默认底色。
- 背景在状态栏、内容区和手势区是否连续。
- Scroll/List 到底部时是否截断背景。
- 固定底栏、Tab、dock 与手势区是否遮挡或留下空白边。

8.6 引用 8.5 的顶部前景碰撞结论，不再重复枚举顶部按钮、标题、搜索框、头像、卡片和列表首项。

8.6 引用 8.7 的 safeBottom 消费结论，不再重新检查单位链。

读取 `viewport-boundary-spec.json`、`system-ui-policy.json`、最终页面代码和运行截图证据，执行边界审计。审计不得依赖阶段 9 视觉还原度校准。

### 8.7 安全区单位 safe-area-unit 审计

这是以下问题的唯一完整审计：

- 每个 safe area 来源 API 的原始单位。
- px→vp 是否只转换一次。
- AppStorage/State 赋值点和读取点。
- EntryAbility 与页面是否重复转换。
- safeTop/safeBottom 是否各只有一个消费者。
- Navigation/HDS 自动避让是否与手动 padding 重复。
- 首帧和异步回调是否可能用 `0` 覆盖有效值。

其它小节只能引用 8.7 结果，不得重新执行这些检查。

读取 `safe-area-unit-contract.json`、EntryAbility/WindowStage、最终页面源码、AppStorage/State 变量和运行截图前置日志，执行单位审计。

以下任一情况必须判为 `critical` 或 `major`：单位不明；px/vp 漏转换或重复转换；多个消费者重复消费同一 safe area；无效值覆盖有效值；报告与最终源码不一致。

### 8.8 系统 UI 坐标归一化 coordinate-normalization 审计

这是以下问题的唯一完整审计：

- mock 状态栏、mock 手势条和设备外壳是否已剥离。
- 阶段 2 固定画板宽高和绝对坐标是否已处理。
- 设计稿顶部 y 是否错误叠加真实 safeTop。
- mock 手势条高度是否错误叠加真实 safeBottom。
- 最终主布局是否仍依赖固定画板尺寸。

其它小节引用 8.8 结果，不得重新扫描完整坐标转换清单。

读取 `system-ui-coordinate-normalization.json`、阶段 2 骨架、design-doc、最终页面源码和参考截图，执行坐标归一化审计。

以下任一情况必须判为 `critical` 或 `major`：mock 状态栏/手势区坐标与真实 safe area 双重叠加；固定画板高度控制主布局；来源不明的大额 top/bottom padding；底部 spacer 与 safeBottom 重复；报告声明已归一化但源码仍保留原始绝对坐标。

### 统一评级与问题归属

阶段 8 的每一项审计都必须给出 `pass | critical | major | minor` 等级。同一个缺陷只能由一个主审计项评级。

| 缺陷 | 主审计项 | 其它小节处理方式 |
|---|---|---|
| 关闭全屏以解决重叠 | 8.4 | 8.5 引用 |
| TitleBar 与状态栏重叠 | 8.5 | 8.4/8.6 引用 |
| 底部出现白边 | 8.6 | 8.4 引用 |
| px 当 vp 使用 | 8.7 | 8.4/8.5 引用 |
| mockStatusBar + safeTop | 8.8 | 8.5 引用 |
| 固定 360×792 主布局 | 8.8 | 8.3 引用 |

引用项不得再次创建第二个独立 finding 或问题 ID，但必须传播阻断状态：

```text
status: blocked-by
blockedBy: <primaryIssueId>
```

报告可以说明连带影响，但必须指向主问题编号。只要主问题仍为 `critical` 或 `major`，所有 `blocked-by` 小节和阶段 8 整体均不得报告 PASS。修复主问题后，必须重新执行主审计及所有引用该问题的小节，不能只把主问题等级改为 `pass`。

任一审计存在 `critical` 或 `major` 时，必须先修复并重跑阶段 8，不得进入阶段 9。

## 子 Agent 执行指令

⚠️ 本步骤默认通过 task 工具委托给 general 类型子 agent 执行。

调用参数：

```yaml
subagent_type: "general"
description: "阶段 8: 代码质量、构建、HDS 和系统 UI 沉浸式审计"
prompt: 见下方任务模板
```

```text
## 任务：08 - 完成质量检查与构建

路径与加载约定：本模板中的 `references/…` 路径相对本 skill 安装根目录（入口 skill：`hmos-design-to-arkts`，安装于 `~/.local/share/deveco/skills/hmos-design-to-arkts/`）。能力不是注册 skill：不得调用 skill 工具加载能力，用文件读取工具打开指定 INSTRUCTIONS.md 并全文执行。模板中的输入名与 `<designToArktsRunDir>` 等占位符由父 Agent 替换为实际值后发送；若你收到未替换的占位符，按缺失输入立即终止并向父 Agent 返回报告。
"ArkTS 代码质量 skill" 是注册 skill，经 skill 工具加载；当前无可用质量 skill 时，立即终止并向父 Agent 返回 blocked 报告，不得手写检查、普通搜索或经验判断冒充。
你是 ArkTS 质量、HDS 和系统 UI 沉浸式审计 agent。必须加载可用 ArkTS 代码质量 skill；如果 hdsRequired=true 或设计文档要求 HDS，加载能力 `hmos-d2a-arkui2hds`（注册表 → references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md），并完整执行。

输入：
- project_root_path
- final_code_paths
- design_doc_path
- startup_page_policy_path
- hds_decision_path
- system_ui_policy_path
- viewport_boundary_spec_path
- repo_understand_report_path
- requirement_clarification_path
- stage4_selected_practices_path
- stage6_implementation_report_path
- image_assets_manifest_path
- ledger_path

步骤：
1. 向 ledger 追加代码质量 skill invoked 条目：`{ "skill": "<实际使用的质量 skill 名>", "status": "invoked" }`；外部 skill 条目 JSON 键固定为 "skill"（能力条目用 "capability"），不得改用其他字段名。ledger 文件整体为 JSON 数组（每项一条调用记录，禁止 `entries` 等对象包裹；文件不存在时先创建 `[]` 再追加）。
2. 先收集共享证据索引（源码路径、EntryAbility 路径、路由和目标身份、运行截图和稳定性证据、背景/前景/安全区消费层源码位置、safe area 来源和赋值点、mock 转换清单）。
3. 按 8.1～8.8 各审计项的唯一职责执行检查；每项事实只由一个主审计项评级，其它小节引用结论并使用 blocked-by 传播阻断。
4. 读取 hds-decision.json 和 design-doc.md；hdsRequired=true 或设计文档要求 HDS 时，向 ledger 追加 hmos-d2a-arkui2hds invoked 条目并执行 HDS 转换/审计。
5. 检查 HDS requiredComponents 和设计文档要求的 HDS 组件是否全部实际 import、使用并通过构建；未实现不得通过。
6. 执行构建/类型检查，失败则修复并重跑。
7. 所有审计按统一评级规则判定；存在 `critical` 或 `major` 时不得进入阶段 9。
8. 按 8.1～8.8 顺序写入 stage8-quality-audit.md、hds-audit.json 和 stage8-build-report.md。
9. 更新 ledger。
```

## 必需产物

- `<designToArktsRunDir>/stage8-quality-audit.md`，开头为共享证据索引，随后包含"代码质量""HDS""几何布局""系统 UI 沉浸""顶部安全区碰撞""视口边界""安全区单位""系统 UI 坐标归一化"各独立小节。每项至少包含 `status`、`severity`、`blockedBy`、`contractSource`、`evidence`、`affectedSource`、`finding`、`requiredFix`、`referencedBy`。
- `<designToArktsRunDir>/hds-audit.json`
- `<designToArktsRunDir>/stage8-build-command.json`
- `<designToArktsRunDir>/stage8-build-report.md`

## 完成条件

### 通过条件

- 构建/类型检查通过。
- 所有审计均无 `critical` 或 `major`。
- HDS 审计完成：`hdsRequired=true` 时所有 requiredComponents 已实际 import、使用并通过构建；`hdsRequired=false` 时已记录决策来源。

### 阻塞或失败条件

- 阶段 8 构建不通过。
- HDS 审计不通过。
- 几何审计存在 critical/major。
- 系统 UI 沉浸式审计存在 critical/major。
- top-overlap 审计存在 critical/major。
- edge-band 审计存在 critical/major。
- safe-area-unit 审计存在 critical/major。
- coordinate-normalization 审计存在 critical/major。
- HDS required 但未实现。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 8 --result passed
```

无法继续时，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 8 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。

## 禁止事项

- 无可用质量 skill 时不得用手写检查、普通搜索或经验判断冒充。
- 不得以"兼容性风险""未声明依赖""标准 ArkUI 足够"、仅凭 API 版本推断"不支持"或未尝试 import/构建为由降级为标准 ArkUI。
- 不得在阶段 8 重新自行判断（`hdsRequired=false` 时记录决策来源即可）。
- 不得用代码审查、设计稿截图或其它页面截图替代运行截图。
- 不得只依赖页面级 `expandSafeArea`。
- 不得在同一缺陷上创建多个独立 finding 或问题 ID。
- 不得在被 `blocked-by` 主问题时报告 PASS。
- 任一审计存在 critical/major 时，不得进入阶段 9。
