# Whitelist of files to include in skill_files for hmos-d2a-repo-understand
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note 仓库结构理解能力（Pixso/Figma 阶段3）：INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md

# --- Methodology ---
# @note references/methodology/ 是理解方法论（理解模式、维度识别、行为审计、差异分析、输出格式）
references/methodology/behavior-audit.md
references/methodology/diff-analysis.md
references/methodology/dimension-identification.md
references/methodology/output-format.md
references/methodology/understanding-modes.md

# --- Architecture patterns ---
# @note references/architecture-patterns/ 按 API/数据/逻辑/UI 四个架构维度提供模式识别参考，按需加载
references/architecture-patterns/api-architecture.md
references/architecture-patterns/data-architecture.md
references/architecture-patterns/logic-architecture.md
references/architecture-patterns/ui-architecture.md

# --- Engineering ---
# @note references/engineering/ 覆盖代码审计、编码规范与依赖管理
references/engineering/code-audit.md
references/engineering/coding-standards.md
references/engineering/dependency-management.md

# --- Best practices ---
# @note references/best-practices/ 是 UI 细节最佳实践（chip 推荐、新样式模式、标题遮罩）
references/best-practices/chip-recommendation.md
references/best-practices/new-style-patterns.md
references/best-practices/title-mask.md
