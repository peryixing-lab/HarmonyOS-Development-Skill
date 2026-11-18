# 能力：hmos-d2a-arkui-scoring-workflow

> design-to-arkts 的 Figma/MasterGo Full 阶段 5 / Pixso Full 阶段 9 专用步骤：以实际修复、构建部署和新截图驱动多轮视觉校准。仅由工作流显式调度，不响应独立请求。

## 目录

- [目标](#目标)
- [输入](#输入)
- [执行约束](#执行约束)
- [工作流](#工作流)
- [下一轮准入（第 2 至 `maxRounds` 轮评分前执行）](#下一轮准入第-2-至-maxrounds-轮评分前执行)
- [轮次证据与恢复](#轮次证据与恢复)
- [输出要求](#输出要求)
- [停止条件](#停止条件)

## 目标

通过“评分发现问题 → 定位并修改实现 → 构建部署 → 重新截图评分”改善 ArkUI 页面还原度。父能力负责实际修复及应用运行，`hmos-d2a-ui-reconstruction-score` 负责单次评分和问题分析。首次评分建立基线，后续评分验证实际修改，不以重复评分次数作为任务进展。

## 输入

- 参考图路径，通常是 Figma 预览图、设计稿截图或 `Preview.png`
- ArkUI 工程路径
- 目标页面、路由、预览页或启动入口
- 系统 UI 策略、顶部/底部忽略区域配置；未提供时移动端默认 `ignoreTopPx=44`、`ignoreBottomPx=36`
- 视觉校准评分阈值 `scoreThreshold`；未提供时默认 `80`
- 视觉校准轮数上限 `maxRounds`；未提供时默认 `5`，合法区间 1—5（含 Round 1 基线轮）
- 调用方运行目录 `runDir`；轮次截图、修复证据、构建部署日志和评分产物保存在该目录内
- 可用的 ArkUI、DevEco、模拟器、预览器或设备 MCP 工具

缺少参考图、ArkUI 工程路径、目标页面信息或必要 MCP 工具时，立即终止并提示缺失项。

## 执行约束

- 推送模拟器优先使用运行中的模拟器。
- 实现截图使用hdc进行截图。
- 每轮评分加载能力 `hmos-d2a-ui-reconstruction-score`（注册表 → references/capabilities/hmos-d2a-ui-reconstruction-score/INSTRUCTIONS.md），并完整执行；仅在文本中提及、读取文件或声称已加载均不算执行。评分前必须获得本地参考图和本地实现截图。
- 每轮在运行评分脚本或调用 `compare_images` 之前，先记录 `{ "capability": "hmos-d2a-ui-reconstruction-score", "round": N, "status": "invoked" }`。只有该轮独立生成且成功解析 `score.json` 和 `metrics.json`，且子能力已完成本轮 `compare_images` 对比并返回评分和问题后，才能将记录更新为 `status=completed`。
- `hmos-d2a-ui-reconstruction-score` 不存在、其 `INSTRUCTIONS.md` 不可读或加载失败、评分脚本失败或任一必需 JSON 缺失/不可解析时，立即返回 `status=blocked`；不得用 `compare_images`、人工目测或自然语言评分降级替代。
- 单次评分采样期间不得修改页面实现代码。未达阈值且还有轮次时，必须先完成至少一处针对上一轮问题的有效视觉修复，再允许开始下一轮评分；每次最多处理三个问题。仅列出建议、修改注释、格式化或改评分配置不算修复。不得为了提高评分而关闭全屏、移除沉浸式配置、伪造系统栏或掩盖安全区问题。
- `compare_images` 由本轮已按注册表加载其 `INSTRUCTIONS.md` 的 `hmos-d2a-ui-reconstruction-score` 执行，是每轮必做的视觉分析步骤。父能力管理轮次，不另行重复调用，也不绕过子能力直接对比。工具用于辅助定位差异，不替代任一级能力或评分脚本；仅调用该工具不能代表能力已完整执行或本轮已完成。
- 顶部状态栏图标/文字和底部系统手势/小横条区域不参与像素评分；但这些区域必须用于诊断应用前景组件是否侵入真实系统区。

## 工作流

按顺序执行。

1. 检查输入：
   - 确认参考图存在且可打开。
2. 进入目标页面：
   - 第 1 轮先构建当前工程并安装/推送到目标模拟器或预览环境，再启动应用；仅当可核验的现有构建与部署证据明确对应当前源码时才可复用部署。
   - 根据目标路由或页面说明，进入目标页面
3. 截图并保存：
   - 当 hdc 指令无法使用时，如果配置了 `DEVECO_HOME` 环境变量，则优先在以下目录下查找 hdc。Windows 端：`${env:DEVECO_HOME}\sdk\default\openharmony\toolchains`，macOS 端：`$DEVECO_HOME/sdk/default/openharmony/toolchains`。

   - 将当前实现截图保存为本地图片文件。
   - 使用轮次独立路径，例如 `visual-calibration/round-01/candidate.png`，不得覆盖已用于评分的截图。
   - 记录参考图路径和实现截图路径。
4. 建立系统区排除和重叠诊断配置：
   - 读取系统 UI 策略、设计文档或调用方参数，确定顶部状态栏忽略高度和底部系统手势/小横条忽略高度；未提供时移动端默认 `ignoreTopPx=44`、`ignoreBottomPx=36`。
   - 顶部状态栏图标/文字、运营商、电量、Wi-Fi、信号以及底部系统手势/小横条只作为环境系统 UI 处理，不参与像素评分。
   - 不得因为参考图存在 mock 状态栏或 mock 小横条就要求实现图绘制对应内容。
   - 忽略区域不等于跳过安全区检查：如果页面标题、返回按钮、搜索框、卡片、头像、列表首项等应用前景组件进入真实状态栏区域，必须作为 `top_system_area_overlap_risk` 或 safe-area 问题报告。
   - 评分流程不得修改 `EntryAbility.ets`、不得切换 `setWindowLayoutFullScreen`、不得通过关闭沉浸来消除重叠。
5. 检查页面是否可比：
   - 直接查看参考图和实现截图。
   - 如果两个页面明显完全不同，先确认是否进入了明确的目标路由或页面状态。
   - 路由或页面状态不明确时，使用 MCP 工具操作页面进入明确目标路由后重新截图。
   - 如果仍未发现与参考图相似的页面，输出明确结论：当前运行页面与参考页面不匹配，评分不可作为还原质量依据。
6. 使用 `hmos-d2a-ui-reconstruction-score` 评分：
   - 必须先完成本能力的输入检查、真实页面获取、系统区配置和可比性检查。
   - 向内部调用记录追加本轮 `hmos-d2a-ui-reconstruction-score status=invoked`，然后加载该能力并完整执行；不得直接跳到其脚本或 `compare_images` 步骤。
   - 明确以“评分 + 可操作问题”调用子能力，输出总评分、可比性、分项评分和最多三个最明显、可定位的 UI 问题；不能因为调用名含“评分”就只返回数字。
   - 每轮使用独立目录，例如 `visual-calibration/round-01/score/`，对参考图和本轮实现截图运行评分流程，并传入系统区忽略参数，例如 `--ignore-top-px 44 --ignore-bottom-px 36`；如果调用方提供了真实安全区高度，使用调用方数值。
   - 打开并成功解析本轮输出根目录的 `score.json` 和 `pairs/<pairId>/metrics.json`，记录实际文件路径、摘要和校验结果。`aggregate.final_baseline_score` 必须是 0—100 的有限数值；缺失、类型错误或越界时，按现有产物无效流程处理，不默认成 0，不用分析 overall、工具分数或上一轮分数兜底，也不向脚本文件补写 overall。将 `ignored_top_status_px`、`ignored_bottom_system_px`、`system_area_diagnostics`、`top_system_area_overlap_risk` 相关 hints 展示给用户。
   - 子能力对本轮评分输入图片执行 `compare_images`，读取结果并综合返回评分、可比性、分项评分和 0—3 个可操作问题。按子能力的“本轮未完成时”处理遗漏或失败；父能力不用直接调用工具来代替子能力的剩余步骤。
   - 本轮评分产物有效且上述完整结果返回后，才将本轮内部调用更新为 `status=completed`，随后进入第 7 步。脚本分数已经达标或问题列表为空，也不能提前跳过对比和分析。

7. 根据本次评分决定结束还是修复：
   - Round 1 是基线评分，Round 2—`maxRounds` 验证上一轮评分之后的实际修改。最多 `maxRounds` 次有效评分，即基线之后最多 `maxRounds − 1` 次修复验证，不要求凑满轮数上限。
   - 读取本轮脚本输出 `score.json` 的 `aggregate.final_baseline_score`，作为本轮阈值判定分数。达到阈值时以 `score-threshold-reached` 结束，不再修改代码。子能力返回的分析 `overall` 用于解释还原质量，不能替换该脚本分数。
   - 未达到阈值且还有评分次数时，下一步是修复：阅读本轮问题，检查相关源码，选择 1—3 个最值得处理的问题并实际修改；随后构建、部署、进入相同目标页面和状态、重新截图，再进行下一次评分。完整动作按下方“下一轮准入”执行，不能省略中间步骤。
   - 只有第 6 步的完整评估完成后才计入一轮。仅提出建议、修改注释或格式、重复截图和重复运行评分都不算完成一次修复验证。
   - 修改后分数持平或下降，也要保留真实结果并重新分析原因；不要求分数逐轮上涨，不重复评分碰运气，不删除低分记录。
   - 第 `maxRounds` 次有效评分仍未达标时，以 `max-rounds-reached` 结束并说明残留问题，不追加下一轮评分，不在最后一次评分之后留下新的未验证修改。
   - 无法确定有效修复或无法继续构建、部署、截图时，定位具体原因；仍无法继续则返回 blocked，只保留实际完成的轮数。不询问是否继续，也不为了避免阻塞而凑满轮数上限。

## 下一轮准入（第 2 至 `maxRounds` 轮评分前执行）

以下是工作流第 7 步在未达标时的具体修复顺序，按顺序完成后才进行下一次评分。它不是额外的评分循环，也不是先评分再补做的检查清单。任何一项未完成都不得调用下一轮评分能力：

1. **定位问题**：读取上一轮分数、区域诊断及视觉对比，选择 1 至 3 个可操作问题，建立 `issueId → 页面组件/源码位置 → 根因假设 → 预期可见变化`。`bottom region_mismatch` 只是区域提示，须进一步区分底部面板锚点、父容器高度、safe-area、内容裁切或错误页面状态；不能把应用底部面板整体当作系统手势区忽略。
2. **实际修复**：修改与问题直接相关的 `.ets`、页面样式/布局配置或资源。保存相对项目根目录的文件路径、修改前后 SHA-256 和可审阅 diff。至少一处修改会影响当前目标页面的可见结果；不以 Git HEAD 是否变化作为依据，未提交修改同样有效。不得修改参考图、扩大忽略区或调整阈值来代替修复。
3. **构建并部署**：从修复后的源码成功构建，将新产物实际安装/推送到同一目标设备或刷新预览，重新进入目标路由与可比状态。记录源码摘要、构建命令/成功结果、产物路径及 SHA-256、部署命令/结果、设备与页面信息。仅有“构建成功”不能证明设备运行了新代码。失败时先修复具体错误，不得截取旧应用继续评分。
4. **重新截图并核验**：页面稳定后通过新的 hdc 截图命令写入下一轮独立目录，记录时间、命令日志、路径、字节数、宽高和 SHA-256；确认截图发生在本次部署之后。不得复制/重命名旧截图、只改时间戳或把旧图再次上传作为新轮次。
5. **判断修复是否进入画面**：对照上一轮截图检查预期变化。文件大小相同不能证明图相同；SHA-256 不同也可能只是系统时钟、压缩或动态内容变化。应结合解码后的像素或已有归一化图像、目标应用区域和构建部署证据判断。若截图完全相同或目标区域没有预期变化，先检查改错页面/资源、旧包、错误路由、修改被覆盖或布局约束未生效；查明后在同一次修复尝试中重新部署/截图，不能消耗新评分轮次。无法查明时阻塞，不得重复评分等待分数上涨。
6. **执行评分**：只有以上证据齐全且可比性有效时才执行下一轮 `hmos-d2a-ui-reconstruction-score`。按工作流第 6 步完成脚本评分、`compare_images` 对比和综合结果返回后，才将该轮计入 `roundsCompleted`；分数持平或下降也要如实保留，不要求分数单调上升，不删除低分记录。

没有可信的可操作问题时，先复核现有截图、指标和相关实现，不要为凑轮数制造无意义修改。仍无法提出有效修复时，记录 `blockingIssue.code=no_actionable_fix` 并返回 blocked。相同问题在已验证修改后持续存在时，应修正根因假设；不能重复同一修改或重评同一画面。构建、部署和截图故障均不计为新评分轮次，也不得无限重试。

## 轮次证据与恢复

- 每个有效评分保留在 `visual-calibration/round-NN/`；失败的构建或截图尝试保留在对应轮次的 `attempts/` 下，不覆盖已完成证据，也不追加有效轮号。
- 每轮记录 `candidate`（path、sha256、capturedAt、captureLog）、`build`（sourceSnapshot、artifactPath、artifactSha256、log）、`deployment`（target、route、log）以及原有评分路径。日志须支持“修复 → 构建 → 部署 → 截图 → 评分”的先后顺序，记录来源必须是实际工具结果。
- 第 1 轮的 `repair` 为 null；第 N≥2 轮记录 `repair.fromRound=N-1`、`issueIds`、`hypothesis`、`expectedVisualChange`、`changedFiles`（path、beforeSha256、afterSha256）、`diffPath`、`evidenceCheck`。`diffPath` 等证据路径相对调用方 runDir；源码路径相对工程根目录。
- 把“本轮验证了什么”与“下一轮准备修什么”分开。每轮简短汇报：`Round N / score / 验证的 issueId 与修改文件 / 观察到的变化 / 下一步或阻塞原因`，避免将计划当成已经完成的动作。
- 恢复时先核验最后一个有效评分及其证据，继续尚未完成的修复、构建或截图步骤。不能为了补齐轮次重新评分同一截图，也不能重置已有分数和计数；发现旧记录缺少证据时说明不可信轮次，不能补造日志后宣称 completed。

## 输出要求

输出包含：

- 参考图路径
- 实现截图路径
- 系统区忽略配置：顶部状态栏忽略高度、底部系统手势/小横条忽略高度
- 系统区诊断：顶部是否存在应用前景组件侵入状态栏的风险、底部系统手势区是否仅作为环境差异排除
- 页面可比性判断
- 脚本阈值判定分数（`score.json` 的 `aggregate.final_baseline_score`）和视觉分析 `overall`，两者分别标清来源，不混称为唯一总分；`overall` 另附可比性和分项评分
- 最多三个问题，包含区域、问题、可能代码位置、严重度
- 页面完全不匹配时的明确结论和已尝试进入的目标路由或页面状态
- 供调用方门禁读取的结构化结果：`status`、`capabilityInvocations`、`roundsCompleted`、`completionReason`、每轮评分与修复摘要，以及 `hmos-d2a-ui-reconstruction-score-invoked`、`score-artifacts-present`、`no-direct-compare-images-bypass`、`calibration-completed` checks
- 成功完成时 `roundsCompleted` 为 1 至 `maxRounds`；blocked 时允许为 0，且只计入此前真实完成的有效评分。本轮对比或分析尚未完成时，不将该轮计入 `roundsCompleted`，也不将子能力或父能力标为 completed；无法继续时沿用下述 blocked 输出。`capabilityInvocations` 必须包含 round 1 至 `roundsCompleted` 各一条 `{ "capability": "hmos-d2a-ui-reconstruction-score", "round": N, "status": "completed", "scoreJson": "...", "metricsJson": "..." }`，其中 `scoreJson`、`metricsJson` 一律使用相对 runDir 的路径，不得写入含 runDir 前缀的完整路径（Controller 以 runDir 为基准二次拼接，完整路径会被拼成双重嵌套而判产物缺失）。任一已完成轮次缺少调用记录、独立评分产物或第 2 轮起的修复/构建部署/截图证据时，整体 `status` 不能为 `completed`
- `completionReason=score-threshold-reached` 时，最后一轮的脚本阈值判定分数（即阶段报告 `rounds[].score`）必须达到 `scoreThreshold`；`completionReason=max-rounds-reached` 时，必须已经完成 `maxRounds` 轮且第 `maxRounds` 轮的脚本阈值判定分数仍低于 `scoreThreshold`
- blocked 结果包含 `blockingIssue`、实际已完成轮次、最后有效评分和已尝试动作，不设置上述成功结束的 `completionReason`，不得将父能力标为 completed。由外层工作流按其合法 reason code 记录 blocked，不直接修改 Controller 状态。

顶部手机状态栏中的时间、信号、Wi-Fi、运营商、电量或系统指示差异，以及底部系统手势/小横条差异，仅用于判断对齐和安全区，不作为像素评分问题输出。应用前景组件与状态栏重叠必须作为布局问题输出。

## 停止条件

- 缺少参考图、ArkUI 工程路径或目标页面信息。
- 无法获得本地实现截图。
- 已确认当前运行页面与参考页面完全不匹配。
- 未达阈值但无法完成有效修复，或无法证明新代码已经部署并进入当前截图。
- 本轮 `compare_images` 对比无法完成，经子能力按其失败处理仍无法恢复。
