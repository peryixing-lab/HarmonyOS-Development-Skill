# MasterGo 运行时契约

先读取并遵守 `references/runtime-contract.md` 中的 Controller、Todo、Gate、blocked 和恢复规则。MasterGo 使用独立来源 mastergo，Full 六阶段、Fast 五阶段；init 增加 --source mastergo。原 Pixso/Figma catalog 及既有摘要不变。

来源专用输入见 `input-contract.md`。阶段 1 使用官方 MCP 并导入真实输入；阶段 2 使用 mastergo-to-arkui 能力。Full 阶段 2 request → 用户确认 → accepted → resume_confirmed_stage → 实现、构建 → passed；Fast 自动采用方案。Full 确认后的输入/方案不得改变，修订需重新确认。

阶段 3/4 与 Full 阶段 5、总结直接读取对应 Figma 原阶段文件，按 MasterGo wrapper 映射来源字段。能力名、HDS 决策、业务状态补全、导航/Index 保护、评分阈值与轮数规则不变。Full 默认启用评分，只有显式 enabled=false 才能 skipped；Fast 不声称视觉评分完成。

Controller 会校验原始输入 hash、视觉工具证据、同 invocation 的方案生成与转换记录、初次构建、公共页面注册、资源绑定及最终构建。全流程保持 MasterGo 来源，禁止为通过旧 Gate 伪造 Figma 或 Anchor 文件。MasterGo 尚无 design-doc 自动恢复协议，缺失关键确认文件按实际错误处理。

## 阶段 2 补采

阶段 1 的读取窗口是输入冻结边界；阶段 2 发现遗漏节点、截图或资源时，使用 Controller 建立同目录下的新 run：

```sh
node <skillRoot>/scripts/workflow.mjs --mode reacquire --run-dir <oldRunDir> --new-run-dir <newSiblingRunDir> --reason "补采遗漏节点和资源"
```

只允许阶段 2 的 running、awaiting_confirmation 或 blocked 状态；目标目录必须不存在。旧 run 标为 blocked 并指向新 run，旧输入、方案、确认快照保留供审计，不能再继续实现。新 run 从阶段 1 开始，重新读取完整输入并验证身份、资源清单和哈希；不复制旧 Gate 或用户确认。新 Full run 必须重新展示方案并获得确认，Fast 重新校验后自动采用。已有工程文件保留，按新 run 的工程分析决定复用，不自动回滚或删除。

阶段 3 之后需要更换设计时按新任务初始化 run，不将已完成阶段伪装成阶段 1。

## 阶段产物维护

阶段 3 以后的产物清单由 MasterGo catalog 的 `requiredOutputs` 定义，最终构建 JSON 由 `buildEvidence` 指定，Controller 不另存文件名列表。`reusesInstructionPath` 指向共享 Figma 阶段说明；更新共享产物名时同时更新 catalog，并在独立验证环境检查产物一致性及 Figma 回归，不将 skill 测试加入 Code 单元测试。
