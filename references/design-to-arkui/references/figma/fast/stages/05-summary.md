# 05 - 总结

## 阶段元数据

- id: 05
- title: 05 - 总结
- variant: fast
- designSource: figma
- instruction: references/figma/fast/stages/05-summary.md

## 强制阶段入口 Todo 同步

读取 `stage-start.todoPayloadPath`，将 `.todos` 原样调用一次 `todowrite`；成功前不得执行阶段工作。

## 执行

校验阶段 1 至 4 的业务产物和实际工程文件，读取 `<designToArktsFastRunDir>/capability-invocation-ledger.json` 核对以下调用证据：

- 阶段 2：`hmos-d2a-react-to-arkui` 为 completed，invocationId 与阶段 2 运行产物一致。
- 阶段 3：`hmos-d2a-arkts-logic-completer` 为 completed。
- 阶段 4：实际使用的 ArkTS 代码质量 skill 为 completed。
- 阶段 4：仅当 `hds-decision.json.hdsRequired=true` 时，`hmos-d2a-arkui2hds` 必须为 completed；为 false 时核对可审计的不调用理由，不要求伪造调用记录。

ledger 缺失、无法解析、invocationId 不一致、必需 completed 记录缺失或失败记录被伪装为 completed 时，不得通过阶段 5。阶段 5 只读取并校验 ledger，不新增或补写前序 skill 的 completed 记录。

同时核对 Anchor 输入身份、React 源 hash、自动采用的组件方案、交互实现、HDS 决策和最终构建。写入 `<designToArktsFastRunDir>/completeness-report.md`，列出生成/修改文件、路由、功能、构建结果和已知限制；Fast 不声称已完成独立视觉校准。

满足条件后调用：

```text
workflow.mjs --mode stage-complete --run-dir <designToArktsFastRunDir> --stage 5 --result passed
```

Controller 返回 `sync_final_todo_then_finish` 后，读取 `todoPayloadPath`，把全量 completed `.todos` 原样调用一次 `todowrite`，再输出最终总结；不得运行后续 `stage-start`。
