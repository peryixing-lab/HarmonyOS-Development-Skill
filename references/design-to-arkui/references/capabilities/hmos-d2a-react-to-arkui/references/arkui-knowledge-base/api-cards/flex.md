# Flex

## 概述

弹性布局容器，支持布局方向、换行、主轴/交叉轴/多行对齐、自适应拉伸。比 Row/Column 更灵活，但性能略低。

## 何时使用

- 可换行标签流（一组标签 chip，需自动换行）
- 需要换行且控制多行对齐的场景
- 普通不换行的横向/纵向内容优先用 Row/Column
- 标签流不要误判为 Tabs（标签流只表达筛选/排序/话题，不切换内容页）

## 构造

```ts
Flex(value?: FlexOptions)
```

FlexOptions:

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `direction` | FlexDirection | Row | 布局方向 |
| `wrap` | FlexWrap | NoWrap | 是否换行 |
| `justifyContent` | FlexAlign | Start | 主轴排列方式 |
| `alignItems` | ItemAlign | Start | 交叉轴对齐方式 |
| `alignContent` | FlexAlign | Start | 多行时交叉轴对齐方式（仅 wrap 时生效） |

## 属性

子组件弹性属性：

| 属性 | 说明 |
|---|---|
| `.flexBasis(value)` | 子元素在主轴方向上的基准尺寸。设了则覆盖 width/height；值为 `'auto'` 时使用 width/height 值 |
| `.flexGrow(n)` | 父容器剩余空间分配给此组件的比例。未设的不参与分配 |
| `.flexShrink(n)` | 父容器空间不足时此组件的压缩比例 |
| `.alignSelf(ItemAlign.xxx)` | 子元素交叉轴对齐，覆盖父容器 alignItems 配置 |

## 常见枚举

```
// direction
FlexDirection.Row            // 水平正向（默认）
FlexDirection.RowReverse     // 水平反向
FlexDirection.Column         // 垂直正向
FlexDirection.ColumnReverse  // 垂直反向

// wrap
FlexWrap.NoWrap      // 不换行（默认）。子项总宽>父容器时被压缩
FlexWrap.Wrap        // 换行，每行按主轴方向排列
FlexWrap.WrapReverse // 换行，每行按主轴反方向排列

// justifyContent / alignContent（均为 FlexAlign）
FlexAlign.Start         // 起始端对齐
FlexAlign.Center        // 居中
FlexAlign.End           // 尾端对齐
FlexAlign.SpaceBetween  // 两端对齐，中间间距相等
FlexAlign.SpaceAround   // 等间距，首尾=中间的一半
FlexAlign.SpaceEvenly   // 等间距，首尾=中间

// alignItems / alignSelf
ItemAlign.Auto     // 使用容器默认配置
ItemAlign.Start    // 交叉轴首部
ItemAlign.Center   // 交叉轴居中
ItemAlign.End      // 交叉轴底部
ItemAlign.Stretch  // 交叉轴拉伸填充（未设尺寸时拉伸到容器尺寸）
ItemAlign.Baseline // 交叉轴文本基线对齐
```

## 展示情况

### 布局方向
Row/RowReverse/Column/ColumnReverse 控制子元素排列方向。

### 换行
NoWrap 时子项被压缩；Wrap 时换行排列。

### 主轴对齐
Start/Center/End/SpaceBetween/SpaceAround/SpaceEvenly，与 Row/Column 的 justifyContent 相同。

### 交叉轴对齐
容器设 `alignItems`，子元素可设 `alignSelf` 覆盖。Stretch 拉伸填充，Baseline 基线对齐。

### 多行内容对齐
`alignContent` 控制多行在交叉轴剩余空间内的对齐，只在 `wrap: FlexWrap.Wrap` 时生效。可选值同 FlexAlign。

### 自适应拉伸
- `flexBasis`：设基准尺寸，覆盖 width/height
- `flexGrow`：分配剩余空间。如 flexGrow(2) + flexGrow(3) 以 2:3 分配
- `flexShrink`：空间不足时压缩。如 flexShrink(3) + flexShrink(2) 以 3:2 比例压缩

## 最小可编译模板

```ts
Flex({ wrap: FlexWrap.Wrap }) {
  ForEach(this.tags, (tag: string) => {
    Text(tag)
      .fontSize(13).fontColor('#333')
      .padding({ left: 10, right: 10, top: 4, bottom: 4 })
      .borderRadius(12).backgroundColor('#F5F5F5')
      .margin({ right: 6, bottom: 6 })
  }, (tag: string) => tag)
}
.width('100%')
```

## 约束

- 不要直接照搬 CSS 语义；`gap` 不是合法参数
- 可换行标签流优先用 `Flex({ wrap: FlexWrap.Wrap }) + 子项 margin`，不要写 `.gap(...)` 或 `space: { row: 6, column: 6 }`
- 不需要换行时优先用 Row/Column，Flex 性能略低于线性布局
- 不要把有选中态且控制下方内容区的标签流写成 Flex；那应该是 Tabs
- `alignContent` 仅在多行 Flex 布局中生效
