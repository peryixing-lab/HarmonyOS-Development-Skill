# Whitelist of files to include in skill_files for hmos-d2a-arkts-logic-completer
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note 交互逻辑补全能力（Pixso/Figma 阶段7 Full / 阶段3 Fast）：INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md

# --- Component reference cards ---
# @note references/<Component>.md 是 ArkUI/HDS 组件的交互逻辑参考卡片，按设计稿中实际出现的组件按需加载，不一次性全部加载
references/ActionBar.md
references/AlphabetIndexer.md
references/Badge.md
references/BottomTab.md
references/Button.md
references/Checkbox.md
references/CheckboxGroup.md
references/Chips.md
references/Counter.md
references/Dialog.md
references/HdsActionBar.md
references/HdsListItem.md
references/HdsListItemCard.md
references/HdsNavDestination.md
references/HdsNavigation.md
references/HdsSideBar.md
references/HdsSideMenu.md
references/HdsSnackBar.md
references/HdsTabs.md
references/HdsVisualComponent.md
references/List.md
references/Menu.md
references/ModelSheet.md
references/MultiWindowEntryInAPP.md
references/NavDestination.md
references/Navigation.md
references/PatternLock.md
references/Picker.md
references/PopupTip.md
references/Progress.md
references/QRCode.md
references/Radio.md
references/Rating.md
references/Refresh.md
references/ScrollBar.md
references/Search.md
references/SegmentedButton.md
references/Select.md
references/Slider.md
references/SnackBar.md
references/SubHeader.md
references/SubTab.md
references/Swiper.md
references/Switch.md
references/Tabs.md
references/Text.md
references/TextClock.md
references/TextInput.md
references/TextSelection.md
references/TitleBar.md
references/Toast.md
references/Toggle.md
references/Toolbar.md

# --- Cross-component logic patterns ---
# @note references/patterns/ 是跨组件通用逻辑模式（数据获取、表单校验、状态管理、HDS 迁移），按页面功能需要加载
references/patterns/data-fetching.md
references/patterns/form-validation.md
references/patterns/hds-migration.md
references/patterns/state-management.md

# --- Evals ---
# @note evals/ 用于校验 references/ 卡片与索引的一致性（validate_references.py），evals.json 定义校验用例
evals/evals.json
evals/validate_references.py
