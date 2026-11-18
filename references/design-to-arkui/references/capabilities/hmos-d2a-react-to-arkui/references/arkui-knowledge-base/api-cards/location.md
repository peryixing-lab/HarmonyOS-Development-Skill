# 通用位置属性 (align / direction / position / markAnchor / offset)

## 概述

通用属性，适用于所有组件。控制组件在父容器中的绝对定位、相对偏移、对齐方式和锚点。这些属性是基础属性，实现局部覆盖层时必读。

## 何时使用

- `position`：绝对定位，组件相对父组件内容区的位置。父容器为 Row/Column/Flex 时设了 position 的子组件不占位。适用于悬浮按钮、角标、局部覆盖层。
- `offset`：相对偏移，组件相对原本布局位置进行偏移，不脱离文档流。
- `align`：设置容器元素绘制区域内的子元素对齐方式。在 Stack 中与 alignContent 效果一致。
- `markAnchor`：设置元素定位时的锚点，在 position/offset 基础上进一步偏移。
- `direction`：设置容器内主轴方向布局。LTR/RTL/Auto。
- `alignRules`：RelativeContainer 中子组件的对齐规则。
- `layoutGravity`：Stack 中子组件的对齐规则（API20+，优先级高于 align）。

## 属性

### align

```ts
align(value: Alignment): T
```

设置容器元素绘制区域内的子元素的对齐方式。只在 Stack、FolderStack、Shape、Button、Marquee、StepperItem、Text、TextArea、TextInput、RichEditor、Hyperlink、SymbolGlyph、ListItem、GridItem、Scroll、FlowItem 等组件中生效。文本相关组件的 align 结果参考 textAlign。默认值：Alignment.Center。

### direction

```ts
direction(value: Direction): T
```

设置容器内主轴方向上的布局。auto 时按系统语言方向。在 Column 上不生效。默认值：Direction.Auto。

### position

```ts
position(value: Position | Edges | LocalizedEdges): T
```

绝对定位，确定子组件相对父组件内容区的位置。父组件内容区 = 父组件大小 - border - padding - safeAreaPadding。

- Position 类型 `{ x, y }`：基于父组件内容区左上角
- Edges 类型 `{ top, right, bottom, left }`：基于父组件内容区四边边距
- 父容器为 Row/Column/Flex 时，设了 position 的子组件不占位
- RelativeContainer 中设了 alignRules 的子组件，position 不生效
- 不支持在宽高为零的布局容器上设置

### markAnchor

```ts
markAnchor(value: Position | LocalizedPosition): T
```

设置元素定位时的锚点，从 position 或 offset 的位置上进一步偏移。

- `.position({x: v1, y: v2}).markAnchor({x: v3, y: v4})` 效果 = `.position({x: v1-v3, y: v2-v4})`
- 单独使用 `.markAnchor({x: v1, y: v2})` 效果 = `.offset({x: -v1, y: -v2})`

### offset

```ts
offset(value: Position | Edges | LocalizedEdges): T
```

相对偏移，组件相对原本的布局位置进行偏移。不影响父容器布局，仅在绘制时调整位置。

- 和 position 一起使用时，position 生效，offset 不生效
- Position 类型基于组件自身左上角偏移
- Edges 类型基于组件自身四边偏移
- `{x: x, y: y}` 与 `{left: x, top: y}` 及 `{right: -x, bottom: -y}` 效果相同

### alignRules

```ts
alignRules(value: AlignRuleOption): T  // API9+
alignRules(alignRule: LocalizedAlignRuleOptions): T  // API12+，支持 RTL 镜像
```

仅当父容器为 RelativeContainer 时生效。设置子组件相对锚点组件的对齐规则。

AlignRuleOption 字段：

| 字段 | 说明 |
|---|---|
| `left` / `right` / `middle` | `{ anchor: string, align: HorizontalAlign }` |
| `top` / `bottom` / `center` | `{ anchor: string, align: VerticalAlign }` |
| `bias` | `{ horizontal, vertical }` 偏移比例（API11+） |

### layoutGravity

```ts
layoutGravity(alignment: LocalizedAlignment): T  // API20+
```

单独设置 Stack 容器中子组件的对齐规则。与 align 同时使用时，layoutGravity 优先级更高。

## 常见枚举

```
// Alignment（align / Stack alignContent 通用，九宫格）
Alignment.TopStart    Alignment.Top       Alignment.TopEnd
Alignment.Start       Alignment.Center    Alignment.End
Alignment.BottomStart Alignment.Bottom    Alignment.BottomEnd

// Direction
Direction.Ltr  // 从左到右
Direction.Rtl  // 从右到左
Direction.Auto // 按系统语言

// HorizontalAlign（alignRules 横向）
HorizontalAlign.Start / Center / End

// VerticalAlign（alignRules 纵向）
VerticalAlign.Top / Center / Bottom

// LocalizedAlignment（layoutGravity，API20+，支持镜像）
LocalizedAlignment.CENTER / START / END / TOP / BOTTOM / TOP_START / TOP_END / BOTTOM_START / BOTTOM_END

// 不存在 Alignment.BottomCenter / TopCenter / MiddleLeft 等组合名
```

## 展示情况

### 绝对定位覆盖层
`position({ top: 6, right: 6 })` 精确定位角标在卡片右上角。

### 相对偏移微调
`offset({ x: 0, y: -2 })` 不脱离文档流的微小位置调整。

### Stack 中 align vs position
`alignContent: Alignment.TopStart` 控制所有子元素默认位置；子组件 `.position({ right, bottom })` 精确定位特定覆盖层。不要混用 align 和 alignContent 表达同一定位意图。

### markAnchor 锚点
通过 markAnchor 调整定位锚点，实现以组件中心或特定点为基准的定位。

### RelativeContainer 对齐规则
`alignRules({ top: { anchor: '__container__', align: VerticalAlign.Top } })` 相对容器顶部对齐。支持链式布局（chainMode）、权重分配（chainWeight）。

## 最小可编译模板

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Image($r('app.media.cover')).width('100%').height('100%')
  Image($r('app.media.badge'))
    .width(26).height(26)
    .position({ top: 6, right: 6 })
}
.width('100%').height(180).clip(true)
```

## 约束

- `.align()` 设置的是该组件子组件的定位逻辑，不是该组件自身在父容器中的定位。在 Stack 中用 `alignContent` 控制子组件位置
- 不要把整页翻译成大量 `.position()` 坐标；先归纳区域、重复结构和高阶组件候选
- 局部 `Stack + position` 不要承载本可用 Row/Column/Flex 表达的流式内容
- 就近原则：组件靠右侧或底部更近时，优先用 `position({ right, bottom })` 而非 `position({ left, top })`
- 不要在宽高为零的布局容器上设置 position
- RelativeContainer 中设了 alignRules 的子组件，position 不生效
- `Alignment.BottomCenter` 等枚举名不存在
