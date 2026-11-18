# RichEditor

## 概述

富文本编辑组件，支持图文混排和交互式编辑。可通过属性字符串（StyledString）或 Span 两种方式管理内容。元素构成包括：内容区、光标、手柄（左手柄/右手柄）、菜单。

## 何时使用

- 需要图文混排编辑的场景（如评论区可输入图文）
- 仅需图文展示不需编辑 → 用 Text
- 需大量展示 Html 格式内容 → 用 RichText

## 构造

两种创建方式：

```ts
// 1. 基于属性字符串管理（推荐，更灵活）
RichEditor(options: RichEditorStyledStringOptions)
// RichEditorStyledStringOptions = { controller: RichEditorStyledStringController }

// 2. 基于 Span 管理（复杂内容场景）
RichEditor(value: RichEditorOptions)
// RichEditorOptions = { controller: RichEditorController }
```

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `placeholder` | ResourceStr + PlaceholderStyle | 无输入时的提示文本，可设 fontColor、font |
| `maxLength` | number | 最大可输入字符数 |
| `customKeyboard` | CustomBuilder | 自定义键盘 |
| `enableHapticFeedback` | boolean | 是否支持触觉反馈 |
| `editMenuOptions` | { onCreateMenu, onMenuItemClick } | 自定义选中菜单 |

## 事件

| 事件 | 说明 |
|---|---|
| `onReady` | 组件初始化完成，可在回调中通过 controller 添加内容 |
| `onWillChange(value)` | 图文变化前拦截，返回 true 允许变化 |
| `onDidChange(rangeBefore, rangeAfter)` | 图文变化后回调 |
| `aboutToIMEInput(value)` | 输入法输入内容前回调 |
| `onDidIMEInput` | 输入法完成输入后回调 |
| `onSelect` / `onSelectionChange` | 选中内容变化 |
| `onFocus` / `onBlur` | 获焦/失焦 |

Controller 方法（RichEditorController / RichEditorStyledStringController）：

| 方法 | 说明 |
|---|---|
| `addTextSpan(text, style?)` | 添加文本内容 |
| `addImageSpan(src, imageStyle?)` | 添加图片内容 |
| `addBuilderSpan(builder)` | 添加 @Builder 修饰的内容 |
| `addSymbolSpan(symbol, style?)` | 添加 Symbol 内容（不支持手势/复制/拖拽） |
| `getSpans()` | 获取组件内所有图文信息（内容/id/样式/位置） |
| `setStyledString(styledString)` | 设置属性字符串内容（StyledString 模式） |
| `deleteSpans(range?)` | 删除指定范围内容 |
| `updateSpanStyle(value)` | 更新指定范围样式 |

## 常见枚举

```
// TextSpan style
{ fontColor, fontSize, fontWeight, fontStyle, fontFamily, decoration, letterSpacing, baselineOffset }

// ImageSpan imageStyle
{ size: [width, height] }

// BuilderSpan
RichEditorBuilderSpanOptions: { position?: number }  // 省略或异常值时添加到末尾
```

## 展示情况

### 基于属性字符串管理
通过 `MutableStyledString` 持有属性字符串对象，设置 TextStyle（fontColor 等），通过 `controller.setStyledString()` 传递给组件。更灵活，可快速迁移到其他支持属性字符串的组件。

### 基于 Span 管理
通过 `RichEditorController` 的接口（addTextSpan/addImageSpan/addBuilderSpan/addSymbolSpan）逐步添加内容。适合复杂内容场景。

### 添加文本
`addTextSpan(text, { style: { fontColor, fontSize } })`，可创建混合样式文本。获焦时光标移到新文本右侧。

### 添加图片
`addImageSpan($r('app.media.icon'), { imageStyle: { size: ['57px', '57px'] } })`。

### 添加 Builder
`addBuilderSpan(myBuilder)`，可嵌入自定义复杂组件（如自定义图表）。可通过 options 设置插入位置。

### 添加 Symbol
`addSymbolSpan($r('sys.symbol.basketball_fill'), { style: { fontSize: 30 } })`。不支持手势/复制/拖拽。

### 管理内容
`getSpans()` 获取所有图文信息；`deleteSpans(range)` 删除指定范围；`updateSpanStyle` 更新样式。

### 提示文本
`placeholder(text, { fontColor, font: { size, weight, family, style } })`。

### 最大长度
`maxLength(n)` 限制最大可输入字符数。

## 最小可编译模板

```ts
controller: RichEditorController = new RichEditorController()
options: RichEditorOptions = { controller: this.controller }

RichEditor(this.options)
  .onReady(() => {
    this.controller.addTextSpan('这是一段富文本', {
      style: { fontColor: Color.Black, fontSize: 15 }
    })
  })
  .placeholder('请输入内容', {
    fontColor: Color.Gray,
    font: { size: 15, weight: FontWeight.Normal, style: FontStyle.Normal }
  })
  .width('100%').height(80)
  .borderRadius(8)
  .onWillChange((value: RichEditorChangeValue) => { return true })
  .onDidChange((rangeBefore: TextRange, rangeAfter: TextRange) => { /* ... */ })
```

## 约束

- 使用 RichEditorStyledStringOptions 构建的组件不支持 onWillChange/onDidChange/aboutToIMEInput/onDidIMEInput 回调
- Symbol 内容暂不支持手势、复制、拖拽处理
- addBuilderSpan 省略位置参数或为异常值时添加到所有内容末尾
- addTextSpan/addImageSpan 在组件获焦时光标会移动到新插入内容右侧
- RichEditor 组件不设置宽高时可能不显示，建议显式设置
