# Grid

## 概述

网格容器，子组件为 GridItem。支持行列数量与占比、跨行跨列、规则排列、可滚动网格、自适应。二维布局，子组件等比例自适应。

## 何时使用

- item 宽高一致或比例一致，x/y 间距规律
- 多列图片、宫格入口、规则商品卡片、九宫格
- 不要默认写成多层 Row

## 构造

```ts
Grid(scroller?: Scroller, layoutOptions?: GridLayoutOptions)
```

`scroller` 为滚动控制器；`layoutOptions` 用于跨行跨列等不规则布局配置。

GridLayoutOptions:

| 字段 | 说明 |
|---|---|
| `regularSize` | `[number, number]`，常规 item 占用行列数，默认 `[1,1]` |
| `irregularIndexes` | `number[]`，不规则 item 的索引（仅设一个 template 时生效） |
| `onGetIrregularSizeByIndex` | 返回 `[rowSpan, columnSpan]`，设置不规则 item 占用行列数 |
| `onGetRectByIndex` | 返回 `[rowStart, columnStart, rowSpan, columnSpan]`，同时设两个 template 时使用 |

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `columnsTemplate` | string | 列数与占比，如 `'1fr 1fr 1fr'`=3 列等宽。fr 前数字控制占比 |
| `rowsTemplate` | string | 行数与占比 |
| `columnsGap` | Length | 列间距 |
| `rowsGap` | Length | 行间距 |
| `layoutDirection` | GridDirection | 主轴方向（仅不设 template 时生效） |
| `maxCount` | number | 主轴方向最大网格数（仅不设 template 时生效） |
| `minCount` | number | 主轴方向最小网格数 |
| `cellLength` | Length | 单个网格固定尺寸 |
| `cachedCount` | number | 预加载数量，只在 LazyForEach 中生效 |
| `scrollBar` | BarState | 滚动条显示 |
| `edgeEffect` | EdgeEffect | 边缘滑动效果 |

## 事件

| 事件 | 说明 |
|---|---|
| `onScrollIndex(first, last)` | 当前显示的首尾子节点索引变化 |
| `onReachStart` / `onReachEnd` | 滚动到首/尾 |
| `onScrollBarUpdate` | 滚动条状态变化 |

GridItem 属性：

| 属性 | 说明 |
|---|---|
| `.rowStart` / `.rowSpan` | 起始行号 / 占用行数 |
| `.columnStart` / `.columnSpan` | 起始列号 / 占用列数 |

## 常见枚举

```
GridDirection.Row     // 先从左到右，排满一行再排下一行
GridDirection.Column  // 先从上到下，排满一列再排下一列

EdgeEffect.Spring  // 回弹
EdgeEffect.None    // 无（Grid 默认）
EdgeEffect.Fade    // 阴影

BarState.Auto / Off / On
```

## 展示情况

### 三种布局情况
1. **行列数量与占比同时设置**：Grid 只展示固定行列数元素，其余不展示，不可滚动（推荐）
2. **只设一个 template**：元素按设置方向排布，超出可滚动。设 `columnsTemplate`→垂直滚动；设 `rowsTemplate`→水平滚动
3. **都不设**：由布局方向、单个网格宽高等决定，不可滚动

### 不均匀网格（跨行跨列）
通过 `GridLayoutOptions` 的 `onGetRectByIndex` 返回 `[rowStart, columnStart, rowSpan, columnSpan]` 实现跨行跨列，如计算器按键。

### 可滚动网格
仅设 `columnsTemplate` 不设 `rowsTemplate`，当内容超出 Grid 区域时垂直可滚动。同理仅设 `rowsTemplate` 时水平可滚动。

## 最小可编译模板

```ts
Grid() {
  ForEach(this.items, (item: string) => {
    GridItem() { Text(item) }
  }, (item: string) => item)
}
.columnsTemplate('1fr 1fr')
.rowsTemplate('1fr 1fr')
.columnsGap(10)
.rowsGap(15)
```

可滚动版本：

```ts
Grid() {
  LazyForEach(this.dataSource, (item: MyItem) => {
    GridItem() { /* item 内容 */ }
  }, (item: MyItem) => item.id)
}
.columnsTemplate('1fr 1fr 1fr')
.columnsGap(8).rowsGap(8).cachedCount(3)
```

## 约束

- Grid 的子组件必须是 GridItem，不能直接放 Text/Image 等
- 当设置了 `rowsTemplate` 或 `columnsTemplate` 时，`layoutDirection`、`maxCount`、`minCount`、`cellLength` 不生效
- `layoutDirection` 仅在不设 rowsTemplate 和 columnsTemplate 时生效
- 仅设 rowsTemplate 时主轴为水平方向，交叉轴为垂直方向；仅设 columnsTemplate 时反之
- 若覆盖层只作用于局部行或局部 item 但底层仍是统一规则宫格，优先保持一个完整 Grid
- tile 内部有角标或渐变时，tile 内再用 Stack，不要因覆盖层拆分 Grid
- cachedCount 增大会增加 CPU/内存开销
