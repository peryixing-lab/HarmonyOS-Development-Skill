# 07 - 补全 ArkTS 交互逻辑

## 阶段元数据

- id: 07
- title: 07 - 补全 ArkTS 交互逻辑
- variant: full
- designSource: pixso
- instruction: references/pixso/full/stages/07-complete-interaction-logic.md
- 子 Agent: 无

## 强制阶段入口 Todo 同步

在本阶段执行任何工作前：

1. 读取成功的 `stage-start` 调用返回的 `todoPayloadPath`。
2. 原样调用一次 `todowrite`，传入 `todo-payload.json.todos`，不得修改。
3. 不得翻译、摘要、重建、追加、删除或重排 Todo 项。
4. 不得运行 `status` 来准备本次同步；`stage-start` 已经刷新过 payload。
5. 只有 `todowrite` 成功后，才可以加载所需能力、查看项目文件、修改代码、构建、截图或发送阶段进度回复。

必须始终执行本次同步。不要试图判断 UI 是否已经包含相同的 Todo 列表。在阶段入口完整重放一次列表是有意为之且幂等的。

## 目标

在阶段 6 静态页面基础上补齐状态、事件、导航、异常流程和运行时系统 UI 行为，确保交互逻辑完整且首帧布局稳定。

阶段 7 负责交互、异步状态和运行时稳定。阶段 7 不重新审计阶段 6 的静态结构。只有本阶段新增或修改的运行时逻辑会影响布局时，才必须重新检查受影响的契约项并记录源码位置。

## 必需输入

- 阶段 6 最终源码和 `stage6-implementation-report.md`。
- 阶段 5 权威产物：`design-doc.md`、`component-tree.md`、`system-ui-policy.json`、`viewport-boundary-spec.json`、`system-ui-coordinate-normalization.json`、`safe-area-unit-contract.json`。
- `hmos-d2a-arkts-logic-completer`。

## 执行步骤

加载能力 `hmos-d2a-arkts-logic-completer`（注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md），并完整执行。

补全范围：

- `@State`、`@Prop`、`@Link`、`@Provide`、`@Consume` 或项目既有状态体系。
- 列表数据、mock 数据、选中态、收藏态、播放态、加载态、错误态、空态。
- 点击、切换、输入、滑动、刷新、播放、收藏、路由跳转、弹窗。
- 动效、转场、组件联动和异常流程。
- ArkTS 语法合规：类型、ForEach key、对象展开限制、struct 限制、回调类型。

### 运行时系统 UI 检查

阶段 7 不重新审计阶段 6 的静态结构。只有本阶段新增或修改的运行时逻辑会影响布局时，才必须重新检查受影响的契约项并记录源码位置。

对系统 UI 只检查以下运行时内容：

- 异步安全区值是否在首次有效值后保持有效。
- 后续回调（`getWindowAvoidArea()`、`avoidAreaChange`、AppStorage/State 同步）是否可能把有效值覆盖为 `0` 或无效值。
- 运行时显示/隐藏的标题栏、浮层、底栏是否仍服从阶段 5 契约。
- 路由切换后是否仍命中正确页面并完成稳定布局。
- 数据和资源加载完成前是否会被阶段 8/9 截图。
- 本阶段新增的 padding/offset/position 是否引入重复 safe area 消费。

### 运行时安全区赋值链补全

如果使用 `setWindowLayoutFullScreen(true)`、沉浸式系统栏或 `expandSafeArea(TOP)`：

- 必须检查所有 `getWindowAvoidArea()`、`avoidAreaChange`、AppStorage/State 同步赋值点，处理首帧/异步返回 `0` 或无效值的情况。
- 不得让任何后续赋值把有效避让覆盖成 `0` 后决定标题栏、返回按钮、搜索框、卡片、头像或列表首项的顶部位置。
- `immersiveRequired=true` 时必须保留窗口级沉浸和系统栏透明/同色配置。
- 固定兜底高度只能作为最后防线。
- 不得把"框架标题栏会自动避让"当成实现证据；必须在源码中指出 TitleBar 所在前景层与 expand 背景层不是同一侵入系统区的容器，或给出真实截图证明 TitleBar 完全低于状态栏。

### 首帧稳定补全

视觉还原度校准和截图前，必须确保：

- 路由命中目标页。
- 图片资源加载完成。
- 首屏数据渲染完成。
- 安全区有效值已生效并完成一次稳定布局。
- 不得在 `safeTop/safeBottom=0` 的首帧截图。

## 必需产物

输出 `<designToArktsRunDir>/logic-completion-report.md`，其中必须包含 `systemUiRuntimeCompletion`、`viewportBoundaryRuntimeCompletion`、`topViewportRuntimeCompletion`、`safeAreaConsumptionChainCompletion`、`safeAreaUnitRuntimeCompletion`、`coordinateNormalizationRuntimeCompletion` 和 `layoutStableBeforeScreenshotCompletion` 小节。

每节只写运行时结果和证据。对于纯静态、阶段 7 未改变的项目，允许记录：

```text
status: inherited-from-stage6
evidence: <stage6 report section/source location>
runtimeMutation: none
```

不得为了填满报告而重新复制阶段 6 的全部说明。若无法指出最终源码位置和赋值链，不得写 PASS。

## 完成条件

### 通过条件

- `logic-completion-report.md` 已写入，且包含 `systemUiRuntimeCompletion`、`viewportBoundaryRuntimeCompletion`、`topViewportRuntimeCompletion`、`safeAreaConsumptionChainCompletion`、`safeAreaUnitRuntimeCompletion`、`coordinateNormalizationRuntimeCompletion` 和 `layoutStableBeforeScreenshotCompletion` 小节。

### 阻塞或失败条件

- `hmos-d2a-arkts-logic-completer` 缺失、不可用或无法读取其 `INSTRUCTIONS.md`/必要 references。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 7 --result passed
```

无法继续时，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 7 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。

## 禁止事项

- 若无法指出最终源码位置和赋值链，不得写 PASS。
- 不得重新审计阶段 6 的静态结构。
- 不得通过关闭 `setWindowLayoutFullScreen`、移除窗口级沉浸或恢复系统栏默认背景来修复顶部重叠。
- 不得让后续赋值把有效安全区避让覆盖成 `0`。
- 不得把"框架标题栏会自动避让"当成实现证据。
