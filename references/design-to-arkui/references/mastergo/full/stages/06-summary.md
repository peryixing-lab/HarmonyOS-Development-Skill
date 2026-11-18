# 06 - 总结

本阶段读取并完整复用 `references/figma/full/stages/06-summary.md`，不复制维护第二份实现。首次进入时按原指令同步 Todo，最多一次。

仅替换以下来源参数，其他能力调用、产物和完成条件保持原语义：
- designSource=mastergo；原文 Anchor/Figma 输入身份、React 源 hash → `source/mastergo/input-contract.json` 的 identity、source 与 files。
- `source/figma/page.jsx` → contract.source.path（HTML / JSX / DSL 原样读取，不执行）；参考图 → `source/mastergo/reference-screenshot.png`，按 contract.reference.scale 使用，不假定 2 倍。
- `hmos-d2a-react-to-arkui` 及其 run state → `hmos-d2a-mastergo-to-arkui`、`stage2/hmos-d2a-mastergo-to-arkui-run.json`；组件、资源和页面注册的公共产物名称不变。
- capability ledger 中所有其他能力名、调用证据和评分父子流程不变。不得调用 Figma/Anchor 工具重新取数或切换来源。

同时写入 `summary.md`：记录官方 MCP 模式、输入身份、资源来源、复用组件、新增组件、示例数据/真实接口、验证范围和剩余限制。不得把输入校验或 fixture 测试写成真实设计端到端验证。
