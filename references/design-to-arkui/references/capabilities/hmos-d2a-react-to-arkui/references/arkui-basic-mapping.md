# ArkUI 基础映射示例

这些示例用于高阶组件识别之后，把局部结构翻译成 ArkUI/ArkTS。不要用基础映射示例绕过 `WaterFlow`、`Swiper`、`Tabs`、`Grid`、`List` 的匹配判断。

## 目录

- [整屏背景](#整屏背景)
- [颜色渐变](#颜色渐变)
- [顶部栏或覆盖层](#顶部栏或覆盖层)
- [底部栏或覆盖层](#底部栏或覆盖层)
- [居中浮层](#居中浮层)
- [流式区块](#流式区块)
- [Row/Column 组合](#rowcolumn-组合)
- [可换行标签流](#可换行标签流)
- [Builder 外包一层再加样式](#builder-外包一层再加样式)
- [顶部封面加工具栏叠层](#顶部封面加工具栏叠层)
- [重复列表](#重复列表)
- [跨区头像与浮层](#跨区头像与浮层)
- [安全区规则](#安全区规则)
- [资源规则](#资源规则)
- [定位规则](#定位规则)
- [易错点](#易错点)

## 整屏背景

React:

```jsx
<div className="absolute inset-0 ..." />
```

ArkUI:

```ts
Stack() {
  Image($r('app.media.hero'))
    .width('100%')
    .height('100%')
}
.width('100%')
.height('100%')
```

这个示例只适用于纯背景层或全屏媒体层。不要把它扩展成“整页 `Stack` 里塞所有内容再逐个定位”；主体内容仍要先按顶部区域、tab、列表、网格、瀑布流和局部叠层归纳。
如果这是背景层，可以继续沉到安全区后面；不要因为 React 验证壳里带了假状态栏，就额外留白。

## 颜色渐变

React/Tailwind:

```jsx
<div className="bg-gradient-to-b from-black/60 to-transparent" />
<div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)' }} />
```

ArkUI:

```ts
Column() {
  // content
}
.width('100%')
.height('100%')
.linearGradient({
  angle: 135,
  colors: [
    ['#7C3AED', 0.0],
    ['#06B6D4', 1.0],
  ],
})
```

宽高要从 React/Figma 源节点还原。颜色透明度优先保留成 `rgba(...)`，`from-black/60` 这类 Tailwind 透明度要转成 alpha，不要丢成纯黑。

### 渐变方向说明

angle 属性为线性渐变的起始角度。角度为0度时渐变方向为从下往上（即0点方向）。0点方向顺时针旋转为正向角度。
取值范围：(-∞,+∞)，设置的值大于0时，按顺时针方向，小于0时，按逆时针方向。
默认值：180
角度为字符串时，合法的取值为纯数字或纯数字后带"deg"（度）、"rad"（弧度）、"grad"（梯度）、"turn"（圈）单位，例如："90"、 "90deg"、"1.57rad"。

特殊方向可使用 direction 属性
常见方向映射：
- `bg-gradient-to-b` / `linear-gradient(to bottom, ...)`：`GradientDirection.Bottom`
- `bg-gradient-to-t` / `linear-gradient(to top, ...)`：`GradientDirection.Top`
- `bg-gradient-to-r` / `linear-gradient(to right, ...)`：`GradientDirection.Right`
- `bg-gradient-to-l` / `linear-gradient(to left, ...)`：`GradientDirection.Left`
- `bg-gradient-to-br`：`GradientDirection.RightBottom`
- `bg-gradient-to-bl`：`GradientDirection.LeftBottom`
- `bg-gradient-to-tr`：`GradientDirection.RightTop`
- `bg-gradient-to-tl`：`GradientDirection.LeftTop`

如果 React/Figma 给的是明确角度，优先保留角度。

```ts
.linearGradient({
  direction: GradientDirection.Right,
  colors: [
    ['#111827', 0.0],
    ['#6366F1', 0.42],
    ['#22D3EE', 1.0],
  ],
})
```

图片上的渐变遮罩要作为图片内部叠层处理，不要和图片拼成一个背景字符串：
文字渐变不要用多层 `Text` 模拟。目标 API 支持时，使用 `Text.shaderStyle(...)`，不支持时退化为纯色实现。

### 颜色格式说明
支持rgb、rgba或者argb的格式颜色。
rgb格式颜色示例：'#ffffff'、'rgb(255, 100, 255)'。
rgba格式颜色示例：'rgba(255, 100, 255, 0.5)'。
argb格式颜色示例：'#ff000000'。


## 顶部栏或覆盖层

React:

```jsx
<div className="absolute inset-x-0 top-0 ..." />
```

先判断它是不是页面级顶部区域：

- 有返回/关闭、标题、右侧动作，且主体内容从其下方开始：优先用工程已有标题栏
- 是搜索框组合、沉浸式媒体浮层、装饰性 header、复杂自定义视觉：再用 `Stack`/`Row` 局部搭建

页面级顶部区域不要直接套下面的 `Stack` 示例。只有确认它是自定义覆盖层时，才使用局部覆盖层：

```ts
Stack({ alignContent: Alignment.Top }) {
  Row() {
    // toolbar content
  }
  .width('100%')
}
```

子组件位置由 `alignContent` 决定；不要在子组件上用 `.align()` 调整其在 Stack 中的位置。

如果工程已有统一标题栏，优先复用，不要重复手搓一层标题区。需要避让系统栏时，再按工程当前 API 版本补 `safeAreaPadding(...)` 或明确顶部内边距。

## 底部栏或覆盖层

React:

```jsx
<div className="absolute inset-x-0 bottom-0 ..." />
```

先判断它是不是页面级底部栏或内容切换：

- 多个并列入口、选中态、图标+文字、对应内容区：优先用 `Tabs` 或工程已有底栏
- 单个或少量固定操作按钮、播放控制、评论输入框、沉浸式媒体操作区：再用底部锚定的 `Row`/`Stack`

页面级底部栏不要直接套下面的 `Stack` 示例。只有确认它是固定操作区或自定义覆盖层时，才使用局部底部覆盖：

```ts
Stack({ alignContent: Alignment.Bottom }) {
  Row() {
    // bottom actions
  }
  .width('100%')
}
```

底部交互内容要考虑真实安全区，不要用假 Home Indicator 垫高。

## 居中浮层

React:

```jsx
<div className="absolute inset-0 flex items-center justify-center ..." />
```

ArkUI:

```ts
Stack({ alignContent: Alignment.Center }) {
  Column() {
    // centered modal-ish content
  }
}
```

这个示例只适用于页面内自定义居中浮层、空状态、局部遮罩或强视觉弹层。若工程已有统一弹窗、半屏弹层、toast 或 overlay 组件，优先复用工程范式；不要用它承载普通页面主体。

## 流式区块

React:

```jsx
<div className="flex flex-col gap-12" />
```

ArkUI:

```ts
Column({ space: 12 }) {
  // children
}
```

这个示例只适用于少量普通流式子项。若子项是可滚动长列表、规则网格、瀑布流、分页轮播或 tab 内容区，先回到高阶组件识别，分别优先考虑 `List`、`Grid`、`WaterFlow`、`Swiper`、`Tabs`。横向排列同理，只有普通局部内容才优先用 `Row`。

若局部条带或状态层不改变底层重复关系，不要把局部拆成独立流式 section；优先保持整体使用原有高阶组件，再在整体上补充区域级覆盖层。

## Row/Column 组合

React:

```jsx
<div className="flex flex-col gap-8">
  <div className="flex items-center justify-between">
    <span>Title</span>
    <button>More</button>
  </div>
  <p>Description</p>
</div>
```

ArkUI:

```ts
Column({ space: 8 }) {
  Row() {
    Text('Title')
    Button('More')
  }
  .width('100%')
  .justifyContent(FlexAlign.SpaceBetween)
  .alignItems(VerticalAlign.Center)

  Text('Description') // 错误实现，ArkUI 中实际展示位置为横向居中

  Row() {
    Text('Description') // 正确实现，位置一致，横向靠左显示
  }
  .width('100%')
}
```

`Column` 负责纵向结构，`Row` 负责同一行内的横向排列。子项数量少且不具备列表、网格、瀑布流、轮播或 tab 语义时使用该组合；需要固定间距时优先使用 `space`、`padding` 或子项 `margin`。

注意：Column 内部元素默认横向居中，Row 内部元素默认纵向居中。使用 Column 时，当还原 react 中默认靠左的行为时，ArkUI 中需要使用一个占满整个宽度的 Row，来实现靠左效果，然后在此基础上设置内部元素相关属性，例如 padding、margin 等。使用 Row 时类同。

## 可换行标签流

React:

```jsx
<div className="flex flex-wrap gap-1.5">
  {tags.map(tag => <Tag key={tag} />)}
</div>
```

ArkUI:

```ts
Flex({ wrap: FlexWrap.Wrap }) {
  ForEach(tags, (tag: string) => {
    TagView({ tag })
      .margin({ right: 6, bottom: 6 })
  }, (tag: string) => tag)
}
```

这个示例只适用于普通可换行标签集合。若这些标签有选中态并控制下方内容区，先按 `Tabs` 处理；若是规则宫格入口，先按 `Grid` 处理。
不要默认写成 `space: { row: 6, column: 6 }`；这个在常见 ArkUI 版本里不是合法参数。

## Builder 外包一层再加样式

React:

```jsx
<Toolbar className="mt-4" />
```

ArkUI:

```ts
Column() {
  this.buildToolbar()
}
.margin({ top: 16 })
```

`this.buildToolbar().margin(...)` 这类写法会报 `Property 'margin' does not exist on type 'void'`，因为 `@Builder` 返回的是 UI 片段，不是可继续链式调用的实例。

## 顶部封面加工具栏叠层

React:

```jsx
<section className="relative">
  <img className="absolute inset-x-0 top-0 ..." />
  <Toolbar className="absolute inset-x-0 top-..." />
  <Profile className="relative z-10 ..." />
</section>
```

ArkUI:

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Image($r('app.media.cover'))

  Column() {
    this.buildToolbar()
  }
  .margin({ top: 54 })

  Column() {
    this.buildProfile()
  }
  .padding({ top: 116, left: 16, right: 16 })
}
```

这个示例适用于沉浸式封面、个人主页头图、媒体详情页头部等“背景图 + 覆盖工具栏 + 前景资料”的局部 hero/header。
如果工具栏是标准页面标题栏，或主体内容明确从标题栏下方开始，先按工程标题栏处理。确认它是沉浸式头图内部的覆盖层后，再用 `Stack + align/margin/padding`，不要退回整页 `.position()`。

## 重复列表

React:

```jsx
{items.map(item => <Card key={item.id} />)}
```

ArkUI:

```ts
List() {
  ForEach(this.items, (item: Item) => {
    ListItem() {
      CardView({ item })
    }
  }, (item: Item) => item.id)
}
```

这个示例只适用于纵向重复内容。若重复项形成规则多列，先用 `Grid`；若形成错列瀑布流，先用 `WaterFlow`；若是横向分页面板，先用 `Swiper`。如果只是少量静态纵向条目，也可以直接 `Column + ForEach`。关键是 key 要稳定。

## 跨区头像与浮层

React 中常见这种卡片结构：

```jsx
<div className="overflow-hidden rounded-xl">
  <div className="relative">
    <img />
    <img className="absolute left-4 bottom-[-16px] h-8 w-8 rounded-full" />
  </div>
  <div className="pt-6">...</div>
</div>
```

它的语义不是“头像固定在整页坐标”，而是：

- 图片区和文字区仍然是正常流式上下关系
- 头像以图片区底边为视觉锚点
- 头像一半压在图片内，一半进入文字区上方
- 外层卡片裁剪圆角，但图片区本身不应该裁掉头像的外溢部分

不要优先翻成：

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Image(...)
  this.buildAvatar()
    .align(Alignment.BottomStart)
    .margin({ bottom: -16 })
}
```

原因：

- `@Builder` 调用结果不是可继续链式样式化的组件实例，`this.buildAvatar().margin(...)` 会编译失败
- 即使用 `Row() { this.buildAvatar() }` 外包，父 `Stack({ alignContent: Alignment.TopStart })`、子节点自身尺寸、负 `bottom` margin 也不一定等价于 CSS `absolute bottom: -16px`
- 图片区 `Stack` 如果 `.clip(true)`，会裁掉头像跨出图片区的那一半

优先使用流式负边距表达跨区关系：

```ts
Column() {
  Stack({ alignContent: Alignment.TopStart }) {
    Image(item.image)
      .width('100%')
      .height('100%')
      .objectFit(ImageFit.Cover)

    Row() {
      this.buildBadge()
    }
    .margin({ left: 9, top: 9 })
  }
  .width('100%')
  .aspectRatio(342 / 456)
  .clip(true)

  Row() {
    this.buildAvatar(item)
  }
  .width('100%')
  .height(32)
  .margin({ left: 16, top: -16, bottom: -16 })

  Column() {
    // text area
  }
  .padding({ left: 12, right: 12, top: 24, bottom: 12 })
}
.backgroundColor('#FFFFFF')
.borderRadius(12)
.clip(true)
```

这种写法的锚点是“图片区结束后的流式边界 + 负 top margin”，视觉上等价于 React 的“图片区底边 + absolute bottom: -16px”，但更符合 ArkUI 的布局模型，也能避免头像错误排到 Stack 顶部。

只有在浮层必须覆盖多个内部区域且位置无法用流式负边距表达时，才考虑卡片级 `Stack`。如果使用卡片级 `Stack`：

- 底层放 `Column(ImageArea + TextArea)`
- 浮层作为卡片 Stack 的直接子节点
- 避免依赖 `@Builder` 调用后链式样式
- 明确记录它的锚点从“图片区底边”变成“卡片左上角 + top 偏移”
- 不要为了对齐简单引入整页固定坐标

## 安全区规则

- 背景层需要沉浸时，优先考虑 `expandSafeArea(...)`
- 顶部/底部真实交互内容需要避让时，优先考虑 `safeAreaPadding(...)` 或明确 padding
- 不要用假状态栏、假底部条去模拟系统安全区

## 资源规则

- 本地 SVG 默认可作为资源接入
- 如果只是静态展示，优先 `Image(...)`
- 如果需要局部着色、路径级动画或可交互矢量，再考虑 `Shape`、`Path`、`Canvas`

## 定位规则

- 局部定位遵循就近原则，不要逐字翻译原始 left，right 边距属性，优先考虑是否居中，然后考虑贴近左右上下，选取较近的锚点设置 padding 或 margin 等属性，选取新的锚点后重新计算边距/间隔。
- 在局部布局内部同时分析设计所有布局元素，可能出现多个元素靠左排列或靠右排列。
- 重构布局时，对增加的 `Row` 和 `Column` 等设置合理的 `.alignItems()`，保证在相同分辨率下和原始布局位置一致。

## 易错点

- `Alignment.BottomCenter` 这类枚举名不要想当然使用。常见可用值是 `Alignment.Top`、`Alignment.Bottom`、`Alignment.Center`、`Alignment.TopStart`、`Alignment.BottomStart`、`Alignment.TopEnd`。
- `@Builder` 调用结果不能继续链式写样式。要加 `.margin()`、`.padding()`、`.backgroundColor()` 时，外包一层真实容器。
- `Flex` 的参数不要直接照搬 CSS 语义。可换行标签流优先用 `Flex({ wrap: FlexWrap.Wrap }) + 子项 margin`。
- 自定义 tab item 内的下划线可用 `Stack({ alignContent: Alignment.Bottom })` 包文字和底线；这不代表跳过 `Tabs` 组件，也不要依赖整页绝对定位横线。
- 使用`TextInput` 时，未考虑默认 padding。未设置 padding 时，`TextInput`组件的默认值为{top: '8vp', right: '16vp', bottom: '8vp', left: '16vp' }，当设置组件`height`和`width`时，应考虑默认 padding 值，`height`的值应大于 top + bottom + fontSize，否则会导致文本被截断。
