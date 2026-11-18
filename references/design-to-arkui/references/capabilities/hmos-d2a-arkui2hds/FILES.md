# Whitelist of files to include in skill_files for hmos-d2a-arkui2hds
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note HDS 材质迁移能力（阶段4/质量构建阶段）：INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md

# --- References ---
# @note references/components.md 说明 HDS 官方组件清单与替换映射；migration-patterns.md 是迁移模式；do-not-invent-attributes.md 明确禁止虚构不存在的属性；config-examples.md 提供配置示例
references/components.md
references/config-examples.md
references/do-not-invent-attributes.md
references/migration-patterns.md

# --- Case assets ---
# @note assets/cases/case1-direct-replacement/ 是官方组件直接替换的前后对照案例（OriginalTabsPage.ets → HdsTabsPage.ets），README.md 说明案例用法
assets/cases/case1-direct-replacement/HdsTabsPage.ets
assets/cases/case1-direct-replacement/OriginalTabsPage.ets
assets/cases/case1-direct-replacement/README.md
