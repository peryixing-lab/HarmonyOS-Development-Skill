# 10 - 总结

## 阶段元数据

- id: 10
- title: 10 - 总结
- variant: full
- designSource: pixso
- instruction: references/pixso/full/stages/10-summary.md
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

完成工作流总结，写入完整性报告并向用户汇报。

## 必需输入

- 阶段 1 至阶段 9 的 gate 均已通过（`status=passed`）

## 执行步骤

写入 `<designToArktsRunDir>/completeness-report.md`，并向用户简洁汇报：

- 输入来源和 DSL 路径。
- 阶段 2 pixso-arkts 代码、imageIds、资源下载和集成编译结果。
- repo-understand、最佳实践、hmos-d2a-solution-design、组件树确认结果。
- 最终代码文件、资源文件、路由变更。
- 启动页策略：`EntryAbility → pages/Index 稳定导航壳 → 已注册页面` 链路、本次页面注册位置、历史页面保留情况及默认页前后值。
- HDS 决策和 HDS 审计结果。
- 构建结果。
- 视觉还原度校准 1 至 `maxRounds` 轮结果（或禁用时的 skipped 结果）、问题、问题等级和修复动作摘要。
- 已知残留风险。

## 必需产物

`<designToArktsRunDir>/completeness-report.md`

## 完成条件

### 通过条件

Controller 接受 `--result passed` 的条件：

- 所有前序阶段（1-9）已完成。
- `completeness-report.md` 已生成且非空。


以下业务条件是阶段 10 生成总结报告时的检查清单，不是 gate 前置条件，也不是 `status=completed` 的输入：

- 阶段 1 实例解绑 DSL 获取完成并保存到当前运行目录。
- 阶段 2 已运行 `call-pixso-arkts.mjs` 单 DSL 脚本，生成 `.ets`、`.imageIds.json`、`.raw.json`、`.result.json` 和运行 manifest，资源已下载/补齐，代码已集成原项目并编译通过。
- 阶段 3 hmos-d2a-repo-understand 已执行并有 ledger 证据。
- 阶段 4 hmos-d2a-arkui-component-best-practices 已执行。
- 阶段 5 hmos-d2a-solution-design 已执行，组件树已由用户确认，且已生成 `system-ui-coordinate-normalization.json` 和 `safe-area-unit-contract.json`。
- 阶段 6 承接审计证明未丢弃阶段 2 骨架，且坐标归一化和安全区单位契约已落入最终源码。
- 阶段 6 启动页策略已落地：`EntryAbility` 和 `main_pages.json` 仍以 `pages/Index` 为启动入口，Index 是稳定导航壳，本次独立目标组件已注册且未声明冲突的启动 `@Entry`；首次运行已设置合理默认页，后续运行未覆盖历史页面或静默改变默认页，模板 Hello World 不再作为默认内容显示。
- 阶段 7 hmos-d2a-arkts-logic-completer 已执行。
- 阶段 8 代码质量、HDS 检视、构建、几何审计、系统 UI 沉浸式审计、top-overlap、edge-band、safe-area-unit 和 coordinate-normalization 审计通过。
- 阶段 9 已严格使用 `hmos-d2a-arkui-scoring-workflow`，完成视觉校准（1 至 `maxRounds` 轮结果，评分达 `visualCalibration.scoreThreshold` 提前结束或达到轮数上限 `visualCalibration.maxRounds`（默认 5）；或 `visualCalibration.enabled=false` 时 skipped）。
- 阶段 10 总结已写入。

`status=completed` 是 `stage-complete` 的结果，不是阶段 10 的输入或 gate 前置条件。

### 阻塞或失败条件

- 任一前序阶段 gate 未通过（`status` 不为 `passed`）。
- `completeness-report.md` 缺失或为空。

满足全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <runDir> --stage 10 --result passed
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

### 允许返工范围

保持当前 `currentStage` 不变，可以修正前序阶段产生的实现或业务产物，然后重新执行当前阶段检查。不得直接修改 `workflow-state.json`，也不得重新调用旧阶段的 `stage-start`。
## 禁止事项

- 不得在所有 gate 未 `passed` 时标记 `completed`。

## 强制最终 Todo 同步

在最终 `stage-complete` 成功后：

1. 要求 `nextRequiredAction` 等于 `sync_final_todo_then_finish`。
2. 读取返回的 `todoPayloadPath`。
3. 原样调用一次 `todowrite`，传入 `.todos`，不得修改。
4. 校验每个提交的 Todo 项状态均为 `completed`。
5. 只有 `todowrite` 成功后，才可以发送最终完成回复。
