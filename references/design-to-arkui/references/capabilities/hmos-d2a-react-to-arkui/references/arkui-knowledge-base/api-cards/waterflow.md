# WaterFlow

## 概述

瀑布流容器，子组件为 FlowItem。支持纵向和横向布局、懒加载、无限滚动、动态列数、分组混合布局。后入栈的 FlowItem 覆盖在前面的上面（Z 序）。

## 何时使用

- 两列或多列卡片，x 坐标稳定，同列 y 递增，但不同列卡片高度不一致
- 购物商品流、资讯信息流、视频/图片错列卡片
- 不要把 WaterFlow 手工拆成左右两个 Column

## 构造

```ts
WaterFlow(value?: WaterFlowOptions)
```

WaterFlowOptions:

| 参数 | 类型 | 说明 |
|---|---|---|
| `footer` | CustomBuilder | 尾部组件（分组混合布局时不支持单独设置 footer） |
| `scroller` | Scroller | 滚动控制器 |
| `layoutMode` | WaterFlowLayoutMode | 布局模式 |
| `sections` | WaterFlowSections | 分组混合布局 |

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `columnsTemplate` | string | 纵向布局列数与占比，如 `'1fr 1fr'`=2 列等宽。fr 前数字控制占比 |
| `rowsTemplate` | string | 横向布局行数与占比 |
| `columnsGap` | Length | 列间距 |
| `rowsGap` | Length | 行间距 |
| `layoutMode` | WaterFlowLayoutMode | 布局模式（也可在构造参数中设） |
| `cachedCount` | number | 预加载数量，只在 LazyForEach 中生效。显示区域前后各缓存 cachedCount×列数 个 item |
| `scrollBar` | BarState | 滚动条显示 |
| `edgeEffect` | EdgeEffect | 边缘滑动效果 |

## 事件

| 事件 | 说明 |
|---|---|
| `onReachEnd` | 滚动到底部时触发 |
| `onScrollIndex(first, last)` | 当前显示的首尾子节点索引变化时触发，可用于提前加载数据 |

FlowItem 属性：

| 属性 | 说明 |
|---|---|
| `.width('100%')` | 宽度由列宽决定，写 100% 即可 |
| `.aspectRatio(ratio)` | 通过宽高比控制 item 高度，实现不等高效果 |

## 常见枚举

```
WaterFlowLayoutMode.ALWAYS_TOP_DOWN  // 默认，始终从上到下
WaterFlowLayoutMode.SLIDING_WINDOW   // 滑动窗口模式（常用，支持动态切换列数）

EdgeEffect.Spring  // 回弹
EdgeEffect.None    // 无（WaterFlow 默认）
EdgeEffect.Fade    // 阴影

BarState.Auto  // 按需显示
BarState.Off   // 不显示
BarState.On    // 常驻
```

## 展示情况

### 基础纵向瀑布流
设置 `columnsTemplate`，如 `'1fr 1fr'` 为 2 列。第一行从左到右排列，第二行起每个子节点放置在当前总高度最小的列；多列同高时从左到右填充。

### 横向瀑布流
设置 `rowsTemplate`，每个子节点放置在当前总宽度最小的行。

### 无限滚动
在 `onReachEnd` 或 `onScrollIndex` 回调中对 LazyForEach 数据源追加数据。增量数据用 `onDatasetChange([{ type: DataOperationType.ADD, index, count }])` 通知，不要整列 reload。

### 提前加载
在 `onScrollIndex` 中判断 `last + 阈值 >= totalCount`，提前加载数据，避免触底停顿。

### 动态切换列数
通过状态变量控制 `columnsTemplate` 的 fr 重复次数，如 `'1fr '.repeat(this.columns)`。推荐使用 SLIDING_WINDOW 模式以获得更快的列数转换。

### 分组混合布局
通过 `sections: WaterFlowSections` 在单个 WaterFlow 内实现不同区域不同列数/间距。每个 SectionOptions 可设 `itemsCount`、`crossCount`、`columnsGap`、`rowsGap`、`margin`。所有分组的 itemCount 之和需等于数据源子节点总数。

## 最小可编译模板

```ts
WaterFlow() {
  LazyForEach(this.dataSource, (item: MyItem) => {
    FlowItem() {
      // item 内容
    }
    .width('100%')
    .aspectRatio(item.ratio)
  }, (item: MyItem) => item.id)
}
.columnsTemplate('1fr 1fr')
.layoutMode(WaterFlowLayoutMode.SLIDING_WINDOW)
.width('100%')
.height('100%')
.cachedCount(2)
```

## 约束

- 子组件必须是 FlowItem；GridItem 不适用于 WaterFlow
- 列宽和列间距由 `columnsTemplate` / `columnsGap` 控制，不要用 `.gap(...)` 或 CSS 风格的 `space: { row, column }`，这些不是合法参数
- 增量数据用 `onDatasetChange([ADD])` 通知，不要直接修改 dataArray 后调 `onDataReloaded()`，会触发全量重算
- 分组混合布局时不支持单独设置 footer，用最后一个分组代替
- 增加或删除数据后需同步修改对应分组的 itemCount
- 不要把 WaterFlow 拆成两个 Column，除非 ArkUI WaterFlow 无法还原目标错列位置
