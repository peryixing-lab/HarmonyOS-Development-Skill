# Whitelist of files to include in skill_files for hmos-d2a-ui-reconstruction-score
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note 单轮还原度评分能力（仅被 hmos-d2a-arkui-scoring-workflow 调用）：INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md
# @note scripts/ui_score.py 是评分执行脚本（VLM 视觉比对打分），由能力指令调用
scripts/ui_score.py

# --- References ---
# @note references/analysis_workflow.md 定义分析流程；scoring_schema.md 定义评分结果 schema；vlm_prompt.md 是 VLM 评分提示词
references/analysis_workflow.md
references/scoring_schema.md
references/vlm_prompt.md
