# Whitelist of files to include in skill_files for hmos-d2a-solution-design
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note 设计方案能力：design-doc.md 的唯一写入者（Pixso 阶段5 / Figma 经 hmos-d2a-react-to-arkui 调用；含 restore_missing_design_doc 修复模式）。INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md

# --- References ---
# @note references/design-spec.md 定义 design-doc.md 的产出规范；arkts-standards.md 是 ArkTS 规范约束；increment-design.md、module-design-mode.md、animation-design.md 分别覆盖增量设计、模块设计模式与动效设计
references/animation-design.md
references/arkts-standards.md
references/design-spec.md
references/increment-design.md
references/module-design-mode.md

# --- Template assets ---
# @note assets/design-template.md 是 design-doc 主模板；assets/template-*.md 是按功能域（UI 页面、网络、数据存储、设备能力、多媒体）的章节模板，按功能需要加载
assets/design-template.md
assets/template-data-storage.md
assets/template-device-capability.md
assets/template-multimedia.md
assets/template-network.md
assets/template-ui-page.md
