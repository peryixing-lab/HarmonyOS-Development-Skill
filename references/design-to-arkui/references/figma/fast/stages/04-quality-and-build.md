# 04 - 完成 HDS 适配、质量审计与最终构建

## 阶段元数据

- id: 04
- title: 04 - 完成 HDS 适配、质量审计与最终构建
- variant: fast
- designSource: figma
- instruction: references/figma/fast/stages/04-quality-and-build.md
- 必用能力: ArkTS 代码质量 skill；需要 HDS 时使用 `hmos-d2a-arkui2hds`

## 强制阶段入口 Todo 同步

读取 `stage-start.todoPayloadPath`，将 `.todos` 原样调用一次 `todowrite`；成功前不得执行阶段工作。

## 执行

读取阶段 2/3 最终代码和报告，形成 `hds-decision.json`；需要 HDS 时加载能力 `hmos-d2a-arkui2hds`（注册表 → references/capabilities/hmos-d2a-arkui2hds/INSTRUCTIONS.md），并完整执行。调用代码质量 skill，完成几何布局、HDS、系统 UI 沉浸、顶部碰撞、视口边界、安全区单位、坐标归一化和资源完整性审计，再执行最终构建。不得通过删除 UI、替换占位资源或降级高阶组件来通过。

Ledger 生命周期（沿用阶段 2、3 已建立的 `<designToArktsFastRunDir>/capability-invocation-ledger.json`，不创建第二份 ledger）：

1. 调用任何 ArkTS 代码质量 skill 前，在 `<designToArktsFastRunDir>/capability-invocation-ledger.json` 写入该实际 skill 的 `invoked` 记录和唯一 `invocationId`。
2. `hds-decision.json.hdsRequired=true` 时，调用 `hmos-d2a-arkui2hds` 前在上述 ledger 记录独立的 `invoked` 生命周期；`hdsRequired=false` 时不伪造该能力调用，只在 `hds-decision.json` 记录不调用理由。
3. 每次 skill 调用成功并且输出完成校验后，使用原 `invocationId` 将对应记录更新为 `completed`，记录实际输入、输出和结果。
4. 调用失败时记录真实失败状态和错误，不得写成 `completed`。
5. 阶段 4 通过前，必用质量 skill 必须存在匹配的 completed 记录；HDS required 时 `hmos-d2a-arkui2hds` 也必须存在 completed 记录。

Fast 没有后续独立视觉校准，所以本阶段必须处理所有可静态发现的 critical/major 视觉与边界问题。输出：

```text
stage4-quality-audit.json
stage4-quality-audit.md
stage4-build-report.md
hds-decision.json
```

全部审计通过且构建成功后调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsFastRunDir> --stage 4 --result passed
```
