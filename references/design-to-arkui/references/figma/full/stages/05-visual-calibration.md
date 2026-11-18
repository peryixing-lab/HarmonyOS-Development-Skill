# 05 - 视觉还原度校准

## 阶段元数据

- id: 05
- title: 05 - 视觉还原度校准
- variant: full
- designSource: figma
- instruction: references/figma/full/stages/05-visual-calibration.md
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

根据 `<designToArktsRunDir>/requirement-clarification.json` 中的 `visualCalibration` 配置选择执行分支：

- `visualCalibration.enabled=false`：跳过视觉校准，只生成 skipped 报告。
- `visualCalibration.enabled=true` 或字段不存在：调用 `hmos-d2a-arkui-scoring-workflow`，通过“评分发现问题 → 修改实现 → 构建部署 → 重新截图评分”改善页面还原度。首次评分建立基线，后续评分验证实际修改。最多进行 `maxRounds` 次有效评分，不要求凑满轮数上限；达标或达到次数上限时汇总结果，无法继续时按现有流程报告 blocked。

两个分支都不得在阶段开始、轮次之间或阶段结束前询问用户是否继续。

## 必需输入

- Controller 已将当前阶段推进到阶段 5，阶段 4 已完成。
- `<designToArktsRunDir>/requirement-clarification.json`。
- 启用视觉校准时，还必须具备：
  - 本地设计稿或参考图路径；
  - ArkTS 工程路径；
  - 目标页面、路由、预览页或启动入口；
  - 系统 UI 策略或顶部、底部忽略区域配置；
  - 可用的 ArkUI、DevEco、模拟器、预览器或设备工具；
  - `<designToArktsRunDir>/capability-invocation-ledger.json`。

## 分支一：禁用视觉校准

当 `visualCalibration.enabled=false` 时：

1. 不加载或调用评分能力，不执行评分、图片对比或修复。
2. 写入 `<designToArktsRunDir>/stage5-visual-calibration-report.json`：

```json
{
  "status": "skipped",
  "reason": "visualCalibration.disabled",
  "roundsCompleted": 0
}
```

3. 直接进入“阶段完成”部分。

跳过分支不得要求 `capabilityInvocations`、`rounds`、评分产物、`completionReason` 或校准 checks。

## 分支二：执行视觉校准

当 `visualCalibration.enabled=true` 或字段不存在时，按以下顺序执行：

1. 读取 `visualCalibration.scoreThreshold`；字段不存在时使用默认值 `80`。读取 `visualCalibration.maxRounds`；字段不存在时使用默认值 `5`。
2. 校验启用分支的全部必需输入。缺少输入时停止，不得用人工目测或自然语言评分替代。
3. 在任何评分脚本、图片对比或 `compare_images` 调用前，向 `<designToArktsRunDir>/capability-invocation-ledger.json` 追加：

```json
{
  "capability": "hmos-d2a-arkui-scoring-workflow",
  "status": "invoked"
}
```

4. 加载能力 `hmos-d2a-arkui-scoring-workflow`（注册表 → references/capabilities/hmos-d2a-arkui-scoring-workflow/INSTRUCTIONS.md），并完整执行，传入本阶段必需输入、评分阈值和轮数上限。只读取能力文件、只提及能力名称或直接调用内部评分脚本都不算执行。
5. 由 `hmos-d2a-arkui-scoring-workflow` 按其流程负责构建和部署应用、启动应用并进入目标页面、确认页面稳定后使用 `hdc` 保存实际截图；修复后重新执行这些动作，再进行评分。找不到 `hdc` 且已配置 `DEVECO_HOME` 时，优先检查：
   - Windows：`${env:DEVECO_HOME}\sdk\default\openharmony\toolchains`
   - macOS：`$DEVECO_HOME/sdk/default/openharmony/toolchains`
6. 每次评分由 `hmos-d2a-arkui-scoring-workflow` 加载能力 `hmos-d2a-ui-reconstruction-score`（注册表 → references/capabilities/hmos-d2a-ui-reconstruction-score/INSTRUCTIONS.md），并完整执行，返回评分和最多三个可操作问题。评分子能力只评估本次输入，不修改代码，也不自行开始下一轮。每次评分仍按原有要求：
   - 在评分前记录带轮次的 `status=invoked` 调用；
   - 使用独立截图和独立输出目录；
   - 独立生成并成功解析 `score.json` 和 `metrics.json`；
   - 由评分子能力对本轮参考图和实现截图调用 `compare_images`，读取结果并综合返回评分和 0—3 个可操作问题；
   - 产物有效且本轮对比与分析全部完成后，才把该轮调用更新为 `status=completed`，随后进入第 7 步。
7. 第 6 步的完整评估完成后读取该轮 `score.json` 的 `aggregate.final_baseline_score`，按以下顺序决定下一步：
   - 达到评分阈值：以 `completionReason=score-threshold-reached` 结束，不再修改代码。
   - 未达到阈值且当前轮次小于 `maxRounds`：先由父能力阅读问题并检查相关源码，选择 1—3 个可操作问题实际修复；随后重新构建、部署、进入相同目标页面和状态、重新截图，再调用下一轮评分。具体动作遵循父能力的“下一轮准入”。没有实际修改时，不得直接重新评分。
   - 第 `maxRounds` 次有效评分仍未达到阈值：以 `completionReason=max-rounds-reached` 结束，汇报残留问题；不追加下一轮评分，不在最后一次评分后留下新的未验证修改。
   - 无法确定有效修复或无法完成构建、部署、截图时：先定位具体原因；仍无法继续则按本阶段已有 blocked 流程停止。不把未执行的评分计为完成，不为凑满轮数上限而重复评分。
8. 仅在达标或完成第 `maxRounds` 次有效评分后，将 `<designToArktsRunDir>/capability-invocation-ledger.json` 中父能力的调用记录更新为 `status=completed`，按原有格式汇总并写入 `<designToArktsRunDir>/stage5-visual-calibration-report.json`。阻塞时不得把父能力标为 completed，也不得使用 `max-rounds-reached` 代替阻塞原因。汇报时区分“本轮实际验证的修改”和“下一步计划修改的内容”，不把建议当作已完成动作。

不得增加超出 `maxRounds` 的评分轮次。`compare_images` 是评分子能力内每轮必做的视觉分析步骤；只能在本轮已加载该能力后执行，不参与最终脚本分数，也不能单独代表任一级能力已完整执行。即使脚本分数已达标或初步观察没有明显问题，也先完成本轮对比和分析，再决定结束；问题列表允许为空。遗漏或失败按评分子能力的“本轮未完成时”处理，无法继续则沿用本阶段 blocked 流程，不把未完成轮次计为有效评分。

## 必需产物

### 禁用分支报告

`stage5-visual-calibration-report.json` 必须包含：

- `status: "skipped"`
- `reason: "visualCalibration.disabled"`
- `roundsCompleted: 0`

### 启用分支报告

`stage5-visual-calibration-report.json` 必须包含：

- `status: "completed"`；
- `roundsCompleted`：1 至 `maxRounds` 的整数；
- `completionReason`：`score-threshold-reached` 或 `max-rounds-reached`；
- `capabilityInvocations`；
- `rounds`；
- `checks`。

`capabilityInvocations` 必须包含：

- 一条 `{ "capability": "hmos-d2a-arkui-scoring-workflow", "status": "completed" }`；
- round 1 至 `roundsCompleted` 各一条 `{ "capability": "hmos-d2a-ui-reconstruction-score", "round": N, "status": "completed" }`。

`rounds` 必须包含 round 1 至 `roundsCompleted` 的连续记录。每条记录至少包含：

- `round`；
- `score`，其值必须等于该轮脚本文件中的 `aggregate.final_baseline_score`。子能力的分析 `overall` 不作为阶段阈值或结束原因的依据，不覆盖脚本产物；
- `scoreJson` 和 `metricsJson`，使用相对 `<designToArktsRunDir>` 的路径，解析后不得越出运行目录；
- 本轮评分摘要、问题摘要和修复摘要。修复摘要描述本轮评分实际验证过的修改；Round 1 标明“基线，无前置修复”。下一步准备修改的内容单独叙述，不写成已经完成的修复。

`checks` 必须将以下项目设为 `true`：

- `hmos-d2a-ui-reconstruction-score-invoked`
- `score-artifacts-present`
- `no-direct-compare-images-bypass`
- `calibration-completed`

结束原因必须与最后一轮证据一致：

- `score-threshold-reached`：最后一轮 `score` 大于或等于评分阈值；
- `max-rounds-reached`：`roundsCompleted=maxRounds`，且第 `maxRounds` 轮 `score` 仍低于评分阈值（`maxRounds` 缺省 5）。

报告写入路径：`<designToArktsRunDir>/stage5-visual-calibration-report.json`。

## 阶段完成

Controller 是否允许 `--result passed`，按当前分支判断：

- 禁用分支：skipped 报告满足对应格式。
- 启用分支：completed 报告满足全部调用、轮次、评分产物、结束原因和 checks 要求。
- 当前分支任一必需条件不满足：不得请求 `passed`；先修复证据，无法继续时将阶段设为 `blocked`。

满足当前分支的全部完成条件后，调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsRunDir> --stage 5 --result passed
```

无法继续时，根据原因选择稳定 reason code：

- 构建失败：`build_failed`
- 评分能力或必需的 `compare_images` 工具不存在或不可用：`dependency_unavailable`
- 必需输入无效：`invalid_input`
- 参考图、截图或其它资源缺失：`missing_asset`
- 能力、评分脚本或 `compare_images` 执行失败：`external_tool_failed`
- JSON、报告或评分证据缺失、无法解析或不一致：`evidence_invalid`

然后调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsRunDir> --stage 5 --result blocked --reason-code <stable_reason_code>
```

Gate 由 Controller 自动生成。不得自行创建、修改或覆盖 stage gate。

## 允许返工范围

阶段 5 尚未完成时，可以保持 `currentStage=5`，修正阶段 2 至 4 产生的实现或业务产物，然后重新构建、部署、进入相同目标页面和状态、重新截图和评分。不得直接修改 `workflow-state.json`，也不得自行把 `currentStage` 回退到之前的阶段。

## 禁止事项

- 不得降级为直接图片对比、人工目测或自然语言评分。
- 不得在本阶段使用 `verify_ui` 工具替代评分工作流。
- 不得只使用 `compare_images`，或只执行 `hmos-d2a-ui-reconstruction-score`，而不完整执行 `hmos-d2a-arkui-scoring-workflow`。
- 不得在评分采样期间修改页面代码。
- 不得复用上一轮的截图、`score.json` 或 `metrics.json` 伪造新轮次。
- 不得为了提高评分而关闭全屏或沉浸式配置、伪造系统栏或掩盖安全区问题。
- 不得询问是否继续、是否结束或是否进入下一阶段，也不得追加第 6 轮。
