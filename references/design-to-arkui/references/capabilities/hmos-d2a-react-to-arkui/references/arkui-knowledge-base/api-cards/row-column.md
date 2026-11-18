# Row / Column

## 概述

线性布局容器。Row 子元素水平排列，Column 子元素垂直排列。是其他布局的基础。

## 何时使用

- 少量普通流式子项，不具备列表/网格/瀑布流/轮播/tab 语义
- 同一行内的横向排列（图标+标题+操作按钮）
- 纵向结构排列（头部+正文+底部动作）
- 可滚动长列表优先用 List，规则网格优先用 Grid

## 构造

```ts
Row(value?: { space?: Length })
Column(value?: { space?: Length })
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `space` | Length | 0 | 主轴方向子项间距 |

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `justifyContent` | FlexAlign | 主轴排列方式 |
| `alignItems` | VerticalAlign(Row) / HorizontalAlign(Column) | 交叉轴对齐方式 |

子组件常用通用属性：

| 属性 | 说明 |
|---|---|
| `.layoutWeight(n)` | 剩余空间分配权重，实现"左侧固定、右侧自适应"。忽略元素本身尺寸设置 |
| `Blank()` / `Blank(min)` | 空白填充组件，在主轴方向自动填充空白空间 |
| `.width('xx%')` | 百分比宽度，自适应缩放 |

## 常见枚举

```
// justifyContent（主轴排列）
FlexAlign.Start          // 起始端对齐
FlexAlign.Center         // 居中
FlexAlign.End            // 尾端对齐
FlexAlign.SpaceBetween   // 两端对齐，中间间距相等，首尾无间距
FlexAlign.SpaceAround    // 等间距，首尾间距=中间间距的一半
FlexAlign.SpaceEvenly    // 等间距，首尾间距=中间间距

// alignItems
VerticalAlign.Top / Center / Bottom          // Row 的交叉轴
HorizontalAlign.Start / Center / End          // Column 的交叉轴

// direction（布局方向）
Direction.Ltr  // 从左到右（默认）
Direction.Rtl  // 从右到左
Direction.Auto // 按系统语言
```

## 展示情况

### 主轴间距
`Column({ space: 20 })` / `Row({ space: 35 })` 设置子项间距。

### 主轴排列方式
`justifyContent(FlexAlign.SpaceBetween)` 两端对齐；`FlexAlign.Center` 居中；`FlexAlign.Start` 起始端。

### 交叉轴对齐
Row：`alignItems(VerticalAlign.Top/Center/Bottom)`。Column：`alignItems(HorizontalAlign.Start/Center/End)`。

### 自适应拉伸
`Blank()` 在主轴方向自动填充空白空间，实现两端对齐效果。

### 自适应缩放
- `layoutWeight(n)`：父容器尺寸确定时，按权重分配剩余空间。如 `layoutWeight(1)` + `layoutWeight(2)` + `layoutWeight(3)` = 1:2:3 分配
- `.width('xx%')`：百分比宽度，任意尺寸设备下保持固定占比

### 自适应延伸
内容超出一屏时，外层包裹 `Scroll` 组件实现可滑动。`scrollable(ScrollDirection.Vertical/Horizontal)` 控制方向，`scrollBar(BarState.On)` 常驻滚动条，`edgeEffect(EdgeEffect.Spring)` 回弹。

## 最小可编译模板

```ts
Row({ space: 12 }) {
  Image($r('app.media.avatar')).width(32).height(32).borderRadius(16)
  Column({ space: 2 }) {
    Text(title).fontSize(14).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
    Text(meta).fontSize(12).fontColor('rgba(0,0,0,0.4)').maxLines(1)
  }
  .layoutWeight(1)
  .alignItems(HorizontalAlign.Start)
  Image($r('app.media.more')).width(24).height(24)
}
.width('100%')
.alignItems(VerticalAlign.Center)
```

两端对齐：

```ts
Row() {
  Text('Bluetooth').fontSize(18)
  Blank()
  Toggle({ type: ToggleType.Switch, isOn: true })
}
.width('100%').padding({ left: 12 })
```

## 约束

- Column 内部元素默认横向居中；要靠左时需设 `.alignItems(HorizontalAlign.Start)` 或用占满宽度的 Row 包裹
- Row 内部元素默认纵向居中
- 不要用固定 `.position({ left })` 把同一行的组件钉在截图坐标上
- 间距优先用 `space`、`padding`、子项 `margin`，不要臆造 `.gap(...)` 或二维 `space: { row, column }`
- `@Builder` 调用结果不能链式写样式；`this.buildToolbar().margin(...)` 会报 `Property 'margin' does not exist on type 'void'`
- `direction` 属性在 Column 上不生效
- 嵌套层数过深或子组件数量过多会产生额外性能开销
