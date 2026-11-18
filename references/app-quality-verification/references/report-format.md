# result.json 字段说明

## 示例

同时含 UX 与功耗问题的 `result.json`：

```json
{
  "reportVersion": "1.0",
  "generateTime": "2026-10-29T10:30:30+08:00",
  "taskId": "36e6e3eb-341c-4380-9468-607d41981724",
  "bundleName": "com.example.powerdemon",
  "deviceInfo": {
    "deviceId": "29L***193",
    "deviceModel": "Example Foldable Phone",
    "apiVersion": "23"
  },
  "uxIssues": [
    {
      "scene": "Avoid Area",
      "page": "entry/src/main/ets/pages/XcpFilter.ets",
      "ruleName": "Hole area adaptation",
      "testSeq": 2,
      "result": "failed",
      "details": [
        {
          "pageState": "Single-screen state",
          "screenshot": "...\\files\\fold_ori_state_screen_20261029101807_hole.jpeg",
          "layout": "...\\files\\fold_ori_state_layout_20261029101807.json",
          "arkLayout": "...\\files\\fold_ori_state_ark_20261029101807.json",
          "componentId": 91,
          "componentType": "Text",
          "sourceFile": "entry/src/main/ets/pages/XcpFilter.ets:120",
          "location": [412, 48, 596, 111],
          "errorMsg": "Text overlap exists in the hole area: ,widget bounds:[412, 48, 596, 111]"
        }
      ]
    }
  ],
  "powerIssues": [
    {
      "scene": "Front Standby",
      "page": "entry/src/main/ets/pages/XcpFilter.ets",
      "ruleName": "Hardware Synthesis Not Used",
      "testSeq": 3,
      "result": "fail",
      "metricValue": "28.82 frame per second",
      "perfdata": "...\\files\\app-analyzer-20261029101844.perfdata",
      "details": [
        {
          "screenshot": "...\\files\\1029_101723_CLICK_endimage.jpeg",
          "errorMsg": "Node 138259292225622 with blur effect intersects self-rendering node 138259292225620",
          "componentId": "138259292225620",
          "componentName": "XComponent",
          "errorCount": "1968",
          "sourceFile": "entry/src/main/ets/pages/XcpFilter.ets:217"
        }
      ]
    }
  ]
}
```

## 顶层字段

| 字段 | 含义 |
|---|---|
| `reportVersion` | 报告格式版本 |
| `generateTime` | 报告生成时间（含时区） |
| `taskId` | 本次检测任务唯一标识 |
| `bundleName` | 被检测应用/元服务包名 |
| `deviceInfo.deviceId` | 设备标识（脱敏） |
| `deviceInfo.deviceModel` | 设备型号 |
| `deviceInfo.apiVersion` | 系统 API 版本 |
| `uxIssues[]` | UX 问题列表，UX 检测时出现 |
| `powerIssues[]` | 功耗问题列表，功耗检测时出现 |

同时含 UX 与功耗场景时，两个数组都会出现。

## `uxIssues[]`

| 字段 | 含义 |
|---|---|
| `scene` | 问题所属场景（如 `Foundation`、`Avoid Area`） |
| `page` | 问题所在页面源码文件 |
| `ruleName` | 命中的检测规则名称 |
| `testSeq` | 测试序号，同一次检测内区分不同轮次 |
| `result` | 检测结果，`failed` 表示不通过 |
| `details[]` | 问题详情，同一规则可能命中多个组件或多个设备形态 |

### `uxIssues[].details[]`

字段随规则而变，常见如下：

| 字段 | 含义 |
|---|---|
| `pageState` | 问题发生时的设备形态，如 `Single-screen state`、`Dual-screen state landscape`、`Triple-screen state portrait` |
| `screenshot` | 问题截图文件路径 |
| `layout` | 该状态下的布局快照文件路径 |
| `arkLayout` | 该状态下的 ArkUI 节点树快照文件路径 |
| `componentId` | 问题组件标识 |
| `componentType` | 问题组件类型，如 `Text`、`Image`、`Slider` |
| `sourceFile` | 问题源码位置，格式 `文件路径:行号` |
| `location` | 组件在截图中的矩形区域，`[left, top, right, bottom]` |
| `errorMsg` | 具体问题描述 |

## `powerIssues[]`

| 字段 | 含义 |
|---|---|
| `scene` | 问题所属场景，功耗为 `Front Standby` |
| `page` | 问题所在页面源码文件 |
| `ruleName` | 命中的检测规则名称，如 `UI Idle Run`、`Hardware Synthesis Not Used`、`High load on foreground process` |
| `testSeq` | 测试序号 |
| `result` | 检测结果，`fail` 表示不通过 |
| `metricValue` | 规则指标值，如 `58.54 frame per second`、`97%` |
| `perfdata` | 该轮采集的性能数据文件路径 |
| `details[]` | 问题详情，可能为空数组 |

### `powerIssues[].details[]`

常见两种形态：

| 字段 | 含义 |
|---|---|
| `screenshot` | 问题截图文件路径 |
| `errorMsg` | 具体问题描述 |
| `componentId` / `componentName` / `errorCount` | 渲染类问题：组件标识、组件名、问题出现次数 |
| `threadName` / `methodName` / `costMs` | 线程负载类问题：线程名、方法名、耗时（毫秒） |
| `sourceFile` | 问题源码位置，格式 `文件路径:行号` |

