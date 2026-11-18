---
name: design-to-arkui
description: 处理 Pixso、Figma 或 MasterGo 设计稿转 HarmonyOS ArkTS 代码的任务。当用户使用 `$harmonyos-development-skill`、提供 Pixso/Figma/MasterGo 链接、Pixso/MasterGo 客户端选中节点、设计稿 DSL/截图/本地资源，或要求把 UI 设计稿转换为 ArkTS 时，必须使用本 skill。
---

# 设计稿转 ArkUI

## 需求预检与澄清

任务开始时，必须先对用户输入进行需求预检。预检与必要澄清完成前，不得选择、读取或执行任一 workflow。

若输入已能判定设计来源（Pixso 链接 / Figma design URL），**必须先完成「MCP 依赖检查」**（见下节）：依赖不满足时直接停止并给出安装引导，**不得进行任何澄清提问**；只有依赖满足（或属于 Pixso 开发者直供豁免）后，才进行下述澄清。

预检原则：只问无法通过探索项目目录或读取设计稿自行发现的信息；能自己查到的不问用户。必须同步一次性向用户提出所有未明确项的澄清问题，不得逐条分次询问。

预检项：设计来源、目标页面/节点、项目路径、功能描述。设计来源分为 `pixso`、`figma` 和 `mastergo`；Pixso 链接、Pixso 选中节点及开发者提供 Pixso DSL 都属于 `pixso`，带 file key 与 `node-id` 的 Figma URL 属于 `figma`；MasterGo 网页链接或客户端选中节点属于 `mastergo`。详细字段映射见 `references/requirement-clarification.md`。

预检完成后必须生成需求澄清文档，由阶段 1 写入运行目录的 `requirement-clarification.json`。

## 选择工作流

先选择设计来源：Figma `design/file` URL 且含 file key 与 `node-id` → `figma`；Pixso 链接、Pixso 选中节点或开发者提供 Pixso DSL → `pixso`。同时提供多种来源、来源无法识别或 Figma 缺少 `node-id` 时先一次性澄清，不得猜测。当前不支持在同一个 run 中混合来源。MasterGo 链接或当前选区 → `mastergo`；首次接入默认按官方 Magic MCP → 官方 Vibe MCP → 社区插件的顺序验证目标设计读取，已有用户明确选择且可用的连接直接复用。Vibe 需要可用的桌面客户端；私有化先验证实际服务支持，读取 `references/mastergo/mcp-setup.md`。

用户选择社区插件 MCP 时，使用独立的 `community` 模式和 `nodes` 输入格式，仍保留 MasterGo 来源；安装、连接与能力边界见 `references/mastergo/mcp-setup.md`。不得将社区节点响应冒充官方 Magic DSL 或 Vibe 前端代码。

1. 用户同时传入 `--fast --full`：参数冲突，停止，提示"请输入 `--fast` 或 `--full`"。
2. 用户仅输入 `--fast`：使用 Fast variant。
3. 用户仅输入 `--full`：使用 Full variant。
4. 用户未输入参数：读取 `~/.local/share/deveco/log/deveco.log` 尾部，取最近一条 `small=false agent=build|goal|plan mode=primary`。`build` → Fast，`goal` → Full，`plan` 或其他 → 不支持，停止。
5. 日志不存在、不可读、无匹配项或多会话冲突时，提示用户改用 `--fast` 或 `--full`。

选择后由 `workflow-state.json.designSource` 和 `.variant` 共同锁定，恢复时不得重新识别来源或切换 catalog。

variant 确定后、执行 `init` 前，确认「MCP 依赖检查」已通过（见下节）；不满足时不得 `init`，按检查结果给出安装建议或引导并停止。

## MCP 依赖检查

进入 Pixso 路径必须先检查当前 deveco 的 Pixso MCP 依赖；进入 Figma 路径必须先检查当前 deveco 的 Anchor MCP 依赖。**检查只问一句：当前会话工具列表是否存在对应能力工具**——有即满足，没有即不满足（不需要为此运行 `deveco mcp list`、读取配置或探测端点；原因可由用户自查 `deveco mcp list`）。工具名以会话实际为准（deveco 以 `<服务器名>_<官方名>` 暴露，不绑定写死前缀，如 `pixso-mcp_get_node_dsl`）。详细引导见 `references/mcp-dependency.md`。

| 设计来源 | 能力工具（按名称识别，前缀以实际为准） | 不满足时的引导入口 |
|---|---|---|
| pixso | 名称含 `get_node_dsl` / `get_screenshot` / `get_export_image` 等（前缀如 `pixso-mcp_`） | 本地/远程二选一：本地 = 装客户端（≥2.2.0）→ 文件顶栏左上角开启 MCP 开关 → `deveco mcp add pixso-mcp --url 客户端实际地址`；远程 = `deveco mcp add pixso-mcp --url https://pixso.cn/mcp` → `deveco mcp auth pixso-mcp` |
| figma | 名称含 `figma_to_code_`（前缀如 `anchor-d2c-mcp_`） | 官方源码安装 + 注入 `FIGMA_ACCESS_TOKEN` + `deveco mcp add` 交互式注册 anchor（选 Local） |

Pixso/Figma 依赖不满足时：停止并给出安装建议/修复引导（见 `references/mcp-dependency.md`；只给指引不代装），不得进入 `init`、不得获取 DSL/JSX。Pixso 路径下开发者直接提供 DSL/截图/本地资源（全程不调用 MCP）时，依赖检查记录为不适用并继续。

MasterGo 路径单独按 `references/mastergo/mcp-setup.md` 完成连接检查与接入：默认 Magic → Vibe → 社区插件，保留用户已明确选择且可用的方案。依赖未就绪时不初始化工作流，按该指引完成配置或报告阻塞；不要套用 Pixso/Anchor 工具名或安装步骤。初始化并启动 MasterGo 阶段 1 后，在工程目录运行 `scripts/mastergo-capture.mjs --config <capture-config.json> --connection <connection.json> --runtime <runtime>`。脚本独立连接外部 MCP，完成只读检查、取数与原始响应落盘，不需要新增 Code 内置工具或注册内部 MCP 会话。沿用命令执行权限，用户禁用的服务或工具不能改用脚本绕过。工具可见只证明协议可达，目标文件、节点与资源是否可读仍须实际验证。详情见 `references/mastergo/acquire.md`。

## 运行目录

本指南的运行根目录是 `references/design-to-arkui/`。阶段文档里的原安装路径示例都指向这个专题目录，脚本和资料路径按该目录的实际位置解析。

- Full：`.deveco/design-to-arkts/runs/{runId-or-pageSlug}/`
- Fast：`.deveco/design-to-arkts-fast/runs/{runId-or-pageSlug}/`
- 全局运行索引位于 `runs/` 之外：Full 为 `.deveco/design-to-arkts/run-index.json`，Fast 为 `.deveco/design-to-arkts-fast/run-index.json`。`run-index.json` 不属于单次 Run；同一 variant 内各设计来源共用同一索引，Full 与 Fast 互不共用。
- Pixso 使用内置 `scripts/pixso-arkts/`；Figma 阶段 1 使用 Anchor MCP，阶段 2 加载能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md），并完整执行。

## Controller 操作

Controller 脚本：`<designToArktsSkillRoot>/scripts/workflow.mjs`。五种操作：

| 操作 | 命令 | 作用 |
|---|---|---|
| init | `--mode init --source pixso\|figma\|mastergo --variant full\|fast --run-dir <runDir>` | 锁定来源和 variant，初始化状态和 Todo；省略 source 仅为兼容旧调用，默认 pixso |
| status | `--mode status --run-dir <runDir>` | 查看状态、重建 Todo、恢复入口 |
| stage-start | `--mode stage-start --run-dir <runDir> --stage <N>` | 校验后返回当前阶段 instructionPath |
| confirm | `--mode confirm --run-dir <runDir> --stage <N> --decision request\|accepted\|revision-requested` | 管理用户确认状态 |
| stage-complete | `--mode stage-complete --run-dir <runDir> --stage <N> --result passed\|blocked [--reason-code <code>]` | 校验、生成 Gate、推进状态和 Todo |

详细协议见 `references/runtime-contract.md`。

## design-doc.md 缺失自动恢复

当任意 Controller 调用返回 `nextRequiredAction=regenerate_design_doc` 或 `nextRequiredAction=resume_design_generation` 时：

1. 即使命令退出码为 1，也必须读取 stdout 中的结构化 JSON。
2. 两种恢复动作都必须先校验 `recovery.recoveryInvocationId` 存在且非空；缺失时阻塞，不得自行生成替代 ID。
3. 加载 `recovery.instructionPath` 指向的恢复指令（`references/design-doc-auto-recovery.md`），按 `recovery.strategy` 分流。
4. 不询问用户，不结束当前工作流。禁止入口 Agent 创建、覆盖或编辑 `<runDir>/design-doc-recovery-request.json`；该文件只能由 Controller 写入。
5. `regenerate_design_doc`（`strategy=restore_document`，仅文档丢失、权威输入完整）：按恢复指令以 `recovery.recoveryInvocationId` 调用 `hmos-d2a-solution-design` 的 `restore_missing_design_doc` 修复模式，只写回当前 Run 的 `design-doc.md` 和 ledger。
6. `resume_design_generation`（生成流程被遗漏）：Pixso 恢复当前阶段 5 指令（`recovery.stageInstructionPath`）中的方案设计子流程，不调用阶段 5 的 Controller 命令、不修改 workflow state 和 Gate。Figma 读取 Controller payload 中的 `recovery.operation=restore_design_artifacts` 和 `recovery.stopAfterDesign=true`，调用 `hmos-d2a-react-to-arkui`（`recovery.runStatePath`）时必须转换为：`operation=restore_design_artifacts`、`stop_after_design=true`、`recovery_invocation_id=<recovery.recoveryInvocationId>`；不得把 `stopAfterDesign` 作为能力参数原样传入。Figma 的 design-only 恢复由 React-to-ArkUI 负责组件树并保持 run state 原 phase，不得传 `resumePhase=analyzing`，不进入实现、构建或路由修改。两者都必须以成功调用并完成 `hmos-d2a-solution-design` 为继续条件。
7. 校验 `design-doc.md` 已恢复且内容合法，并确认恢复指令列出的只读产物未被修改。
8. 成功后只能按 `recovery.retry` 重试原 Controller 操作，不询问用户是否继续，不得自行决定阶段跳转或改做其他 Controller 操作。
9. 同一次恢复最多自动执行一次恢复子流程；恢复失败或重试后仍返回 `design_doc_invalid` 时，停止自动循环并报告真实阻塞。
10. Controller 返回 `design_stage_evidence_incomplete` 时不提供可执行恢复动作：上游证据或 checkpoint 不足、阶段已越过安全恢复点，或旧 Run 方案证据不完整。按真实阻塞报告，不得手写文档或回退阶段。Pixso Full 阶段 5 已完成且用户确认过的组件树缺失时固定返回该错误，不得补造组件树。
11. Controller 返回 `design_doc_recovery_unverified` 时立即停止：不得重新生成 recoveryInvocationId、不得修改 `design-doc-recovery-request.json`、不得伪造 ledger 记录，按真实阻塞报告并交还用户。

`design-doc.md` 的唯一写入者是 `hmos-d2a-solution-design`：入口 Agent、Controller、`hmos-d2a-react-to-arkui` 和其他任何能力都不得手写、补造或重写该文件。该规则优先于普通错误处理：非零退出码不得先触发停止或向用户报告，必须先检查 stdout 中的 `nextRequiredAction`。这两个动作只适用于 Figma Fast 与 Pixso Full/Fast；Figma Full 的确认快照错误（`confirmation_snapshot_invalid`）仍走 revision 与重新确认语义。

## 按阶段加载规则

- 选定来源和 variant 后读取 `references/runtime-contract.md` 及 Controller 选中的 catalog。Pixso catalog 位于 `references/pixso/stage-catalog-*.json`，Figma catalog 位于 `references/figma/stage-catalog-*.json`；MasterGo catalog 位于 `references/mastergo/stage-catalog-*.json`，并读取 `references/mastergo/runtime-contract.md`。
- 执行 `stage-start` 前不得读取任何阶段文件。
- 正常执行时，只读取成功的 `stage-start` 输出的 `instructionPath` 指向的当前阶段文件。
- 恢复例外：`status` 返回 `nextRequiredAction=resume_confirmation` 时，只恢复原确认问题；返回 `nextRequiredAction=resume_confirmed_stage` 时，只依据阶段内部 checkpoint 继续确认后的余下实现。两种情况都可以读取该次 `status` 返回的当前阶段 `instructionPath`，但不得视为新的阶段入口，不得再次调用阶段入口 `todowrite`，不得重新生成已完成产物。
- 不得预读后续阶段、另一 variant 或另一设计来源的阶段文件。
- 摘要不一致时（controller 返回 `workflow_digest_mismatch`）必须停止并重新初始化。

## Todo 同步规则

- `stage-start` 成功后，读取其 `instructionPath`。阶段 reference 的第一项动作必须读取 `todoPayloadPath` 指向的 JSON 文件，将文件中的 `.todos` 原样提交给 `todowrite`；同步成功前不得执行任何阶段工作。
- 普通 `stage-complete --result passed` 后不得调用 `todowrite`；立即对新的 `currentStage` 执行 `stage-start`，由下一阶段入口同步 Todo。
- 最终 `stage-complete --result passed` 后没有下一阶段，必须按最终阶段 reference 将全量 completed payload 提交给 `todowrite`，再输出最终回复。
- 不判断 Todo UI 是否已经更新。每个阶段入口固定调用一次，重复提交同一完整列表视为安全的幂等重放。
- `init` 后不要单独调用 `todowrite`，否则会与阶段 1 入口重复。
- `status` 返回什么动作就按什么动作分流，不能无条件执行 `stage-start`：
  - `stage_complete` → 读取 `completionResult`，`passed` 时调用 `stage-complete --result passed`，`blocked` 时调用 `stage-complete --result blocked --reason-code <reasonCode>`（当前阶段有 pending Gate 或已确认时）
  - `running` → `stage_start`
  - `completed` → 读取 `todoPayloadPath` → `todowrite` → 最终回复
  - `blocked` → 报告并解决 `blockedReasonCode`，不得静默恢复 `running`
  - `awaiting_confirmation` → 恢复原确认问题，不重新执行阶段入口 Todo 同步

## 用户确认规则

- catalog 中 `requiresConfirmation=true` 的阶段需要用户确认。
- Pixso Full 仅阶段 5 需要确认；Figma/MasterGo Full 仅阶段 2 需要确认；Fast 均不确认。
- Agent 不得直接修改 `workflow-state.json`。确认状态由 Controller 通过 `confirm --decision` 管理。
- 生成并校验待确认产物后、向用户展示确认问题前，调用 `confirm --decision request`。Controller 将状态设为 `awaiting_confirmation` 并返回 `await_user_confirmation`，然后展示已有产物和固定确认选项并等待用户选择。
- Pixso Full 用户确认后，`accepted` 返回 `stage_complete`，直接完成阶段。Figma/MasterGo Full 阶段 2 的确认发生在实现之前，catalog 使用 `confirmationContinuesStage=true`；`accepted` 返回 `resume_confirmed_stage`，必须在不重新 `stage-start`、不重复 Todo 的情况下继续对应的转换能力（Figma: `hmos-d2a-react-to-arkui`，MasterGo: `hmos-d2a-mastergo-to-arkui`）实现和初次构建，全部完成后才能 `stage-complete`。
- 用户要求修订时，调用 `confirm --decision revision-requested`，Controller 恢复 `running`、保持 `currentStage` 不变，返回 `stage_start`；随后重新 `stage-start` 当前阶段。
- 组件树不正确时停留修订，不得跳过确认。

## 跨流程禁止事项

- 各设计来源均保留 `Index.ets` 作为唯一启动 `@Entry` 和稳定导航壳。新生成页面必须使用独立文件和可导出的 `@Component`，并按项目现有 `Navigation`、路由表或等价机制注册到 `Index`；不得新增竞争性启动 `@Entry`，不得修改 `EntryAbility` 绕过 Index，不得静默覆盖或切换默认页。
- 标准 ArkUI `Navigation` 必须持有并传入 `NavPathStack`（`Navigation(this.navStack)`）；禁止无参数 `Navigation()`；不需要路由时用 `Column`/`Stack`。
- `blocked` 状态不得静默改回 `running`；blocked 通过 `stage-complete --result blocked --reason-code <code>` 由 Controller 设置 `blocked` 状态。Agent 不得自行创建、修改或覆盖 stage gate。
- 不得批量完成、预写或跳过后续 gate。
- Agent 不创建 Gate。Gate 由 Controller 根据 `stage-complete --result` 自动生成。
- 纠错与删除边界（约束入口 Agent 与所有子 Agent）：本条仅在写错路径或产物异常的纠错场景适用——此时只允许删除或覆盖本 run 目录内本工作流自建的产物；严禁对工程根目录、模块源码目录及 run 目录之外的任何既有文件（含代码文件）执行删除、递归删除或重建，不得以"修正写错路径"为由扩大删除范围；任何删除命令执行前必须核对目标路径位于 `<runDir>` 内或属于明确的本次自建产物清单。正常阶段按各阶段产物清单修改源码不受本条限制；子 Agent 的写入与删除范围由各阶段模板的边界条款约束。

MasterGo Full 的确认和续跑沿用相同 Controller 语义，使用独立 `hmos-d2a-mastergo-to-arkui` checkpoint 与八文件快照；不调用 Figma/Anchor 工具，不使用 Figma Fast 的 design-doc 自动恢复。阶段 3 起读取 MasterGo wrapper 指定的 Figma 原阶段文件，来源映射后复用。

## 能力注册表

调度语义：阶段指令要求"加载能力 X"时，读取 X 的 INSTRUCTIONS.md 全文并完整执行其指令；不经 skill 工具（本 skill 是系统内唯一 d2a 身份）；执行前按 ledger 规则记录调用条目：ledger 文件整体为 JSON 数组、每项一条调用记录（也可用 `{"invocations": [...]}` 包裹，禁止 `entries` 等其他包裹键）；条目 JSON 键固定为 "capability"、值为能力名（Controller 兼容读取旧 "skill"/"skillName"），不得改用其他字段名。

路径解析约定：能力 INSTRUCTIONS.md 内的相对路径（如 references/、scripts/、assets/）相对于该能力目录（即 `references/capabilities/<能力名>/`）解析，不相对于入口 skill 根目录。能力目录路径见下表「指令路径」列的目录部分。

子 Agent 模板约定：模板由主 Agent 实例化后作为 task prompt 发送——先把模板中的输入名与 `<designToArktsRunDir>` 等占位符替换为实际值；模板内 `references/…` 路径相对本 skill 安装根目录。

| 能力名（= ledger 键值） | 职责 | 指令路径 | 关键脚本 | 调用约束 |
|---|---|---|---|---|
| hmos-d2a-mastergo-to-arkui | MasterGo 设计源 → ArkUI | references/capabilities/hmos-d2a-mastergo-to-arkui/INSTRUCTIONS.md | scripts/mastergo-source.mjs | 仅 MasterGo 阶段 2，内部加载 solution-design |
| hmos-d2a-react-to-arkui | Figma 阶段2 React→ArkUI 转换 | references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md | — | 仅 Figma 流程；内部需加载 solution-design |
| hmos-d2a-solution-design | 设计方案 design-doc.md（唯一写入者） | references/capabilities/hmos-d2a-solution-design/INSTRUCTIONS.md | — | Pixso 阶段5 / Figma、MasterGo 经各自转换能力 |
| hmos-d2a-ui-reconstruction-score | 单轮还原度评分 | references/capabilities/hmos-d2a-ui-reconstruction-score/INSTRUCTIONS.md | scripts/ui_score.py | 仅被 scoring-workflow 调用 |
| hmos-d2a-arkui-scoring-workflow | 多轮视觉校准评分循环 | references/capabilities/hmos-d2a-arkui-scoring-workflow/INSTRUCTIONS.md | — | 仅视觉校准阶段 |
| hmos-d2a-repo-understand | 仓库结构理解 | references/capabilities/hmos-d2a-repo-understand/INSTRUCTIONS.md | — | Pixso 阶段3 |
| hmos-d2a-arkui-component-best-practices | ArkUI 组件最佳实践识别 | references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md | scripts/search-practices.mjs | Pixso 阶段4 / Figma、MasterGo 阶段2 |
| hmos-d2a-arkts-logic-completer | 交互逻辑补全 | references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md | — | Pixso Full 阶段7 / Pixso Fast、Figma、MasterGo 阶段3 |
| hmos-d2a-arkui2hds | HDS 材质迁移 | references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md | — | 阶段4/质量构建阶段 |
| hmos-d2a-responsive-layout-generator | 响应式布局生成 | references/capabilities/hmos-d2a-responsive-layout-generator/INSTRUCTIONS.md | — | Pixso 阶段5 条件加载 |

## 关键引用

- 运行时契约：`references/runtime-contract.md`
- design-doc.md 缺失自动恢复：`references/design-doc-auto-recovery.md`
- Pixso Full catalog：`references/pixso/stage-catalog-full.json`
- Pixso Fast catalog：`references/pixso/stage-catalog-fast.json`
- Pixso Full 阶段目录：`references/pixso/full/stages/`
- Pixso Fast 阶段目录：`references/pixso/fast/stages/`
- Figma Full catalog：`references/figma/stage-catalog-full.json`
- Figma Fast catalog：`references/figma/stage-catalog-fast.json`
- Figma 阶段目录：`references/figma/full/stages/`、`references/figma/fast/stages/`
- 需求澄清文档规范：`references/requirement-clarification.md`
- MCP 依赖检查指引：`references/mcp-dependency.md`
- MasterGo MCP 配置：`references/mastergo/mcp-setup.md`
- MasterGo 输入、资源和恢复：`references/mastergo/input-contract.md`
- MasterGo Full/Fast：`references/mastergo/stage-catalog-full.json`、`references/mastergo/stage-catalog-fast.json`
