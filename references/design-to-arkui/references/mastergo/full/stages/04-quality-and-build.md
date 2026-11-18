# 04 - 完成 HDS 适配、质量审计与最终构建

本阶段读取并完整复用 `references/figma/full/stages/04-quality-and-build.md`，不复制维护第二份实现。首次进入时按原指令同步 Todo，最多一次。

仅替换以下来源参数，其他能力调用、产物和完成条件保持原语义：
- designSource=mastergo；原文 Anchor/Figma 输入身份、React 源 hash → `source/mastergo/input-contract.json` 的 identity、source 与 files。
- `source/figma/page.jsx` → contract.source.path（HTML / JSX / DSL 原样读取，不执行）；参考图 → `source/mastergo/reference-screenshot.png`，按 contract.reference.scale 使用，不假定 2 倍。
- `hmos-d2a-react-to-arkui` 及其 run state → `hmos-d2a-mastergo-to-arkui`、`stage2/hmos-d2a-mastergo-to-arkui-run.json`；组件、资源和页面注册的公共产物名称不变。
- capability ledger 中所有其他能力名、调用证据和评分父子流程不变。不得调用 Figma/Anchor 工具重新取数或切换来源。

`stage4-quality-audit.json.build` 必须记录实际最终构建的 success、command、exitCode、completedAt；所有 critical/major 问题清零后再提交 passed。
