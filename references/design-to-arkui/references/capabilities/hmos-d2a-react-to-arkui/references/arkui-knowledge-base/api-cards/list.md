# List

## 概述

列表容器，子组件为 ListItem 或 ListItemGroup。支持垂直/水平滚动、多列列表、分组、粘性标题、侧滑、分隔线、懒加载、编辑。自动按滚动方向排列子组件。

## 何时使用

- x 坐标稳定、y 方向规律递增的重复行
- 行高固定或接近固定
- 消息、评论、歌曲、设置项、关注列表等重复行
- 内容可能超过视口
- 长列表用 `List + ListItem + ForEach`；少量静态片段可用 `Column + ForEach`
- 每列等宽且不需跨行跨列时，相比 Grid 和 WaterFlow 更推荐用 List

## 构造

```ts
List(value?: ListOptions)
```

ListOptions:

| 参数 | 类型 | 说明 |
|---|---|---|
| `space` | Length | 主轴方向子项间距 |
| `initialIndex` | number | 初始显示的子项索引 |
| `scroller` | Scroller | 滚动控制器 |

头部/尾部（`header`/`footer`）是 ListItemGroup 的参数，不是 List 的；List 的分组头尾用 ListItemGroup 或 ListItem 实现。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `listDirection` | Axis | Vertical | 主轴方向。Vertical/Horizontal |
| `lanes` | number \| LengthConstrain | 1 | 交叉轴排列数。LengthConstrain 时按宽度自适应列数 |
| `alignListItem` | ListItemAlign | Start | 子项交叉轴对齐 |
| `divider` | DividerStyle | — | 分隔线 `{ strokeWidth, color, startMargin, endMargin }` |
| `scrollBar` | BarState | Auto(API10+) | 滚动条显示 |
| `cachedCount` | number | 1 | 预加载数量，显示区域外前后各 cachedCount 行 |
| `edgeEffect` | EdgeEffect | Spring(内容≥一屏) | 边缘滑动效果 |
| `sticky` | StickyStyle | — | ListItemGroup 头部吸顶/尾部吸底 |
| `stackFromEnd` | boolean | false | true 时底部插入数据自动向上滚动（直播评论、聊天） |

## 事件

| 事件 | 说明 |
|---|---|
| `onScrollIndex(first, last)` | 当前显示的首尾子节点索引变化 |
| `onReachStart` / `onReachEnd` | 滚动到首/尾 |
| `onScroll` / `onWillScroll` / `onDidScroll` | 滚动事件 |
| `onItemMove` / `onItemDrop` | 拖拽排序 |

Scroller 方法：

| 方法 | 说明 |
|---|---|
| `scrollToIndex(index, animate?, align?)` | 滚动到指定索引 |
| `scrollPage({ next })` | 翻页 |
| `getItemRect(index)` | 获取指定项位置信息 |
| `currentOffset()` | 当前滚动偏移 |

ListItem 约束与属性：

| 条目 | 说明 |
|---|---|
| 只能包含单个根节点组件 | 多个元素需组合到容器内（约束，非属性） |
| `.swipeAction({ start?, end? })` | 侧滑菜单。start=右滑起始端，end=左滑尾端 |

ListItemGroup：

| 参数/属性 | 说明 |
|---|---|
| `header` / `footer` | CustomBuilder，头部/尾部组件 |
| 子组件也是 ListItem | ListItemGroup 的宽度默认充满 List |
| `style` | ListItemGroupStyle.CARD（卡片样式） |

## 常见枚举

```
Axis.Vertical / Horizontal

ListItemAlign.Start / Center / End

StickyStyle.Header  // 头部吸顶
StickyStyle.Footer  // 尾部吸底

EdgeEffect.Spring / None / Fade

BarState.Auto / Off / On

ScrollDirection.Vertical / Horizontal
```

## 展示情况

### 尺寸约束
- 主轴设了尺寸 → 按设置值
- 主轴未设尺寸 + 子项总尺寸 < 父组件 → 自适应子项总尺寸
- 主轴未设尺寸 + 子项总尺寸 > 父组件 → 适应父组件尺寸（可滚动）
- 交叉轴未设尺寸 → 默认自适应父组件尺寸

### 多列列表
`lanes(2)` 或 `lanes({ minLength: 200, maxLength: 300 })` 按宽度自适应列数。

### 分组 + 粘性标题
`ListItemGroup({ header: builder })` 分组，`List().sticky(StickyStyle.Header)` 吸顶。

### 侧滑删除
`ListItem().swipeAction({ end: { builder: () => this.itemEnd(index) } })`。

### 分隔线
`divider({ strokeWidth: 1, color: '#ffe9f0f0', startMargin: 60, endMargin: 10 })`。画在两个 ListItem 之间，首尾不画。多列时 startMargin/endMargin 作用于每列。

### 长列表懒加载
LazyForEach + `cachedCount(n)`。显示区域外前后各缓存 cachedCount 行。ForEach 会一次性加载所有元素，不适合长列表。

### 实时消息滚动
`stackFromEnd(true)` 使底部插入数据时自动向上滚动。

### 编辑列表
通过 ForEach 数据源增删实现新增/删除列表项，配合 Checkbox 勾选、LongPressGesture 进入编辑模式。

## 最小可编译模板

```ts
List({ space: 10 }) {
  ForEach(this.items, (item: MyItem) => {
    ListItem() {
      Row() {
        Image(item.icon).width(40).height(40)
        Text(item.title).fontSize(16).layoutWeight(1).maxLines(1)
      }.width('100%')
    }
  }, (item: MyItem) => item.id)
}
.width('100%').height('100%')
.alignListItem(ListItemAlign.Center)
.divider({ strokeWidth: 1, color: '#ffe9f0f0', startMargin: 60, endMargin: 10 })
.cachedCount(3)
```

## 约束

- List 的子组件必须是 ListItem 或 ListItemGroup，不能直接放其他组件
- ListItem 中只能有一个根节点组件，多个元素需组合到 Row/Column 等容器内
- 分隔线画在两个 ListItem 之间，第一个上方和最后一个下方不画
- 长列表必须用 LazyForEach 而非 ForEach
- ListItemGroup 在索引计算中作为一个整体占一个索引值
- `cachedCount` 增大会增加 CPU/内存开销
- `space` 设置的间距小于分隔线宽度时，ListItem 间隔使用分隔线宽度
