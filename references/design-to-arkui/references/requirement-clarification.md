# 需求澄清文档

本文件定义需求澄清文档（`requirement-clarification.json`）的结构、字段说明和填充规则。

预检完成后，必须生成需求澄清文档。该文档由阶段 1 在创建运行目录时写入 `requirement-clarification.json`（Full 写入 `.deveco/design-to-arkts/runs/{runId}/`，Fast 写入 `.deveco/design-to-arkts-fast/runs/{runId}/`），是后续阶段的需求输入源。阶段 1 是该文件的唯一创建者；后续阶段只能更新本文档表格中分配给自己的字段，不得新建、整体覆盖或在文件缺失时临时补造，也不得覆盖预检阶段已经确定的用户选择和其它阶段已补全的字段。任何后续阶段发现文件缺失或损坏时，必须以 blocked 结束当前阶段，不得重建该文件。

## 目录

- [JSON 模板](#json-模板)
- [字段说明](#字段说明)
- [后续阶段使用规则](#后续阶段使用规则)

## JSON 模板

```json
{
  "preCheckCompleted": true,
  "clarificationTimestamp": "",
  "designSource": "pixso | figma | mastergo",
  "acquisitionMethod": "pixso-link | selected-design-node | developer-provided | figma-link | mastergo-link | mastergo-selection | mastergo-d2c",
  "targetPage": {
    "pageId": "",
    "pageName": "",
    "nodeId": "",
    "nodeName": "",
    "expectedRuntimeRoute": ""
  },
  "projectRootPath": "",
  "targetModule": "",
  "functionalDescription": {
    "layoutDescription": "",
    "featureDescription": "",
    "inferredFromDesign": false
  },
  "hdsUsagePreference": "use-hds | do-not-use-hds | workflow-decides",
  "systemUiPreference": {
    "drawStatusBar": false,
    "drawGestureBar": false,
    "immersiveRequired": true,
    "userOverrides": {}
  },
  "startupPagePolicy": {
    "userOverride": "replace | preserve | null"
  },
  "dataSource": {
    "userOverride": "real-api | null"
  },
  "visualCalibration": {
    "enabled": true,
    "scoreThreshold": 80,
    "maxRounds": 5
  },
  "dslCompleteness": {
    "hasOccurrence": null,
    "hasFull": null,
    "occurrencePath": "",
    "fullPath": ""
  },
  "assetProvisionMode": "developer-provided | pixso-mcp-export | anchor-local-assets",
  "assetRootPath": "",
  "assetMappingTablePath": ""
}
```

## 字段说明

### 预检收集项

预检阶段必须从用户输入中获取或向用户澄清后填写。

| 字段 | 类型 | 说明 |
|---|---|---|
| `designSource` | string | 设计平台，只允许 `pixso`、`figma` 或 `mastergo`。开发者提供 Pixso DSL 仍属于 `pixso` |
| `acquisitionMethod` | string | `pixso` 可用 `pixso-link`、`selected-design-node`、`developer-provided`；`figma` 当前只允许 `figma-link`；`mastergo` 可用 `mastergo-link`、`mastergo-selection`、`mastergo-d2c` |
| `targetPage` | object | 目标页面信息 |
| `targetPage.pageName` | string | 目标页面名称，用户指定或由当前来源工具读取 |
| `targetPage.nodeName` | string | 目标节点名称，用户指定时可填 |
| `targetPage.pageId` | string | 阶段 1 读取设计源后补全；Figma 没有独立 page id 时可留空并记录 file key |
| `targetPage.nodeId` | string | 阶段 1 读取来源的真实节点 ID 后补全（Pixso guid、Figma `node-id`或 MasterGo nodeId） |
| `targetPage.expectedRuntimeRoute` | string | 阶段 1 确定路由后补全 |
| `projectRootPath` | string | ArkTS 工程根目录。用户输入已包含则采用；当前工作目录是 ArkTS 工程则直接采用；否则预检提问 |
| `functionalDescription` | object | 功能描述 |
| `functionalDescription.layoutDescription` | string | 页面布局描述：页面结构、区域划分等 |
| `functionalDescription.featureDescription` | string | 功能描述：交互、页面跳转、动效等 |
| `functionalDescription.inferredFromDesign` | boolean | `true` 表示用户选择"基于设计稿自行推断"，此时 `layoutDescription` 和 `featureDescription` 留空，由阶段 1 读取 DSL 后补全；`false` 表示用户选择"用户补充功能描述"，此时 `layoutDescription` 和 `featureDescription` 由用户提供的文本填入，阶段 1 不再覆盖 |

### 用户输入推断项

用户在输入中明确提及则填写用户指定值，未提及则填写默认值。不主动询问。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `hdsUsagePreference` | string | `workflow-decides` | HDS 使用意向。Pixso 在方案设计阶段决定；Figma 在质量/HDS 阶段决定并落实 |
| `systemUiPreference` | object | 见下 | 系统 UI 偏好 |
| `systemUiPreference.drawStatusBar` | boolean | `false` | 是否绘制状态栏作为业务 UI |
| `systemUiPreference.drawGestureBar` | boolean | `false` | 是否绘制手势条作为业务 UI |
| `systemUiPreference.immersiveRequired` | boolean | `true` | 是否需要沉浸式 |
| `systemUiPreference.userOverrides` | object | `{}` | 用户指定的其它系统 UI 字段覆盖 |
| `assetProvisionMode` | string | 按来源 | Pixso 默认为 `pixso-mcp-export`；Figma 固定为 `anchor-local-assets`；用户提供 Pixso资源时为 `developer-provided`。MasterGo 资源以其 input-contract 与资源 manifest 为准，不套用其他来源枚举 |
| `assetRootPath` | string | `""` | 开发者提供时的资源根目录 |
| `assetMappingTablePath` | string | `""` | 开发者提供时的对照表路径 |
| `visualCalibration.enabled` | boolean | `true` | 仅 Full 使用；Pixso 为阶段 9，Figma/MasterGo 为阶段 5。用户明确跳过则为 `false` |
| `visualCalibration.scoreThreshold` | number | `80` | 每轮评分达标阈值；轮数上限见 `visualCalibration.maxRounds`（默认 5） |
| `visualCalibration.maxRounds` | number | `5` | 仅 Full 使用；最多有效评分轮数（含 Round 1 基线轮），1–5 的整数，仅可下调不可超过 5。用户明确提及轮数上限时写入 |

### 阶段自动判定项

预检阶段为 `null` 或空，由对应阶段探索后填写。

| 字段 | 类型 | 填写阶段 | 说明 |
|---|---|---|---|
| `targetModule` | string | 工程分析阶段 | Pixso 阶段 3 或 Figma/MasterGo 阶段 2 确认，默认 `entry` |
| `startupPagePolicy.userOverride` | string\|null | 工程分析阶段 | `null` 表示自动按工程现状判断；用户明确要求时为 `replace` 或 `preserve` |
| `dataSource.userOverride` | string\|null | 方案/转换阶段 | `null` 时从设计稿推断并默认模拟数据；用户明确真实接口时为 `real-api` |
| `dslCompleteness.hasOccurrence` | boolean\|null | 阶段 1 | 阶段 1 探索用户提供的 DSL 同级目录后填写 |
| `dslCompleteness.hasFull` | boolean\|null | 阶段 1 | 同上 |
| `dslCompleteness.occurrencePath` | string | 阶段 1 | occurrence DSL 文件路径 |
| `dslCompleteness.fullPath` | string | 阶段 1 | full DSL 文件路径 |

## 后续阶段使用规则

- **来源选择**：Controller init 前根据 `designSource` 选择 catalog；一经写入状态不得切换。`acquisitionMethod` 只决定该来源内部的获取方式。
- **阶段 1**：Pixso 获取并校验 DSL；Figma 通过 Anchor MCP 获取并校验 Tailwind JSX、截图和本地资源。
- **阶段 2**：Pixso 运行固定脚本生成骨架；Figma 加载能力 `hmos-d2a-react-to-arkui`（注册表 → references/capabilities/hmos-d2a-react-to-arkui/INSTRUCTIONS.md），并完整执行，消费需求澄清并生成方案、页面、资源接入和初次构建。
- **阶段 3**：探索工程结构，判定工程类型（新建模板/存量），写入 `startup-page-policy.json`；若 `startupPagePolicy.userOverride` 非 null，采用用户指定值；确认 `targetModule`。
- **阶段 4**（能力 `hmos-d2a-arkui-component-best-practices`，注册表 → references/capabilities/hmos-d2a-arkui-component-best-practices/INSTRUCTIONS.md）：使用 `functionalDescription`、`hdsUsagePreference`、`systemUiPreference` 作为输入识别 ArkUI 最佳实践；不在此阶段决定数据来源。
- **阶段 5**（能力 `hmos-d2a-solution-design`，注册表 → references/capabilities/hmos-d2a-solution-design/INSTRUCTIONS.md）：使用全部字段生成 `design-doc.md`、`system-ui-policy.json`、`viewport-boundary-spec.json`、`safe-area-unit-contract.json`、`system-ui-coordinate-normalization.json`、`hds-decision.json`、`startup-page-policy.json`；若 `dataSource.userOverride` 非 null，采用用户指定数据来源，否则从设计稿自动推断并默认使用模拟数据。
- **阶段 6**（实现页面静态布局）：通过阶段 5 生成的 `system-ui-policy.json`、`startup-page-policy.json`、`safe-area-unit-contract.json` 等间接消费需求澄清文档中的 `systemUiPreference`、`startupPagePolicy`、`hdsUsagePreference`。
- **阶段 7**（能力 `hmos-d2a-arkts-logic-completer`，注册表 → references/capabilities/hmos-d2a-arkts-logic-completer/INSTRUCTIONS.md）：通过阶段 5 设计文档间接消费 `functionalDescription` 中的交互、动效、数据描述。
- **阶段 8**（质量审计）：直接读取需求澄清文档，审计 `systemUiPreference`、`hdsUsagePreference` 是否在最终源码中正确实现。

上表阶段 3–8 使用 Pixso Full 编号，其他 variant 按各自 catalog 执行。Figma/MasterGo 阶段 3 补业务交互，阶段 4 完成 HDS/质量/最终构建，Full 阶段 5 直接读取 `visualCalibration`，阶段 6 总结；Fast 阶段 5 总结。各来源的后续阶段都优先消费来源无关的 `design-doc.md`、`component-tree.md` 和资源 manifest。

## MasterGo 来源

MasterGo 网页链接或桌面选区使用 designSource=mastergo；页面、工程、交互与数据策略复用公共预检。记录 acquisitionMethod=mastergo-link/mastergo-selection/mastergo-d2c、MasterGo mode=magic/vibe/community、serverName、documentId/nodeId 或待官方解析的短链接。先通过已有输入与工程探索补齐，缺少真实目标时一次澄清，不索取令牌。Full/Fast 目录、visualCalibration 配置和 Figma 相同；具体输入与首次连接见 mastergo/input-contract.md 和 mastergo/mcp-setup.md。
