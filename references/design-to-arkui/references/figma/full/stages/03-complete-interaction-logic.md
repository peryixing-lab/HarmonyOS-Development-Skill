# 03 - 补全 ArkTS 业务交互逻辑

## 阶段元数据

- id: 03
- title: 03 - 补全 ArkTS 业务交互逻辑
- variant: full
- designSource: figma
- instruction: references/figma/full/stages/03-complete-interaction-logic.md
- 加载能力 `hmos-d2a-arkts-logic-completer`（注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md），并完整执行

## 强制阶段入口 Todo 同步

读取 `stage-start.todoPayloadPath`，将 `.todos` 原样调用一次 `todowrite`；成功前不得执行阶段工作。

## 目标

在 `hmos-d2a-react-to-arkui` 已完成的组件树和静态布局上补全需求明确或可安全推断的状态、事件、导航、数据和动效，不重新设计页面结构。

## 执行

1. 读取 `requirement-clarification.json`、`stage2/generated-ui-manifest.json`、组件分析/确认记录、实现报告和实际 ETS 文件。
2. 在 `<designToArktsRunDir>/capability-invocation-ledger.json` 记录并加载能力 `hmos-d2a-arkts-logic-completer`（注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md），并完整执行；缺失时阻塞，不得以主 Agent 手写替代。
3. 区分能力在阶段 2 已实现的基础组件状态与尚未实现的业务行为，避免重复绑定事件或创建两套状态源。
4. 补全列表数据、选中态、输入、点击、页面跳转、加载/空/错误态和必要动效；真实接口未提供时遵循需求澄清中的数据策略。
5. 保持首帧稳定，异步数据不得导致首帧结构跳变；不破坏内容组件与 Index 注册结构的边界。
6. 写入 `stage3-interaction-report.md`，记录功能映射、修改文件、未实现项和构建/类型检查结果；`<designToArktsRunDir>/capability-invocation-ledger.json` 更新 completed。

完成条件：需求映射完整、无重复状态源、构建通过。随后调用 `stage-complete --stage 3 --result passed`；真实阻塞使用稳定 reason code。
