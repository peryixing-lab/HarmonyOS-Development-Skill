# design-doc.md 缺失自动恢复

## 目录

- [概述](#概述)
- [regenerate_design_doc](#regenerate_design_doc)
- [resume_design_generation](#resume_design_generation)
- [校验规则](#校验规则)
- [硬停场景](#硬停场景)
- [适用范围与限制](#适用范围与限制)

## 概述

当任意 Controller 调用返回 `nextRequiredAction=regenerate_design_doc` 或 `nextRequiredAction=resume_design_generation` 时，入口 Agent 必须执行本文件的自动恢复机制：

1. 即使命令退出码为 1，也必须先读取 stdout 中的结构化 JSON，再判断退出码含义。
2. 两种恢复动作都必须先校验 `recovery.recoveryInvocationId` 存在且非空；缺失时阻塞，不得自行生成替代 ID。
3. 加载 `recovery.instructionPath` 指向的恢复指令（即本文件），按 `recovery.strategy` 分流。
4. 不询问用户，不结束当前工作流。禁止入口 Agent 创建、覆盖或编辑 `<runDir>/design-doc-recovery-request.json`；该文件只能由 Controller 写入。

该恢复机制是自动的：从触发到重试原 Controller 操作全程不需要用户交互，也不得中断当前工作流。

## regenerate_design_doc

- 触发策略：`strategy=restore_document`。
- 适用条件：仅文档丢失、权威输入完整。
- 执行动作：按恢复指令以 `recovery.recoveryInvocationId` 作为调用标识，调用 `hmos-d2a-solution-design` 能力的 `restore_missing_design_doc` 修复模式，只写回当前 Run 的 `design-doc.md` 和 ledger。

`design-doc.md` 的唯一写入者是 `hmos-d2a-solution-design` 能力；该恢复动作本身也只通过该能力完成写回，入口 Agent 不得直接写文件。

## resume_design_generation

- 适用条件：生成流程被遗漏。

### Pixso

恢复当前阶段 5 指令（`recovery.stageInstructionPath`）中的方案设计子流程：

- 不调用阶段 5 的 Controller 命令；
- 不修改 workflow state 和 Gate。

### Figma

读取 Controller payload 中的 `recovery.operation=restore_design_artifacts` 和 `recovery.stopAfterDesign=true`，调用 `hmos-d2a-react-to-arkui` 能力（`recovery.runStatePath`）时必须转换为以下参数：

- `operation=restore_design_artifacts`
- `stop_after_design=true`
- `recovery_invocation_id=<recovery.recoveryInvocationId>`

不得把 `stopAfterDesign` 作为能力参数原样传入。

Figma 的 design-only 恢复由 React-to-ArkUI 负责组件树并保持 run state 原 phase：不得传 `resumePhase=analyzing`，不进入实现、构建或路由修改。

### 共同继续条件

两者都必须以成功调用并完成 `hmos-d2a-solution-design` 能力为继续条件。

## 校验规则

1. `recovery.recoveryInvocationId` 必须存在且非空；缺失时阻塞，不得自行生成替代 ID。
2. 恢复完成后，校验 `design-doc.md` 已恢复且内容合法。
3. 确认恢复指令列出的只读产物未被修改。
4. 成功后只能按 `recovery.retry` 重试原 Controller 操作；不询问用户是否继续，不得自行决定阶段跳转或改做其他 Controller 操作。
5. 同一次恢复最多自动执行一次恢复子流程；恢复失败或重试后仍返回 `design_doc_invalid` 时，停止自动循环并报告真实阻塞。

## 硬停场景

以下场景没有任何可执行的自动恢复动作，必须按真实阻塞报告并交还用户：

### design_doc_recovery_unverified

立即停止：

- 不得重新生成 recoveryInvocationId；
- 不得修改 `design-doc-recovery-request.json`；
- 不得伪造 ledger 记录。

按真实阻塞报告并交还用户。

### design_stage_evidence_incomplete

不提供可执行恢复动作。原因包括：上游证据或 checkpoint 不足、阶段已越过安全恢复点，或旧 Run 方案证据不完整。

按真实阻塞报告，不得手写文档或回退阶段。Pixso Full 阶段 5 已完成且用户确认过的组件树缺失时固定返回该错误，不得补造组件树。

## 适用范围与限制

- 这两个恢复动作只适用于 Figma Fast 与 Pixso Full/Fast。
- MasterGo 不使用本自动恢复机制，缺失方案或 checkpoint 时按其独立输入契约与阶段恢复规则处理。
- Figma Full 的确认快照错误（`confirmation_snapshot_invalid`）仍走 revision 与重新确认语义，不属于本恢复机制。
- `design-doc.md` 的唯一写入者是 `hmos-d2a-solution-design` 能力：入口 Agent、Controller、`hmos-d2a-react-to-arkui` 能力和其他任何能力都不得手写、补造或重写该文件。
- 该规则优先于普通错误处理：非零退出码不得先触发停止或向用户报告，必须先检查 stdout 中的 `nextRequiredAction`。
