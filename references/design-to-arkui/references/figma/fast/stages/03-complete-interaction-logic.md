# 03 - 补全 ArkTS 业务交互逻辑

## 阶段元数据

- id: 03
- title: 03 - 补全 ArkTS 业务交互逻辑
- variant: fast
- designSource: figma
- instruction: references/figma/fast/stages/03-complete-interaction-logic.md
- 加载能力 `hmos-d2a-arkts-logic-completer`（注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md），并完整执行

## 强制阶段入口 Todo 同步

读取 `stage-start.todoPayloadPath`，将 `.todos` 原样调用一次 `todowrite`；成功前不得执行阶段工作。

## 执行

读取需求澄清、`stage2/generated-ui-manifest.json`、自动采用的组件方案和实际 ETS 文件；在 `<designToArktsFastRunDir>/capability-invocation-ledger.json` 记录并加载能力 `hmos-d2a-arkts-logic-completer`（注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md），并完整执行。只补充阶段 2 尚未实现的业务状态、事件、导航、数据和动效，不重新设计静态结构，不创建重复状态源。保持首帧稳定，写入 `stage3-interaction-report.md` 并完成必要构建/类型检查。

能力缺失或业务逻辑无法构建时 blocked；不得用主 Agent 手写替代。满足条件后调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsFastRunDir> --stage 3 --result passed
```
