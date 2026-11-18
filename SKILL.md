---
name: harmonyos-development-skill
description: >-
  开发、迁移、审查或调试 HarmonyOS NEXT 鸿蒙应用时使用。涵盖 ArkTS、ArkUI、Stage 模型、Navigation、状态管理、API 版本和权限、Pixso/Figma/MasterGo 设计转代码、DevEco Studio/CLI、Hvigor、HAP/HAR/HSP、签名部署、HDC、HiLog、JSCrash/CppCrash/AppFreeze、AppAnalyzer 和 DeepLink UI 验证。也用于查询随包提供的 OpenHarmony 离线知识。
---

# HarmonyOS Development Skill

## 开始任务

1. 确定用户要查资料、写代码、验证构建还是分析故障。只读任务从对应索引或日志开始。定位运行时故障时，先从日志提取异常和堆栈，再读相关源码。
2. 涉及工程时，从 `build-profile.json5`、`oh-package.json5`、`module.json5` 和现有代码确定工程根目录、模块、产品、项目兼容版本、编译 SDK 和状态管理版本。涉及设备时单独确认实际系统版本和目标设备。
3. 只读下方和任务有关的指南。`SKILL_ROOT` 是当前 `SKILL.md` 所在目录。各指南中的相对路径和脚本变量从该 `GUIDE.md` 所在专题目录解析。执行依赖工程上下文的命令时，从工程根目录用绝对路径调用包内脚本。

## ArkTS、ArkUI 与 API

- 查**工程架构、Stage、系统 Kit、权限、状态、导航、性能、CI 或发布**时，从 [HarmonyOS 开发主题索引](references/harmonyos-development-handbook/harmonyos-development/references/README.md) 查起，再选读 [开发手册](references/harmonyos-development-handbook/harmonyos-development/GUIDE.md) 及例程。
- **编写或修改 `.ets`、TS 转 ArkTS、ArkUI 生码**前，读 [ArkTS/ArkUI 编码指南](references/arkts-arkui-coding/GUIDE.md) 中匹配任务的 [API 卡片](references/arkts-arkui-coding/references/quick-apis/_index.md) 和 [规则卡片](references/arkts-arkui-coding/references/quick-rules/_index.md)。沿用工程已有的 V1 或 V2 状态模型。
- **查 API 签名、兼容版本、系统能力或权限**时，先核对目标 SDK 的 `.d.ts` 及官方文档中的 `@since`、`@deprecated`、`@syscap` 与权限说明。离线查询用 [OpenHarmony 知识索引](references/openharmony-knowledge/index.json) 和 [`knowledge.mjs`](scripts/knowledge.mjs)。先找主题 ID，再按小节读原文。引用时说明来源、版本和仍需核实的差异。
- **将 Pixso、Figma 或 MasterGo 设计稿转成 ArkUI** 时，按 [设计稿转 ArkUI 指南](references/design-to-arkui/GUIDE.md) 完成来源与工具预检，再选 Fast 或 Full，依次检查设计证据、布局、交互和构建结果。

## 构建、设备与验证

- 用 [DevEco CLI 工作流](references/deveco-cli-workflows/GUIDE.md) **检查、编译、签名、部署、管理设备、查日志或热重载**。环境缺少 `devecocli` 时，按 [工具链说明](references/toolchains.md) 选择工程已有的 Hvigor、ohpm 和 HDC。多设备时先确认并显式指定目标。
- **静态审查和修复编译错误**时，使用 [ArkTS 审查配方](references/harmonyos-development-handbook/harmonyos-development/recipes/review-arkts-code.md) 和 [构建排查配方](references/harmonyos-development-handbook/harmonyos-development/recipes/debug-build-error.md)。先区分环境、依赖、签名和源码错误，再按文件修复，重新运行相关检查和构建。结论引用退出状态、当前日志和产物。
- 做**应用或元服务体检**时，按 [AppAnalyzer 验证指南](references/app-quality-verification/GUIDE.md) 选择手动 UX、自动遍历或前台功耗，核对真机和模拟器的能力差异，并按 [报告格式](references/app-quality-verification/references/report-format.md) 解读结果。
- **用临时 DeepLink 简化 UI 验证**时，按 [DeepLink UI 验证指南](references/deeplink-ui-verification/GUIDE.md) 保存基线、缩短准备路径、部署验证，再恢复工程和设备上的基线应用并复查。核心业务动作和授权按原流程验证。

## 故障分析

- 收到 **AppFreeze、CppCrash 或系统 JSCrash FaultLog** 时，先按 [故障日志分诊指南](references/fault-log-analysis/GUIDE.md) 运行 `scripts/identify_fault_log.py`，再加载 [AppFreeze](references/fault-log-analysis/references/appfreeze/analyzer.md)、[CppCrash](references/fault-log-analysis/references/cppcrash/analyzer.md) 或 [JSCrash](references/fault-log-analysis/references/jscrash/analyzer.md) 专项。
- 排查 **ArkTS/JavaScript 运行异常**时，查 [ArkTS 崩溃调试指南](references/arkts-crash-debugging/GUIDE.md)，按需用 Node.js 解析用户提供的日志或采集设备证据。根据栈帧修复，具备设备条件时复现并验证。
- 安装到其他编程 Agent 见 [README](README.md#安装到编程-agent)，各专题来源与许可见 [来源说明](references/sources.md)。
