# Tabs

## 概述

内容切换容器，由 TabContent（内容页）和 TabBar（页签栏）组成。支持顶部/底部/侧边导航、固定/滚动页签、自定义页签样式、控制器跳转、页面缓存、切换拦截。

## 何时使用

- 多个并列文本标签，且每个标签对应一个内容页或内容分区
- 有 selected/unselected 文本样式、下划线 indicator、固定 tab bar
- 标签下方存在对应内容区，且内容区不是同一列表的简单筛选结果
- 即使 React 是静态 DOM 没有真实切换状态，只要结构明显是 tab，仍用 `Tabs + TabContent`
- 标签流（筛选/排序 chip）不是 Tabs，用 Flex/Row/横向 List

## 构造

```ts
Tabs(value?: TabsOptions)
```

TabsOptions:

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `barPosition` | BarPosition | Start | 页签栏位置。Start=顶部，End=底部 |
| `index` | number | 0 | 当前选中页索引 |
| `controller` | TabsController | — | 控制器 |
| `barModifier` | CommonModifier | — | 页签栏容器修饰器，用于整组对齐 |

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `barMode` | BarMode | Fixed | 页签模式。Fixed=均分宽度；Scrollable=可滚动 |
| `barHeight` | Length | — | 页签栏高度 |
| `barWidth` | Length | — | 页签栏宽度（vertical=true 时必设） |
| `scrollable` | boolean | true | 是否可滑动切换内容页 |
| `vertical` | boolean | false | 是否侧边导航。true 时页签栏在侧边 |
| `animationDuration` | number | 200 | 切换动画时长(ms) |
| `animationMode` | AnimationMode | — | 切换动画模式（API12+） |
| `cachedMaxCount` | number + TabsCacheMode | — | 子组件最大缓存个数和缓存模式（API19+）。设置后不预加载，使用懒加载 |
| `divider` | DividerStyle \| DividerConfiguration | — | 页签栏与内容区之间的分隔线 |

## 事件

| 事件 | 说明 |
|---|---|
| `onChange(index)` | 页面切换时触发 |
| `onSelected(index)` | 选中索引变化时触发（API18+）。回调中不可通过 index 属性设置当前页，也不可调用 TabsController.changeIndex() |
| `onTabBarClick(index)` | 点击页签时触发 |
| `onContentWillChange(currentIndex, comingIndex)` | 页面切换前拦截。返回 false 阻止切换 |

TabsController 方法：

| 方法 | 说明 |
|---|---|
| `changeIndex(index)` | 跳转到指定页 |

TabContent：

| 属性/参数 | 说明 |
|---|---|
| `.tabBar(...)` | 设置页签。可传 string / SubTabBarStyle / BottomTabBarStyle / 自定义 Builder |
| 宽度 | 不支持设置，默认撑满 Tabs 父组件 |
| 高度 | 不支持设置，由 Tabs 高度减去 barHeight 决定 |

## 常见枚举

```
BarPosition.Start    // 顶部
BarPosition.End      // 底部

BarMode.Fixed        // 均分宽度（等宽 tab，3-5个）
BarMode.Scrollable   // 可滚动（tab 多或文字长短不同时必用）

// tabBar 样式
SubTabBarStyle.of('标题')
BottomTabBarStyle($r('app.media.icon'), '标题')

// TabsCacheMode
TabsCacheMode.CACHE_BOTH_SIDE         // 缓存当前+两侧
TabsCacheMode.CACHE_LATEST_SWITCHED    // 缓存当前+最近切换过的

// AnimationMode
AnimationMode.CONTENT_FIRST / ACTION_FIRST / NO_ANIMATION / CONTENT_FIRST_WITH_JUMP / ACTION_FIRST_WITH_JUMP

// 整组 tab bar 对齐（barModifier）
new CommonModifier().align(Alignment.Start)  // 靠左
new CommonModifier().align(Alignment.End)    // 靠右
```

## 展示情况

### 底部导航
`barPosition: BarPosition.End`，配合 `BottomTabBarStyle` 实现图标+文字页签。

### 顶部导航
`barPosition: BarPosition.Start`。内容分类较多时用 `barMode(BarMode.Scrollable)`。

### 侧边导航
`vertical(true)`，需设 `barWidth`。

### 限制滑动
`scrollable(false)`，用于底部+顶部组合导航避免冲突。

### 固定导航栏
`barMode(BarMode.Fixed)`，内容分类固定（3-5 个），均分 tabBar 宽度。

### 滚动导航栏
`barMode(BarMode.Scrollable)`，内容分类多，屏幕宽度无法容纳所有页签。

### 自定义导航栏
`tabBar` 传 CustomBuilder，通过 `currentIndex` 与 `targetIndex` 匹配控制选中/未选中样式。自定义后需自行实现页签切换逻辑（`onSelected` 或 `controller.changeIndex`）。

### TabBar 整组对齐
`barModifier: new CommonModifier().align(Alignment.Start/End)` 控制整组 tab items 在 tab bar 区域里的靠左/靠右。不要只改 builder 内部 justifyContent。

### 页面缓存
`cachedMaxCount(n, TabsCacheMode.CACHE_BOTH_SIDE)` 控制缓存页面数量，避免预加载所有 TabContent。

## 最小可编译模板

```ts
@State currentIndex: number = 0

Tabs({ barPosition: BarPosition.Start, index: this.currentIndex }) {
  TabContent() { /* 内容页1 */ }
    .tabBar(this.buildTabBar('全部', 0))
  TabContent() { /* 内容页2 */ }
    .tabBar(this.buildTabBar('精选', 1))
}
.barMode(BarMode.Scrollable)
.barHeight(44)
.scrollable(false)
.onChange((index: number) => { this.currentIndex = index })

@Builder
buildTabBar(title: string, index: number) {
  Column({ space: 2 }) {
    Text(title)
      .fontSize(15)
      .fontColor(index === this.currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)')
      .maxLines(1)
    Row().width(14).height(2)
      .backgroundColor(index === this.currentIndex ? '#FFFFFF' : 'rgba(0,0,0,0)')
  }
  .height(44)
  .justifyContent(FlexAlign.End)
  .alignItems(HorizontalAlign.Start)
}
```

## 约束

- TabContent 不支持设置通用宽度/高度属性；宽度默认撑满 Tabs 父组件，高度由 Tabs 高度减 barHeight 决定
- `barPosition: BarPosition.Start` 表示页签栏在顶部，不表示 tab items 横向靠左
- 多个 tab 文案长短不同时必须用 `BarMode.Scrollable`，`BarMode.Fixed` 会均分宽度导致长标题换行
- 整组 tab bar 对齐用 `barModifier: new CommonModifier().align(...)`，不要只改 builder 内部 justifyContent 或靠 barWidth 碰运气
- `barPosition.Start` 不能误认为"横向靠左"
- 自定义 tabBar builder 只控制单个 tab item 内部布局，不能决定整组 tab items 在 tab bar 区域里的对齐
- `vertical(true)` 的侧边导航必须设 `barWidth`
- `@Builder` 调用结果不能链式写样式，要加 margin/padding/背景时外包一层真实容器
- 需要引入 `import { CommonModifier } from '@ohos.arkui.modifier'`
