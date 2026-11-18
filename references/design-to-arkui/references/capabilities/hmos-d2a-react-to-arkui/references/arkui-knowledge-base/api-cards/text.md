# Text / Span

## 概述

Text 是文本组件，用于展示文字。Span 是行内文本，只能作为 Text 的子组件。支持自定义样式、装饰线、事件、选中菜单、数字翻牌、跑马灯。

## 何时使用

- 所有静态文字展示
- 行内混合样式（一段文字中不同部分有不同颜色/字号/样式）用 Text + 多个 Span
- 输入框用 TextInput/TextArea，不用 Text
- 富文本编辑用 RichEditor
- 仅需图文展示不需编辑用 Text，需大量 Html 用 RichText

## 构造

```ts
Text(content?: string | Resource)
```

```ts
Text() {
  Span(content?: string | Resource)
}
```

## 属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `textAlign` | TextAlign | 水平方向对齐。Start/Center/End |
| `textOverflow` | { overflow: TextOverflow } | 超长处理，需配合 maxLines |
| `maxLines` | number | 最大显示行数 |
| `lineHeight` | Length | 行高 |
| `lineSpacing` | LengthMetrics + { onlyBetweenLines } | 行间距（API20+）。onlyBetweenLines=true 时首行上方无额外间距 |
| `letterSpacing` | Length | 字符间距 |
| `baselineOffset` | Length | 基线偏移量 |
| `fontSize` | Length | 字号 |
| `fontColor` | ResourceColor | 字体颜色 |
| `fontWeight` | FontWeight | 字重 |
| `fontStyle` | FontStyle | 字体风格。Normal/Italic |
| `fontFamily` | string | 字体族。支持 'HarmonyOS Sans' 和注册自定义字体 |
| `font` | { size, weight, family, style } | 字体属性合集 |
| `decoration` | { type, color, style?, thicknessScale? } | 文本装饰线 |
| `textCase` | TextCase | 大小写转换 |
| `copyOption` | CopyOptions | 是否可复制粘贴 |
| `textSelectable` | boolean | 是否可选择 |
| `textVerticalAlign` | VerticalAlign | 垂直方向对齐 |
| `textIndent` | Length | 首行缩进 |
| `wordBreak` | WordBreak | 断行规则 |
| `shaderStyle` | ShaderStyle | 渐变色样式 |
| `maxFontSize` / `minFontSize` | Length | 自适应字号。必须同时设置，配合 maxLines 或布局限制 |
| `heightAdaptivePolicy` | TextHeightAdaptivePolicy | 自适应布局调整字号方式 |
| `halfLeading` | boolean | 是否将行间距平分至行顶与行底 |
| `enableAutoSpacing` | boolean | 是否开启中文与西文自动间距 |
| `enableDataDetector` | boolean | 是否进行文本特殊实体识别 |
| `fontFeature` | FontFeature | 文字特性效果（如数字等宽） |
| `marqueeOptions` | { start, fromStart, step, loop, delay, fadeout, marqueeStartPolicy } | 跑马灯配置 |
| `contentTransition` | NumericTextTransition | 数字翻牌效果（API20+） |
| `optimizeTrailingSpace` | boolean | 优化每行末尾空格（API20+） |
| `privacySensitive` | boolean | 卡片敏感隐私信息 |

Span 属性（作为 Text 子组件时）：支持 fontSize、fontColor、fontWeight、fontStyle、decoration、textCase、font、baselineOffset、letterSpacing、onClick、onHover。

## 常见枚举

```
// textAlign
TextAlign.Start / Center / End

// textOverflow
TextOverflow.Clip       // 直接截断
TextOverflow.Ellipsis   // 省略号
TextOverflow.None       // 不处理（默认折行）
TextOverflow.MARQUEE    // 跑马灯滚动

// decoration.type
TextDecorationType.Underline / LineThrough / Overline / None

// decoration.style
TextDecorationStyle.SOLID / DASHED / DOTTED / DOUBLE / WAVY

// textCase
TextCase.Normal / LowerCase / UpperCase

// fontWeight
FontWeight.Normal / Bold / Medium / Lighter / Bolder / Regular(400)

// fontStyle
FontStyle.Normal / Italic

// copyOption
CopyOptions.None / InApp / LocalDevice
```

## 展示情况

### 超长文本处理
`textOverflow({ overflow: TextOverflow.Ellipsis })` + `maxLines(1)` 实现单行省略。默认自动折行。`TextOverflow.MARQUEE` 滚动显示，可配合 `marqueeOptions` 配置。

### 自适应字号
`minFontSize(5)` + `maxFontSize(30)` + `maxLines(1)` 按容器宽度自动调整字号。必须同时设置 min 和 max，配合 maxLines 或布局限制。

### 装饰线
`decoration({ type: TextDecorationType.Underline, color: Color.Blue, style: TextDecorationStyle.DOTTED, thicknessScale: 4 })`。支持实线、虚线、点线、双线、波浪线。

### 行内混合样式
Text 内嵌多个 Span，每个 Span 可独立设置 fontSize、fontColor、fontStyle、decoration 等。Text 与 Span 同时配置文本内容时，Span 内容覆盖 Text 内容。

### 数字翻牌
`contentTransition(new NumericTextTransition({ flipDirection: FlipDirection.DOWN, enableBlur: false }))`（API20+）。

### 渐变文字
`shaderStyle(...)` 设置渐变色样式。不支持时退化为纯色。不要用多层 Text 模拟。

## 最小可编译模板

```ts
Text('这是一段文本')
  .fontSize(14)
  .fontColor('#333333')
  .maxLines(1)
  .textOverflow({ overflow: TextOverflow.Ellipsis })
```

行内混合样式：

```ts
Text() {
  Span('我是Span1，').fontSize(16).fontColor(Color.Grey)
    .decoration({ type: TextDecorationType.LineThrough, color: Color.Red })
  Span('我是Span2').fontColor(Color.Blue).fontSize(16)
    .fontStyle(FontStyle.Italic)
}
.borderWidth(1).padding(10)
```

## 约束

- Column 内部 Text 默认横向居中；要靠左时设 `.alignItems(HorizontalAlign.Start)` 在 Column 上，或外包一个 `.width('100%')` 的 Row
- 可能变长的文字必须设 `.maxLines(1)` + `.textOverflow({ overflow: TextOverflow.Ellipsis })`
- Span 只能作为 Text 和 RichEditor 的子组件，单独使用不会显示
- Text 与 Span 同时配置文本内容时，Span 内容会覆盖 Text 内容
- 文字渐变不要用多层 Text 模拟；用 `.shaderStyle(...)` 或退化为纯色
- Span 无尺寸信息，仅支持 onClick 和 onHover 事件
