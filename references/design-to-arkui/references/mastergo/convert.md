# MasterGo → ArkUI（阶段 2）

加载并完整执行 `hmos-d2a-mastergo-to-arkui`（`references/capabilities/hmos-d2a-mastergo-to-arkui/INSTRUCTIONS.md`），传 runDir、variant、confirmationPolicy（Full manual / Fast auto-accept）、runStatePath。主 Agent 负责 Full 用户确认，不启动其他子 Agent。

必需输入与产物见 `references/mastergo/input-contract.md`。阶段内读取 source contract，不能调用 Figma/Anchor 工具重新取数。Full 从 accepted 继续当前 invocation，不重复 stage-start/Todo/组件分析；Fast 不询问确认。

生成与实际源码一致的 startup-page-policy 和 generated-ui-manifest，字段沿用 Figma 阶段 2 的公共注册契约：Index 唯一 @Entry、独立导出 @Component 页面、EntryAbility 加载 pages/Index、main_pages 保留 pages/Index、targetPageFile/componentName/route/registrationFile 一致。工程根目录及 Index/EntryAbility/main_pages/runIndexFile 必须等于阶段 1 integrationSnapshot。首次模板且无业务首页/历史页才能默认展示本页；其他情况保留原默认页，除非用户明确要求改变。

阶段 2 真实构建结果写 `stage2/initial-build-report.json`（success=true、非空 command、exitCode=0、合法 completedAt）。Controller 在阶段 2 Gate 通过后写 run-index，Agent 不提前登记、不刷新历史记录。只在全部完成后 stage-complete 2 passed；缺少资源、模型、能力或构建失败时按稳定原因 blocked。
