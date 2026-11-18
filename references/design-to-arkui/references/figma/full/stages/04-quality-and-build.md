# 04 - 完成 HDS 适配、质量审计与最终构建

## 阶段元数据

- id: 04
- title: 04 - 完成 HDS 适配、质量审计与最终构建
- variant: full
- designSource: figma
- instruction: references/figma/full/stages/04-quality-and-build.md
- 必用能力: ArkTS 代码质量 skill；需要 HDS 时使用 `hmos-d2a-arkui2hds`
- 子 Agent: 可用于审计，但主 Agent 负责最终产物和 `<designToArktsRunDir>/capability-invocation-ledger.json`

## 强制阶段入口 Todo 同步

读取 `stage-start.todoPayloadPath`，将 `.todos` 原样调用一次 `todowrite`；成功前不得执行阶段工作。

## 执行

1. 读取阶段 2/3 最终代码、组件分析、资源 manifest、初次构建报告和需求澄清。
2. 根据项目依赖、设计语义和用户偏好写入 `hds-decision.json`。需要 HDS 时加载能力 `hmos-d2a-arkui2hds`（注册表 → references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md），并完整执行并在 `<designToArktsRunDir>/capability-invocation-ledger.json` 记录 completed；不需要时记录可审计理由。
3. 调用 ArkTS 代码质量 skill，修复类型、状态、生命周期、资源、路由和 API 使用问题，不得通过删除真实 UI、替换占位块或降级组件来通过构建。
4. 独立执行几何布局、HDS、系统 UI 沉浸、顶部碰撞、视口边界、安全区单位和坐标归一化审计。假状态栏、假 Home Indicator、整页绝对定位和缺失真实资源均视为阻塞问题。
5. 执行最终构建/类型检查，失败时正向定位并做局部修复后重跑。
6. 输出 `stage4-quality-audit.json`、`stage4-quality-audit.md`、`stage4-build-report.md`、`hds-decision.json` 和所需审计报告。

所有 critical/major 问题清零、HDS 决策落实、资源完整且最终构建通过后，调用 `stage-complete --stage 4 --result passed`；否则 blocked。
