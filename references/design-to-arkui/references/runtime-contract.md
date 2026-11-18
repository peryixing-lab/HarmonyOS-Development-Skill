# 运行时契约

## 目录

- [单一状态源](#单一状态源)
- [按阶段渐进加载](#按阶段渐进加载)
- [整体版本保护](#整体版本保护)
- [Controller 操作](#controller-操作)
- [用户确认流程](#用户确认流程)
- [Todo 处理](#todo-处理)
- [恢复规则](#恢复规则)
- [Gate 格式](#gate-格式)
- [需求澄清证据](#需求澄清证据)
- [Figma run-index 语义](#figma-run-index-语义)
- [运行时文件结构](#运行时文件结构)
- [禁止事项](#禁止事项)

## 单一状态源

只有 `workflow-state.json` 能决定：

- 当前设计来源（Pixso 或 Figma）；
- 当前 variant；
- 当前阶段；
- 已完成阶段；
- 当前是否等待用户确认；
- 工作流是否阻塞或完成。

Todo、回复文本、compaction 摘要、阶段 Markdown 和 gate 都不得覆盖运行状态。不得创建第二个权威状态文件。

## 按阶段渐进加载

Agent 在开始某阶段前必须执行 `stage-start`。正常阶段执行只有 `stage-start` 返回 `ready: true` 后才能读取其 `instructionPath`。恢复确认交互时，`status` 返回 `resume_confirmation`，只能恢复原确认问题；中段确认已通过但阶段尚未完成时，`status` 返回 `resume_confirmed_stage`，只能依据阶段内部 checkpoint 继续余下实现。两种恢复动作都可以读取 `status.instructionPath`，但都不能重跑阶段入口、重复同步 Todo 或重做已完成产物。

禁止：

- 初始化后批量读取全部阶段文件；
- 根据阶段编号自行拼接文件路径；
- 提前读取下一阶段；
- 同时读取 Full 和 Fast 阶段；
- 同时读取 Pixso 和 Figma 阶段；
- 依赖对旧 monolithic workflow 的记忆执行阶段。

阶段文件不需要互相链接。跨阶段数据必须从运行产物、gate 或 workflow-state 读取。

## 整体版本保护

初始化时对当前 variant 的完整指令集合（catalog 文件、runtime contract、所有阶段指令文件）计算一个 `workflowDigest`，写入 `workflow-state.json`。

每次 `status`、`stage-start`、`confirm` 和 `stage-complete` 前重新计算摘要：

- 摘要相同：继续执行。
- 摘要不同：阻塞，输出 `workflow_digest_mismatch`，要求重新初始化本次工作流。不得自动更新状态中的摘要、自动采用新版阶段文件或自动迁移已完成阶段。

## Controller 操作

Controller 脚本路径：`<designToArktsSkillRoot>/scripts/workflow.mjs`。

### init

```text
node scripts/workflow.mjs --mode init --source pixso|figma|mastergo --variant full|fast --run-dir <runDir>
```

校验设计来源、variant 和对应 catalog，校验所有阶段文件存在且路径未越界，计算 `workflowDigest`，创建 `stage-gates/`，创建 `workflow-state.json`（当前阶段为 1），生成初始 Todo payload。省略 `--source` 仅为旧 Pixso 调用兼容，默认 `pixso`；新调用必须显式传入。返回 `nextRequiredAction: stage_start`，不要求立即调用 `todowrite`。

如果运行目录已存在有效状态，拒绝覆盖。

### status

```text
node scripts/workflow.mjs --mode status --run-dir <runDir>
```

读取状态并锁定 `designSource + variant`，校验状态 schema 和阶段连续性，重新计算并比较 `workflowDigest`，校验已完成阶段的 gate，返回当前阶段、状态和重建的 Todo payload。缺少 `designSource` 的旧状态仅按 `pixso` 兼容；不得在恢复时重新从 URL 推断。该操作不得修改正常状态。

`status` 按状态返回下一动作：

| 当前状态 | `nextRequiredAction` | 附加字段 |
|---|---|---|
| `running`（当前阶段有 pending Gate） | `stage_complete` | `completionResult`，blocked 时附 `reasonCode` |
| `running`（当前阶段已确认） | `stage_complete` | `completionResult=passed` |
| `running`（已确认且 `confirmationContinuesStage=true`） | `resume_confirmed_stage` | `instructionPath` |
| `running`（其它） | `stage_start` | 无 |
| `completed` | `sync_final_todo_then_finish` | `todoPayloadPath` |
| `blocked` | `resolve_blocking_issue` | `blockedReasonCode` |
| `awaiting_confirmation`（合法 pending blocked Gate，state 未推进） | `stage_complete` | `completionResult=blocked`，`reasonCode` |
| `awaiting_confirmation`（无 pending Gate 或合法 pending passed Gate） | `resume_confirmation` | `awaitingConfirmationFor`，`instructionPath` |

"当前阶段有 pending Gate"定义为：当前阶段不在 `completedStages` 中，且已存在 canonical Gate（`stage` 匹配、`status` 为 `passed` 或 `blocked`）。这表示 Gate 写入后、state 推进前发生中断。此时 Agent 应根据 `completionResult` 重放 `stage-complete`，不应重新 `stage-start`。该重放分支以表格允许的状态为限：等待确认时存在 pending passed Gate 不得绕过用户确认，仍按 `resume_confirmation` 恢复确认问题。

"当前阶段已确认"定义为：catalog 当前阶段 `requiresConfirmation=true` 且 `confirmedStages` 包含 `currentStage`。普通确认阶段直接 `stage-complete`。`confirmationContinuesStage=true` 时确认只是中段门禁，必须按 `resume_confirmed_stage` 继续原阶段实现；不得重新 `stage-start` 或再次同步 Todo。

当 `nextRequiredAction=stage_complete` 时，Agent 必须读取 `completionResult`：
- `passed` → `stage-complete --result passed`
- `blocked` → `stage-complete --result blocked --reason-code <reasonCode>`

如果当前阶段 Gate 存在但不满足 canonical 结构（stage 错误、status 非法或 reasonCode 非法），返回 `current_stage_gate_invalid` 错误，不返回 `stage_start`，也不覆盖 Gate。Figma 与 Pixso 一致：非终态（`running`、`awaiting_confirmation`）当前 Gate 无效时，`status` 返回非零退出码、`error=current_stage_gate_invalid` 和具体 `issues`，不返回正常下一动作，也不覆盖 Gate、state 或 Todo 文件。

`awaiting_confirmation` 恢复时返回当前阶段 `instructionPath`，但不得把该读取当作一次新阶段入口，也不得再次调用 `todowrite`。

### stage-start

```text
node scripts/workflow.mjs --mode stage-start --run-dir <runDir> --stage <N>
```

校验状态和摘要，拒绝 `blocked`、`completed` 或 `awaiting_confirmation` 状态，校验请求阶段等于 `currentStage`，校验所有前置阶段连续完成且 gate 通过。

如果当前阶段已确认，返回 `ready=false`。普通确认阶段返回 `stage_complete`；中段确认阶段返回 `resume_confirmed_stage`，防止重新加载阶段与重复 Todo 同步。

如果当前阶段有 pending Gate（Gate 已写但 state 未推进），返回 `ready=false`、`nextRequiredAction=stage_complete`、`completionResult` 和（blocked 时）`reasonCode`。

如果当前阶段 Gate 存在但不满足 canonical 结构，返回 `current_stage_gate_invalid` 错误。

成功输出：

```json
{
  "ready": true,
  "nextRequiredAction": "load_instruction_then_sync_todo_then_run_stage",
  "stage": 5,
  "title": "05 - 设计方案与组件树确认（需人工确认）",
  "requiresConfirmation": true,
  "instructionPath": "references/pixso/full/stages/05-design-and-confirm-component-tree.md",
  "todoPayloadPath": "<runDir>/todo-payload.json"
}
```

`ready: true` 时刷新 `todo-payload.json` 并返回 `todoPayloadPath`。`ready: false` 时不刷新 payload、不返回 `instructionPath` 或 `todoPayloadPath`。

失败时返回 `ready=false`，且不返回 `instructionPath`。

### confirm

```text
node scripts/workflow.mjs --mode confirm --run-dir <runDir> --stage <N> --decision request|accepted|revision-requested
```

仅 catalog 中 `requiresConfirmation=true` 的阶段使用。Agent 不得直接修改 `workflow-state.json`；确认状态由 Controller 原子写入。

状态转换：

| decision | 前置状态 | 后置状态 | 其他动作 |
|---|---|---|---|
| `request` | `running` | `awaiting_confirmation` | 设置 `awaitingConfirmationFor=currentStage` |
| `accepted` | `awaiting_confirmation` | `running` | 清空 `awaitingConfirmationFor`，记录当前阶段到 `confirmedStages` |
| `revision-requested` | `awaiting_confirmation` | `running` | 清空等待字段，移除当前阶段确认记录，保持 `currentStage` 不变 |

`request` 必须在向用户展示确认问题前执行。用户要求修订后，先执行 `revision-requested`，再重新执行当前阶段的 `stage-start`。

`confirm` 按 decision 返回下一动作：

| decision | 后置状态 | `nextRequiredAction` |
|---|---|---|
| `request` | `awaiting_confirmation` | `await_user_confirmation` |
| `accepted`（普通确认阶段） | `running` | `stage_complete` |
| `accepted`（`confirmationContinuesStage=true`） | `running` | `resume_confirmed_stage` |
| `revision-requested` | `running` | `stage_start` |

普通确认阶段 `accepted` 后直接调用 `stage-complete --result passed`。中段确认阶段 `accepted` 后继续当前 reference 的实现与验证，全部完成后再调用 `stage-complete`。两种情况都不得重新 `stage-start` 当前阶段。

校验要求：

- 当前阶段在 catalog 中 `requiresConfirmation=true`。
- `--stage` 等于 `state.currentStage`。
- `request` 只能从 `running` 进入。
- `accepted` 和 `revision-requested` 只能从当前阶段的 `awaiting_confirmation` 进入。
- 所有 decision 前都会复核所有已完成阶段 gate。

### stage-complete

```text
node scripts/workflow.mjs --mode stage-complete --run-dir <runDir> --stage <N> --result passed|blocked
```

Agent 不再手工创建或修改 Gate。Controller 根据 `--result` 参数自动生成 canonical Gate 并推进状态。

参数校验：

- `--result` 只能是 `passed` 或 `blocked`。
- `result=passed` 时不得提供 `--reason-code`。
- `result=blocked` 时必须提供合法 `--reason-code`，取值为：`build_failed`、`dependency_unavailable`、`invalid_input`、`missing_asset`、`security_blocked`、`evidence_invalid`、`external_tool_failed`。
- 不得把 DSL 文本、工具原始输出或其它不可信长文本直接作为命令行 reason。详细信息写入现有阶段报告；Gate 只记录稳定 reason code。

passed 流程：

1. 校验当前 state、workflow digest 和已完成阶段 Gate。
2. 校验 `requestedStage === currentStage`（或进入幂等重放判断）。
3. 拒绝 `blocked`、`completed` 以及 passed 专属的 `awaiting_confirmation` 状态。
4. 需要确认的阶段必须已经记录在 `confirmedStages`；该确认要求仅约束通过。
5. 执行阶段特有确定性校验：Pixso Full 阶段 9 视觉校准证据、Figma Full 阶段 5 视觉校准证据；所有来源的阶段 1 必须存在合法需求澄清证据（见下）。
6. 构造 canonical passed Gate 并写入。
7. Figma 阶段 2 passed 时，由 Controller 在 Gate 之后、state 推进之前原子更新 run-index 当前记录（见 [Figma run-index 语义](#figma-run-index-语义)）。
8. 推进 `completedStages/currentStage/status`。
9. 原子写 `workflow-state.json`。
10. 重新生成 `todo-payload.json`。
11. 返回下一动作。

blocked 流程：

1. 完成通用 state、digest、当前阶段和前序 Gate 校验。
2. 校验 reason code。
3. 构造 canonical blocked Gate 并写入。
4. 将 state 设为 `status=blocked`、`blockedReasonCode=<reason code>`，并把 `awaitingConfirmationFor` 清为 null，表示不再等待用户确认。可以从 `running`（含尚未确认或已确认）或 `awaiting_confirmation` 报告当前阶段阻塞；不要求当前阶段已完成确认，也不要求当前阶段已生成成功产物。
5. 保持 `currentStage` 不变，不追加 `completedStages`；不追加 `confirmedStages`，保留历史确认记录和确认快照。
6. 重建 Todo payload。
7. 返回 `nextRequiredAction=resolve_blocking_issue`。

幂等重放：

- 如果 `requestedStage` 已在 `completedStages` 中，且对应 Gate 存在且为 `passed`：
  - 仅允许重放 `result=passed`。
  - 不得再次追加 `completedStages`，不得改变 `currentStage`。
  - 重建 Todo payload。
  - 返回 `alreadyCompleted=true` 和当前状态的正确下一动作。

Gate 冲突检测：

- Gate 不存在：原子写入 canonical Gate。
- Gate 已存在且语义与本次请求一致（stage、status、reasonCode 匹配，忽略 `completedAt` 差异）：视为前一次执行在写 state 前中断，保留首次 Gate 的时间戳，继续推进 state。
- Gate 已存在但 stage/status/reasonCode 冲突：返回 `gate_result_conflict`，不得覆盖。

两文件提交顺序：

```text
校验
→ 原子写 Gate
→ 原子写 workflow-state.json
→ 原子写 todo-payload.json
```

Gate 必须先于 state 写入，因为已推进的 state 不允许缺少对应 Gate。不宣称跨文件原子事务，通过幂等顺序写入恢复。

返回值：

- 非最终阶段 `passed`：返回 `nextRequiredAction: stage_start`，不指示立即调用 `todowrite`。
- 最终阶段 `passed`：返回 `nextRequiredAction: sync_final_todo_then_finish` 和 `todoPayloadPath`，要求最终同步。
- `blocked`：返回 `nextRequiredAction: resolve_blocking_issue`。

不允许批量完成多个阶段。普通 `stage-complete` 后不得调用 `todowrite`。

## 用户确认流程

需要用户确认的阶段（catalog 中 `requiresConfirmation=true`）采用以下状态转换：

```text
running
  -> confirm --decision request
awaiting_confirmation
  -> 用户确认 -> confirm --decision accepted
running（当前阶段已确认）
  -> stage-complete --result passed
下一阶段

用户要求修订：
awaiting_confirmation
  -> confirm --decision revision-requested
running
  -> stage-start
  -> 修订 -> confirm --decision request
awaiting_confirmation
```

Agent 不得直接修改 `workflow-state.json`。等待确认、接受、要求修订和 blocked 状态均由 Controller 原子写入。

Pixso Full 阶段 5 使用完成前确认；Figma Full 阶段 2 使用实现前中段确认；Fast 不需要确认。

确认阶段不得跳过：组件树不正确时停留修订；用户确认后调用 `stage-complete --result passed`，由 Controller 生成 Gate 并推进阶段。

异常出口：确认只授权通过，不是报告失败的前置条件。确认阶段在等待用户回复之前或期间发生真实失败（如依赖缺失、必需输入无效）时，可以从 `running` 或 `awaiting_confirmation` 调用 `stage-complete --result blocked --reason-code <code>` 记录阻塞，Controller 会清空 `awaitingConfirmationFor`。不得把正常等待用户回复当作失败，也不得借 blocked 自动接受确认。

## Todo 处理

不变量：

1. `workflow-state.json` 是事实来源，Todo 是可重建的 UI 投影。
2. `stage-start` 负责刷新阶段入口 payload。
3. 阶段 reference 负责在开始工作前调用一次 `todowrite`。
4. 普通阶段出口不更新 Todo。
5. 最终阶段出口额外更新一次 Todo。
6. 无法验证 UI 是否已经写入，因此不使用伪造的 acknowledge 机制。
7. 恢复后重新执行 `status → stage-start → 读取当前 reference → todowrite → 继续当前阶段`。

Todo 每次根据 catalog 和 state 动态生成：

```text
stage < currentStage  -> completed
stage = currentStage  -> in_progress
stage > currentStage  -> pending
workflow completed    -> 全部 completed
```

`todo-payload.json` 是临时便利文件，可随时从状态重新生成。Todo 同步失败不应篡改工作流状态；下次 `stage-start` 可以重新生成相同 payload。无需 acknowledge 握手。

预期调用次数：假设工作流共有 `N` 个阶段，每个阶段入口调用一次 `todowrite`（共 `N` 次），最终阶段完成后调用一次（共 `1` 次），整个工作流正常执行共 `N + 1` 次。禁止在普通阶段出口和下一阶段入口各调用一次。

## 恢复规则

恢复时执行 `status`，按返回的 `nextRequiredAction` 分流：

```text
running（当前阶段有 pending Gate 或已确认）:
  status -> 读取 completionResult
  -> passed: stage-complete --result passed
  -> blocked: stage-complete --result blocked --reason-code <reasonCode>

running（其它）:
  status -> stage-start -> 读取当前 reference -> todowrite -> 继续阶段

completed:
  status -> 读取 todoPayloadPath -> todowrite -> 最终回复

awaiting_confirmation:
  status -> 读取 completionResult
  -> blocked（当前阶段有合法 pending blocked Gate，state 未推进）:
     重放 stage-complete --result blocked --reason-code <reasonCode>
     （沿用原 Gate completedAt，完成 state 更新；不要求 confirm accepted 或 revision-requested 来解锁）
   -> 无 pending Gate 或合法 pending passed Gate: 恢复原确认问题 -> confirm accepted 或 revision-requested
      （普通阶段 accepted 后直接 stage-complete；中段确认 accepted 后 resume_confirmed_stage；都不重新同步 Todo；
       pending passed Gate 不得绕过用户确认）
  -> 当前 Gate 无效（stage 不匹配、reason 非法等）: 按 current_stage_gate_invalid 报错，不提示接受确认

running（中段确认已接受）:
  status -> resume_confirmed_stage -> 读取返回的 instructionPath
  -> 从阶段内部 checkpoint 继续，不 stage-start、不 todowrite

blocked:
  status -> 报告并解决 blockedReasonCode，不得静默恢复 running
```

允许：

- Todo payload 缺失时重新派生；
- Gate 已存在且语义一致时继续推进（幂等重放）。

必须阻塞：

- `workflow-state.json` 缺失或损坏；
- variant 无法确定；
- `completedStages` 不连续；
- `workflowDigest` 不匹配；
- 已完成阶段的必要 Gate 缺失或不是 `passed`；
- 当前状态明确为 `blocked`。

`blocked` 状态不会被自动改回 `running`。不要根据 gate 猜测并自动前进或回退状态。若需要人工修复，要求用户重新初始化。

## Gate 格式

Gate 由 Controller 根据 `stage-complete --result` 参数自动生成，Agent 不得创建、修改或覆盖。

成功 Gate：

```json
{
  "stage": 6,
  "status": "passed",
  "completedAt": "<controller-generated ISO timestamp>"
}
```

阻塞 Gate：

```json
{
  "stage": 6,
  "status": "blocked",
  "reasonCode": "build_failed",
  "completedAt": "<controller-generated ISO timestamp>"
}
```

Gate 路径由 Controller 内部 `gatePath(runDir, stage)` 生成：

```text
<runDir>/stage-gates/stageNN-gate.json
```

该路径不返回给 `stage-start`，也不要求 Agent 读取或写入。Gate 文件作为 Controller 内部的恢复与审计记录。

Controller 在 `stage-complete` 时根据 `--result` 决定推进或阻塞。阶段特有的确定性校验（Pixso Full 阶段 9 视觉校准报告、Figma Full 阶段 5 视觉校准报告）由 Controller 在生成 passed Gate 前保留执行。

## 需求澄清证据

`<runDir>/requirement-clarification.json` 由阶段 1 创建（Pixso、Figma、MasterGo一致），是后续阶段的需求输入源。阶段 1 `stage-complete --result passed` 前必须存在该文件，且通过最小结构校验：根值必须是非 null、非数组的 JSON 对象（JSON `null`、`false`、`0`、字符串和数组均拒绝）、`preCheckCompleted=true`、`designSource` 与当前 catalog 一致（Pixso 为 `pixso`、Figma 为 `figma`、MasterGo 为 `mastergo`）；`visualCalibration` 存在时必须是非 null、非数组的对象（字段不存在时跳过可选校验，`visualCalibration: null` 是类型错误），其 `enabled` 存在时必须为 boolean、`scoreThreshold` 存在时必须为有限 number；`enabled` 和 `scoreThreshold` 保持可选语义，默认启用与默认阈值行为不变。该文件在 `stage-start 1` 之前不要求存在，由阶段 1 执行过程生成；Controller 只验证证据，不生成、修复或回写该文件，也不为缺失字段补默认值。阶段 1 完成后，后续 `status`、`stage-start`、`confirm` 和 `stage-complete` 的 completed-stage 复核会持续校验该证据，文件被删除、损坏或根值/字段类型非法时按 completed-stage evidence 问题拒绝。字段定义与各阶段的补全职责以 `references/requirement-clarification.md` 为准。

## Figma run-index 语义

Full 运行维护 `.deveco/design-to-arkts/run-index.json`，Fast 运行维护 `.deveco/design-to-arkts-fast/run-index.json`，两个索引均由 Controller 维护；同一 variant 内 Figma 与 Pixso 共用同一索引，Full 与 Fast 不共用。当前运行的新增记录只由 `stage-complete 2 --result passed` 在写入 passed Gate 之后、推进 state 之前原子写入；Agent 只准备产物，不得在 Gate 生成前提前登记本次记录。Figma 阶段 1 `integrationSnapshot.runIndexFile` 必须与当前 variant 的索引路径一致，路径不匹配时按证据错误拒绝。

- 阶段 1 `integrationSnapshot.existingGeneratedPages/Routes` 表示本次运行开始前的历史状态，后续复核不会改写该快照。复核时先把"经过身份校验的当前运行记录"（`designSource=figma`、当前 `runId`、目标页面/组件/路由与 `startup-page-policy.json` 一致，且不在历史快照内）排除，再与快照比较；历史记录缺失、历史页面文件缺失、页面/组件/路由冲突、以及新运行 runId 与历史记录撞名均拒绝。
- 阶段 2 完成后，run-index 必须恰好包含一条当前运行记录；记录缺失、重复、整个索引缺失或 `pages` 结构损坏都是证据错误，不会退化成"没有历史页面"的通过状态。
- 记录中的 `contentSha256` 是阶段 2 注册时的内容证据。仅在"Gate 已写、索引已写、state 未推进"的恢复窗口内重放 `stage-complete 2` 时校验该哈希与当前文件一致；阶段 2 完成后的后续阶段允许正常编辑页面内容，不因旧哈希拒绝，也不在只读检查中刷新哈希。
- 恢复窗口按持久化状态识别：`currentStage=2`、`status=running`、阶段 2 未进入 `completedStages`，且存在 `stage=2/status=passed` 的 Gate（Full 还需阶段 2 已确认）。窗口内允许 0 或 1 条当前记录；Gate 缺失、阶段号错误或结果不是 passed 时不按恢复窗口放行，也不覆盖冲突 Gate。

## 运行时文件结构

```text
<runDir>/
├── workflow-state.json
├── todo-payload.json
├── stage-gates/
│   ├── stage01-gate.json
│   └── ...
└── (业务产物)
```

Full 运行目录为 `.deveco/design-to-arkts/runs/{runId}/`，Fast 运行目录为 `.deveco/design-to-arkts-fast/runs/{runId}/`。Pixso 使用 `scripts/pixso-arkts/`；Figma 使用 Anchor MCP 和能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md），两种来源通过 state 与 catalog 隔离。

## 禁止事项

- 不得创建 `workflow-manifest.json` 或逐阶段 instruction 证据。
- 不得创建 `todo-manifest.json` 或 `todo-state.json`。
- 不得使用 `restore -> todowrite -> acknowledge` 多阶段握手。
- 不得自动重建 manifest 或自动迁移已完成阶段。
- 不得在摘要不一致时自动更新状态中的摘要。
- 不得批量完成、预写或跳过后续 gate。
- 不得用自然语言总结、对话历史或 TodoList 状态替代 gate。
- `blocked` 状态不得由恢复逻辑静默改回 `running`。
- Pixso 不得删除或绕过 `Index.ets` 稳定启动入口；Figma 也不得生成竞争性独立 `@Entry` 壳，不得覆盖既有 Index/默认页，新页面必须以可导出 `@Component` 注册到 Index 或项目现有集中路由结构，并遵循能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md）的 Figma 编排输出契约。
- 不得用替代链路绕过当前来源的硬依赖：Pixso 固定脚本/Pixso MCP，Figma Anchor MCP/能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md）。
- Agent 不得自行创建、修改或覆盖 `stageNN-gate.json`。
- 不得把 DSL 文本、工具原始输出或其它不可信长文本直接作为 `--reason-code` 命令行参数。
