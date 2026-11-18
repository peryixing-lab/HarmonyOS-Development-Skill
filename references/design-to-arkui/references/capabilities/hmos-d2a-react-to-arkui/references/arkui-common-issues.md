# ArkUI 常见问题 Checklist

这个文件收集 React/Tailwind 静态 DOM 转 ArkUI/ArkTS 后容易出现的通用问题。它不是某一个问题的专项说明，而是写完代码后、执行构建和视觉校验前必须过一遍的 FAQ checklist。

使用方式：

- 先完成结构归纳、高阶组件选择和 ArkUI 代码实现。
- 再按本文件的 checklist 检查目标页面或组件。
- 命中某项时，按“修复方式”做局部最小修改。
- 不要为了规避 checklist 问题而删除真实内容、替换资源或降级已识别的高阶组件。

## 目录

- [写完代码后 Checklist](#写完代码后-checklist)
- [FAQ: Stack 中子组件设置 align 未生效](#faq-stack-中子组件设置-align-未生效)
- [FAQ: 局部 Stack 过度坐标化](#faq-局部-stack-过度坐标化)
- [FAQ: 外溢背景层被父容器裁剪](#faq-外溢背景层被父容器裁剪)
- [FAQ: 横向子项间距丢失](#faq-横向子项间距丢失)
- [FAQ: TabBar 居左或居右样式未真实实现或文字长度不同导致换行](#faq-tabbar-居左或居右样式未真实实现或文字长度不同导致换行)
- [FAQ: 图片图标资源未真实接入](#faq-图片图标资源未真实接入)

## 写完代码后 Checklist

- [ ] `Stack` 覆盖层是否混用了父级 `alignContent` 和子组件 `.align(...)`？
- [ ] React 父容器没有 `overflow-hidden` 时，内部背景、渐变、光效、阴影或模糊层是否被 ArkUI 父 `Stack`/`Column` 意外 `.clip(true)` 截断？
- [ ] React/Tailwind 横向 `gap`、`space-x-*`、外层 `px-*`、item 宽度或 builder 根节点 padding 是否在 ArkUI 子项间距里显式保留？
- [ ] React/Figma 中 `TabBar` 是否有明确的居左或居右样式，是否存在不同长度的文字？
- [ ] 局部 `Stack + position` 是否承载了本可用 `Row`/`Column`/`Flex` 表达的头像、标题、元信息、正文、底部操作等流式内容？
- [ ] React 静态 DOM 中所有图片、SVG 和导出图标资源是否都已复制到 ArkUI 工程资源目录，并在 ArkUI 代码中通过真实资源引用使用？


## FAQ: Stack 中子组件设置 align 未生效

### 问题现象

在 `build()` 中使用 `Stack` 作为容器，设置 `alignContent` 为 `Alignment.Bottom`，同时对子组件设置 `align` 为 `Alignment.Center`。实际效果中，子组件的 `align: Alignment.Center` 未生效。

常见触发场景：

- 用 `Stack({ alignContent: Alignment.Bottom })` 表达底部覆盖层。
- 子组件又继续设置 `.align(Alignment.Center)` 或其他 `align`。
- 从 React `absolute left/top` 或 CSS 对齐语义迁移时，把父容器对齐和子组件对齐混用。

### 原因

重点：align 属性设置的是其子组件的定位逻辑，不是这个组件本身在其父组件中的定位逻辑。

`Stack` 布局默认采用单一对齐策略。设置 `alignContent` 或 `align` 属性后，所有子组件都按照此属性定位，子组件设置 `align` 其实是子组件的子组件的定位逻辑。

### 修复方式

- 对覆盖层优先选择一种定位策略：
  - 使用子组件 `.position({ top: x, right: x, left: x, bottom: x })` 表达明确的相对位置坐标。
  - 对 Figma/React 中明确的 `absolute left/top` 局部覆盖层，优先在卡片级或区域级 `Stack` 内使用 `.position({ })`，不要用 `margin` 模拟绝对定位。
- 如果需要分别控制多个覆盖元素的位置，拆成局部 `Stack`，每个覆盖元素使用清晰的单一定位方式。

### 代码示例

ArkUI:

```ts
    Stack({ alignContent: Alignment.TopStart }) {
      Image($r('app.media.selected'))
        .width(26)
        .height(26)
        .objectFit(ImageFit.Contain)
        .align(Alignment.TopEnd) // .align 设置的是 image 内部子组件属性，这个 image 组件实际显示位置以TopStart定位，靠左贴边，靠上距离 6，在左上角
        .margin({ top: 6, right: 6 })
    }

    Stack({ alignContent: Alignment.TopStart }) {
      Image($r('app.media.selected'))
        .width(26)
        .height(26)
        .objectFit(ImageFit.Contain)
        .position({ top: 6, right: 6 }) // position 设置的 image 本身的位置，靠顶部距离 6，靠右距离 6，在右上角
    }
```

## FAQ: 局部 Stack 过度坐标化

### 问题现象

React/Tailwind 静态 DOM 转 ArkUI 后，页面没有退化成整页绝对定位，但某个列表项、卡片、标题栏或内容块内部仍然几乎全靠 `Stack + position({ left, top })` 摆放。视觉在当前截图尺寸下接近，但文本、图标、标签或操作区一旦变长、变短、隐藏、换行、系统字体放大，内部元素就容易重叠、漂移或被裁掉。

常见触发场景：

- React 导出节点在同一个 `relative` item 内有大量 `absolute left/top`，但它们实际可以使用常规流式关系表达。
- 多个组件被整体翻译成一个固定 `Stack` 里。
- 多个同一个行的组件被固定到具体 x 坐标，而不是由同一行内的 `Row` 自然排布。

### 原因

Figma 导出的 React 常把局部 auto-layout 和普通文本行拆成绝对坐标。直接把这些坐标搬进 ArkUI 的局部 `Stack`，虽然比整页绝对定位范围小，但仍然没有恢复组件间的语义约束。ArkUI 布局失去了“左侧固定、右侧自适应”、“剩余空间填充”、“操作区贴右”、“两端对齐”等关系，后续内容变化时只能依赖原始截图宽度和文本长度。

### 修复方式

- 先把局部结构按语义重新分层：头部、主体、底部、分割线、角标、遮罩。只有真正重叠的区域继续使用 `Stack`。
- 对普通信息行优先使用 `Row`：靠左侧的图标放左侧，文本列使用 `.layoutWeight(1)`，右侧图标用 `Blank()` 或 `justifyContent(FlexAlign.SpaceBetween)` 贴边，不要用固定 `left` 把操作区钉在截图坐标上。
- 对纵向内容优先使用 `Column`：头部、正文、底部动作按自然顺序排列，用 `space`、`padding`、子项 `margin` 保留原始间距。
- 对可能变长的文字设置 `.maxLines(1)`、`.textOverflow({ overflow: TextOverflow.Ellipsis })` 或明确的多行限制，避免挤压其他组件。
- 对真实覆盖层，可以保留或增加一个更小的局部 `Stack`，并依照就近原则选择合理的锚定位置，不要全部使用 `left` 和 `top`，组件靠右侧或底部更近时，优先用右侧或底部锚定的 `position({ right, bottom })`，减少对固定宽度的依赖。
- 如果文本固定高度来自截图裁剪，应让 item 高度由 `Column` 内容自然撑开，并对正文设置明确的 `maxLines`。
- 重要：对增加的 `Row` 和 `Column` 设置合理的 `.alignItems()`，保证在相同分辨率下和原始布局位置一致。

### 代码示例

较脆弱的局部坐标写法：

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Image(avatar)
    .width(32)
    .height(32)
    .position({ left: 0, top: 4 })

  Text(title)
    .position({ left: 44, top: 0 })

  Text(meta)
    .position({ left: 44, top: 22 })

  Image(moreIcon)
    .position({ left: 320, top: 4 })

  Text(content)
    .position({ left: 0, top: 52 })
}
.height(132)
```

更灵活的结构：

```ts
Column({ space: 10 }) {
  Row({ space: 12 }) {
    Image(avatar)
      .width(32)
      .height(32)
      .borderRadius(16)

    Column({ space: 2 }) {
      Text(title)
        .fontSize(14)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      Text(meta)
        .fontSize(12)
        .fontColor('rgba(0, 0, 0, 0.4)')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .layoutWeight(1)
    .alignItems(HorizontalAlign.Start)

    Image(moreIcon)
      .width(24)
      .height(24)
  }
  .width('100%')

  Stack({ alignContent: Alignment.TopStart }) {
    Text(content)
      .width('100%')
      .fontSize(16)
      .lineHeight(24)
      .maxLines(3)

    Row()
      .width(72)
      .height(24)
      .linearGradient({
        direction: GradientDirection.Right,
        colors: [
          ['rgba(255, 255, 255, 0)', 0],
          ['#FFFFFF', 0.6],
        ],
      })
      .position({ right: 0, bottom: 0 })
  }
  .width('100%')

  Row() {
    Text(date)
      .layoutWeight(1)
      .fontSize(12)
      .fontColor('rgba(0, 0, 0, 0.4)')

    Row({ space: 12 }) {
      // actions
    }
  }
  .width('100%')
}
.width('100%')
```

## FAQ: 外溢背景层被父容器裁剪

### 问题现象

React/Tailwind 里某个顶部区域、卡片区域或 hero 区域，本来有渐变、光效、阴影、模糊背景向父容器外延展。转成 ArkUI 后，局部视觉突然变硬，过渡消失，或者下方内容区域缺少原图里的背景氛围。

常见触发场景：

- React 父容器是固定高度的 `relative` / `absolute` 容器，但没有 `overflow-hidden`。
- 父容器内部有更高、更宽或带负偏移的背景层，例如渐变、光斑、阴影、模糊蒙层、封面延展图。
- 后续内容从这个外溢背景覆盖范围内开始布局，依赖它形成沉浸式过渡。
- ArkUI 翻译时为了约束顶部或卡片尺寸，在父级 `Stack`、`Column` 或 `Row` 上加了 `.clip(true)`。

### 原因

React 中是否裁剪由 `overflow` 控制。父节点没有 `overflow-hidden` 时，即使父节点 bbox 较小，内部绝对定位背景层仍可绘制到父节点外部，并参与最终视觉叠加。

ArkUI 中 `.clip(true)` 会把子组件绘制限制在父容器边界内。把一个本来不裁剪的 React 父容器翻译成带 `.clip(true)` 的 ArkUI 父容器，会直接截断外溢背景、阴影或模糊层。这通常不会造成明显布局错位，但会造成颜色、层次、沉浸感和过渡区域不一致。

### 修复方式

- 先回到 React 源码确认父容器是否有 `overflow-hidden`、`overflow-clip` 或等价裁剪语义。
- 如果 React 父容器没有裁剪，ArkUI 对应的父级容器默认不要加 `.clip(true)`；需要明确表达时可写 `.clip(false)`。
- 如果只有某个前景区域需要裁剪圆角，把 `.clip(true)` 下放到该前景区域自身，不要放在承载外溢背景的父容器上。
- 外溢的是背景、光效或阴影时，保留它的真实尺寸和偏移；不要为了适配父容器高度把背景层压缩到父容器尺寸。
- 如果下方内容需要被外溢背景影响，避免给下方内容外层设置不透明背景盖住该背景层；必要时把背景层提升到共同父级 `Stack` 中。
- 只有 React 明确存在 `overflow-hidden`、圆角裁剪、图片裁剪或卡片内部裁切时，才在对应 ArkUI 容器上使用 `.clip(true)`。

### 代码示例

React:

```jsx
<section className="relative h-[96px]">
  <div className="absolute left-0 top-0 h-[220px] w-full bg-gradient-to-b from-black/50 to-transparent" />
  <div className="absolute left-4 top-12 h-10 w-[200px] rounded-full bg-white/10" />
</section>
<main className="relative -mt-2">
  {/* content starts while the gradient is still visible behind it */}
</main>
```

ArkUI:

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Row()
    .width('100%')
    .height(220)
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: [
        ['rgba(0, 0, 0, 0.5)', 0],
        ['rgba(0, 0, 0, 0)', 1],
      ],
    })

  Row()
    .width(200)
    .height(40)
    .backgroundColor('rgba(255, 255, 255, 0.1)')
    .borderRadius(20)
    .position({ left: 16, top: 48 })
}
.width('100%')
.height(96)
.clip(false)
```

如果同一区域里有需要裁剪的图片或卡片，应只裁剪该子区域：

```ts
Stack({ alignContent: Alignment.TopStart }) {
  Row()
    .width('100%')
    .height(180)
    .backgroundColor('rgba(255, 255, 255, 0.08)')

  Image($r('app.media.cover'))
    .width(160)
    .height(96)
    .borderRadius(12)
    .clip(true)
    .position({ left: 16, top: 40 })
}
.width('100%')
.height(100)
.clip(false)
```

## FAQ: 横向子项间距丢失

### 问题现象

React/Tailwind 里一组横向内容本来有明显间隔，转成 ArkUI 后文字、图标或卡片紧贴在一起。

常见触发场景：

- React 外层是 `flex` / `inline-flex`，同时有 `gap-*`、`space-x-*`、`px-*`。
- ArkUI 改成了 `ForEach` 渲染子项，但只保留了子项内容，没有给子项加宽度、padding 或 margin。
- 子项通过自定义 `@Builder` 传给高阶组件槽位，例如 tabBar、菜单项、横向列表项、筛选项。

### 原因

React 的 `gap` 是父容器对子元素之间的布局约束；ArkUI 的自定义 builder 通常只描述单个子项自身。把子项塞进 `Tabs`、`ListItem`、`GridItem` 或普通 `Row` 时，原始父容器的 `gap` 不会自动继承到 builder 里。

如果只翻译文字、颜色、字号和高度，而没有显式翻译横向节奏，ArkUI 会按子项内容的最小宽度排布，视觉上就会变成“没有间隔”。

### 修复方式

- 先判断 React 间距来自父容器 `gap/space-x`，还是子项自身 `px/mx/width`。
- 普通 `Row` 的直接子项间距可以优先使用 `Row({ space: x })` 表达；如果子项被包进 `@Builder`、`ListItem`、`GridItem`、`TabContent` 或其它槽位，仍要检查间距是否落在实际参与布局的根节点上。
- `ForEach` 渲染的横向子项，可以给每个子项加 `.margin({ right: x })`，或给子项内部加左右 padding；如果末尾多出的 right margin 会影响贴边或滚动宽度，要按 index 跳过最后一项的右边距。
- 自定义 builder 作为高阶组件槽位时，不要只返回贴合文字的最小宽度；应把 React 的 tab/item 宽度、左右 padding、固定高度或相邻 gap 显式落到 builder 根节点。
- 如果外层还有起始缩进，例如 `px-5`，要在承载这些子项的外层容器上保留对应 padding，不要误放到每个文字上。
- 不要凭 CSS 经验臆造 `.gap(...)`、二维 `{ row, column }` gap 或不存在的枚举；间距优先使用 ArkUI 已验证的 `space`、`padding`、子项 `margin`。

### 代码示例

React:

```jsx
<div className="flex px-4 gap-3">
  {items.map(item => <button key={item.id}>{item.label}</button>)}
</div>
```

ArkUI:

```ts
Row({ space: 12 }) {
  ForEach(this.items, (item: Item) => {
    Row() {
      Text(item.label)
        .fontSize(15)
        .fontColor('#FFFFFF')
        .maxLines(1)
    }
    .height(36)
    .padding({ left: 10, right: 10 })
    .justifyContent(FlexAlign.Center)
  }, (item: Item) => item.id)
}
.width('100%')
.padding({ left: 16, right: 16 })
```

如果这组子项会作为某个高阶组件的自定义槽位，builder 根节点也要承载宽度或 padding：

```ts
@Builder
private buildItemLabel(label: string) {
  Row() {
    Text(label)
      .fontSize(15)
      .fontColor('#FFFFFF')
      .maxLines(1)
  }
  .height(36)
  .padding({ left: 10, right: 10 })
  .justifyContent(FlexAlign.Center)
}
```

## FAQ: TabBar 居左或居右样式未真实实现或文字长度不同导致换行

### 问题现象

React/Figma 里一组顶部 tabs 明确靠左或靠右，例如搜索页榜单 tab、频道筛选 tab、详情页二级 tab；或者多个 tab 文案长短不同，需要由文字长度自然撑开。转成 ArkUI 后，每个 tab item 内部文字可能已经靠左或靠右，但整组 tab 仍然出现在 tab bar 中间；也可能因为误用 `BarMode.Fixed` 导致每个 tab 被均分压窄，超过两个字的标题换行，无法保持单行。

常见触发场景：

- React 外层是 `flex justify-start`、`justify-end`，或有 `ml-auto`、`mr-auto`、`px-*` 控制整组 tab 的起始位置。
- React/Figma 里多个 tab 文案长短不同，例如“歌单 / 参与的话题 / 已购 / 下载 / 历史播放”，tab item 宽度应由文字和左右 padding 自然撑开。
- ArkUI 使用 `Tabs({ barPosition: BarPosition.Start })`，并给 `TabContent().tabBar(...)` 传入自定义 builder。
- 只修改了 builder 根节点里的 `.justifyContent(FlexAlign.Start/End)` 或 `Text().textAlign(...)`，但没有控制 `Tabs` 自身的 tab bar 容器对齐。
- `BarMode.Scrollable` 下 tabs 总宽度没有超过 tab bar 宽度，系统按默认布局把整组 tabs 紧凑居中。
- 使用了 `BarMode.Fixed`，导致所有 tab 均分 tab bar 宽度；长标题被固定单元宽度挤压，出现换行或截断。

### 原因

`tabBar(...)` 的自定义 builder 只控制单个 tab item 的内部布局，不能决定整组 tab items 在 `Tabs` 的 tab bar 区域里靠左、居中还是靠右。

ArkUI `Tabs` 在 `BarMode.Scrollable` 且内容不足以滚动时，默认布局会把 tab items 作为一组居中展示。这个默认居中不是靠设置 item 内部 `justifyContent` 能解决的，也不应通过随手写死一个 `barWidth` 来碰运气。

`BarMode.Fixed` 会按 tab bar 可用宽度分配页签，适合等宽 tab，不适合文字长短不同且需要内容宽度的自定义 tabBar。长短不同的 tab 如果用 Fixed，builder 里的 `Text` 即使设置了字号和 padding，也会先受到外层等分宽度约束，长标题容易换行。

### 修复方式

- 先确认设计里控制的是“单个 tab 内部文字对齐”、“整组 tab bar 在可用宽度内的对齐”，还是“tab item 宽度由内容撑开”。这三个问题要分别处理。
- 单个 tab 内部对齐：在 `tabBar` builder 根节点上设置合理宽度、padding、`.justifyContent(...)`，必要时给 `Text` 设置 `.width('100%')` 和 `.textAlign(...)`。
- 多个标签长短不同时，必须设置 `.barMode(BarMode.Scrollable)`，让 tab item 按 builder 的内容宽度和 padding 自然布局；不要用 `BarMode.Fixed`，否则长标题会被均分宽度挤压。
- 分析所有 tab item 的总宽度是否超过屏幕或 tab bar 可用宽度：超过时设置 `.scrollable(true)`；未超过时设置 `.scrollable(false)`，保留内容宽度但关闭横向滚动。
- 对可能变长的标题，在 `Text` 上设置 `.maxLines(1)`，必要时配合 `.textOverflow({ overflow: TextOverflow.Ellipsis })`；单行不是靠固定 item 小宽度实现，而是靠 Scrollable 模式和合理内容宽度实现。
- 整组 tab bar 对齐：优先使用 `TabsOptions.barModifier` 给 tab bar 容器设置 `CommonModifier().align(...)`，例如左对齐使用 `Alignment.Start`，右对齐使用 `Alignment.End`。
- 不要把 `barPosition: BarPosition.Start` 误认为“横向靠左”。它表示 tab bar 在容器顶部或左侧的位置，不表示 tab items 在横向 tab bar 内的起始对齐。
- 不要只靠 `.barWidth(...)`、外层 `Column().alignItems(...)`、或 item 内部 `.justifyContent(...)` 修整组对齐；这些方式容易只在当前截图宽度下看起来接近，换屏宽后继续居中或漂移。

### 代码示例

通用左对齐示例：

```ts
import { CommonModifier } from '@ohos.arkui.modifier'

interface TabItem {
  id: string
  title: string
  width: number
}

@Component
struct DemoTabs {
  @State private currentIndex: number = 0
  private readonly tabs: TabItem[] = [
    { id: 'playlist', title: '全部', width: 68 },
    { id: 'topic', title: '我的关注', width: 96 },
    { id: 'paid', title: '精选', width: 68 },
  ]
  private readonly tabBarStartModifier: CommonModifier =
    new CommonModifier().align(Alignment.Start)

  build() {
    Tabs({
      barPosition: BarPosition.Start,
      index: this.currentIndex,
      barModifier: this.tabBarStartModifier,
    }) {
      ForEach(this.tabs, (item: TabItem, index: number) => {
        TabContent() {
          this.buildTabContent(item)
        }
        .tabBar(this.buildTabBar(item, index))
      }, (item: TabItem) => item.id)
    }
    .barMode(BarMode.Scrollable)
    // 总宽超过 tab bar 可用宽度时设 true；未超过时设 false。
    .scrollable(false)
    .barHeight(44)
    .onChange((index: number) => {
      this.currentIndex = index
    })
  }

  @Builder
  private buildTabBar(item: TabItem, index: number) {
    Column({ space: 2 }) {
      Text(item.title)
        .fontSize(15)
        .fontColor(index === this.currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)')
        .maxLines(1)

      Row()
        .width(14)
        .height(2)
        .backgroundColor(index === this.currentIndex ? '#FFFFFF' : 'rgba(0, 0, 0, 0)')
    }
    .width(item.width)
    .height(44)
    .padding({ left: 12, right: 12 })
    .justifyContent(FlexAlign.End)
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  private buildTabContent(item: TabItem) {
    Column()
      .width('100%')
      .height('100%')
  }
}
```

右对齐时只替换 tab bar 容器 modifier：

```ts
private readonly tabBarEndModifier: CommonModifier =
  new CommonModifier().align(Alignment.End)
```

如果设计同时要求每个 tab 内部文字也靠左，再调整 builder 内部布局：

```ts
@Builder
private buildTabBar(item: TabItem, index: number) {
  Row() {
    Text(item.title)
      .width('100%')
      .textAlign(TextAlign.Start)
      .fontSize(15)
      .maxLines(1)
  }
  .width(item.width)
  .height(44)
  .justifyContent(FlexAlign.Start)
}
```

## FAQ: 图片图标资源未真实接入

### 问题现象

React/Tailwind 里的图片、SVG 或导出图标，转成 ArkUI 后被文字、表情、纯色块、系统默认图标或临时占位资源替代。页面可以编译，但视觉上缺少原始插画、头像、角标、操作图标或局部装饰。

常见触发场景：

- `.figma-to-code/cache/assets/...` 中的图片或 SVG 没有复制到 ArkUI 工程资源目录。

### 原因

实现 ArkUI 时使用了一些占位符替代原始图片图标资源。只有已明确改用 `Swiper`、`Tabs` 等高阶组件原生 indicator、arrow 或状态控件的图标可以不复制。

### 修复方式

- 先从 React 源码盘点所有 `src`、`backgroundImage`、`data-svg-wrapper` 和内联图标资源，标记每个资源在 ArkUI 中的去向。
- 对普通图片、头像、SVG、角标、装饰图和业务操作图标，复制到 ArkUI 工程资源目录，并用 `Image($r('app.media.xxx'))` 或工程既有资源引用接入。
- 不要用文本、表情、纯色块或 placeholder 代替真实图标；除非原始设计本身就是文本字符。
- 对已改用高阶组件原生能力的图标，在需求澄清输出或代码说明中明确记录替代原因，并校准尺寸、颜色、位置和状态。
