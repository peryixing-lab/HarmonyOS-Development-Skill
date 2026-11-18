# Whitelist of files to include in skill_files for hmos-d2a-arkui-component-best-practices
# Lines starting with # are comments; empty lines are ignored
# @note lines add informational annotations to skill_files

# @note ArkUI 组件最佳实践识别能力（Pixso/Figma 阶段4）：INSTRUCTIONS.md 是能力入口指令，由入口 skill 的能力注册表调度
INSTRUCTIONS.md
# @note scripts/search-practices.mjs 是组件实践检索脚本，由能力指令按需调用
scripts/search-practices.mjs

# --- Practice index ---
# @note references/component-practice-index.md/.json 是组件→实践主题索引；article-coverage-map.md 记录主题与文章的覆盖关系
references/component-practice-index.json
references/component-practice-index.md
references/article-coverage-map.md

# --- Pattern topic files ---
# @note references/*-patterns.md 是按 UI 场景分类的实践主题文件，依据设计稿命中的组件/场景按需加载
references/drawing-shape-patterns.md
references/grid-drag-layout-patterns.md
references/hds-immersive-material-patterns.md
references/image-resource-fit-patterns.md
references/input-focus-keyboard-patterns.md
references/layout-containers-patterns.md
references/list-grid-scroll-patterns.md
references/list-lazy-refresh-patterns.md
references/misc-components-patterns.md
references/navigation-routing-patterns.md
references/picker-select-menu-patterns.md
references/scroll-nested-gesture-patterns.md
references/selection-controls-patterns.md
references/slider-progress-feedback-patterns.md
references/stack-patterns.md
references/swiper-carousel-patterns.md
references/tabs-navigation-patterns.md
references/tabs-patterns.md
references/text-image-video-patterns.md
references/text-rich-display-patterns.md
references/video-playback-fullscreen-patterns.md
references/xcomponent-native-patterns.md
