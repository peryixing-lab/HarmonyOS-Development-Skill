# Whitelist of files to include in skill_files for hmos-design-to-arkts
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# --- Entry core ---
# @note GUIDE.md 的「能力注册表」表是所有能力的调度入口：阶段指令要求“加载能力 X”时，按注册表「指令路径」列读取对应 INSTRUCTIONS.md 全文并完整执行；能力内部相对路径相对其能力目录（references/capabilities/<能力名>/）解析，不相对入口 skill 根目录
# @note scripts/workflow.mjs 是 Controller 脚本（init/status/stage-start/confirm/stage-complete），阶段文件不预读，只按 stage-start 返回的 instructionPath 渐进加载
GUIDE.md
scripts/workflow.mjs
# @note scripts/pixso-arkts/ 为 Pixso 内置 DSL→ArkTS 转换引擎；call-pixso-arkts.mjs 是命令行入口，pixso-arkts.js 是默认引擎实现
scripts/pixso-arkts/pixso-arkts.js
scripts/pixso-arkts/call-pixso-arkts.mjs

# --- Entry-level references ---
# @note runtime-contract.md 定义 Controller 状态机与恢复协议；requirement-clarification.md 定义需求预检字段映射与澄清文档规范；design-doc-auto-recovery.md 是 design-doc.md 缺失时的自动恢复指令；mcp-dependency.md 是 Pixso/Figma 路径的 MCP 依赖检查指引（检查方法、判定与安装引导）
references/runtime-contract.md
references/requirement-clarification.md
references/design-doc-auto-recovery.md
references/mcp-dependency.md

# --- Stage catalogs ---
# @note catalog JSON 是阶段→stage 文件的映射（instructionPath、requiresConfirmation 等）；选定来源与 variant 后由 Controller 读取对应 catalog
references/pixso/stage-catalog-full.json
references/pixso/stage-catalog-fast.json
references/figma/stage-catalog-full.json
references/figma/stage-catalog-fast.json

# --- Pixso Full stage files (10) ---
references/pixso/full/stages/01-acquire-pixso-dsl.md
references/pixso/full/stages/02-generate-skeleton-and-assets.md
references/pixso/full/stages/03-understand-repository.md
references/pixso/full/stages/04-select-component-practices.md
references/pixso/full/stages/05-design-and-confirm-component-tree.md
references/pixso/full/stages/06-implement-static-layout.md
references/pixso/full/stages/07-complete-interaction-logic.md
references/pixso/full/stages/08-quality-build-and-audits.md
references/pixso/full/stages/09-visual-calibration.md
references/pixso/full/stages/10-summary.md

# --- Pixso Fast stage files (9) ---
references/pixso/fast/stages/01-acquire-pixso-dsl.md
references/pixso/fast/stages/02-generate-skeleton-and-assets.md
references/pixso/fast/stages/03-understand-repository.md
references/pixso/fast/stages/04-select-component-practices.md
references/pixso/fast/stages/05-design-component-tree.md
references/pixso/fast/stages/06-implement-static-layout.md
references/pixso/fast/stages/07-complete-interaction-logic.md
references/pixso/fast/stages/08-quality-build-and-audits.md
references/pixso/fast/stages/09-summary.md

# --- Figma Full stage files (6) ---
references/figma/full/stages/01-acquire-figma-react-source.md
references/figma/full/stages/02-convert-react-to-arkui.md
references/figma/full/stages/03-complete-interaction-logic.md
references/figma/full/stages/04-quality-and-build.md
references/figma/full/stages/05-visual-calibration.md
references/figma/full/stages/06-summary.md

# --- Figma Fast stage files (5) ---
references/figma/fast/stages/01-acquire-figma-react-source.md
references/figma/fast/stages/02-convert-react-to-arkui.md
references/figma/fast/stages/03-complete-interaction-logic.md
references/figma/fast/stages/04-quality-and-build.md
references/figma/fast/stages/05-summary.md

# --- Capability INSTRUCTIONS.md (9, dispatch targets of the 能力注册表 in GUIDE.md) ---
# @note 每个能力的完整文件清单见其能力目录下的 FILES.md（references/capabilities/<能力名>/FILES.md）
references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md
references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md
references/capabilities/hmos-d2a-arkui-scoring-workflow/INSTRUCTIONS.md
references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md
references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md
references/capabilities/hmos-d2a-repo-understand/INSTRUCTIONS.md
references/capabilities/hmos-d2a-responsive-layout-generator/INSTRUCTIONS.md
references/capabilities/hmos-d2a-solution-design/INSTRUCTIONS.md
references/capabilities/hmos-d2a-ui-reconstruction-score/INSTRUCTIONS.md

# --- Evals (dev-time) ---
# @note evals/evals.json 定义入口决策点校验用例（来源识别/双来源冲突/参数冲突/缺 node-id 澄清），开发态产物，运行时不加载
evals/evals.json

# --- MasterGo Full/Fast ---
references/capabilities/hmos-d2a-mastergo-to-arkui/INSTRUCTIONS.md
references/mastergo/acquire.md
references/mastergo/convert.md
references/mastergo/fast/stages/01-acquire-mastergo-context.md
references/mastergo/fast/stages/02-convert-mastergo-to-arkui.md
references/mastergo/fast/stages/03-complete-interaction-logic.md
references/mastergo/fast/stages/04-quality-and-build.md
references/mastergo/fast/stages/05-summary.md
references/mastergo/full/stages/01-acquire-mastergo-context.md
references/mastergo/full/stages/02-convert-mastergo-to-arkui.md
references/mastergo/full/stages/03-complete-interaction-logic.md
references/mastergo/full/stages/04-quality-and-build.md
references/mastergo/full/stages/05-visual-calibration.md
references/mastergo/full/stages/06-summary.md
references/mastergo/input-contract.md
references/mastergo/mcp-setup.md
references/mastergo/runtime-contract.md
references/mastergo/stage-catalog-fast.json
references/mastergo/stage-catalog-full.json
scripts/mastergo-source.mjs
scripts/mastergo-capture.mjs
scripts/mastergo-connection.mjs
scripts/mastergo-evidence.mjs
scripts/mastergo-community-start.mjs
scripts/mastergo-community-verify.mjs
references/mastergo/community/README.md
references/mastergo/community/LICENSE
references/mastergo/community/manifest.json
references/mastergo/community/deveco-community.patch
references/capabilities/hmos-d2a-mastergo-to-arkui/FILES.md
