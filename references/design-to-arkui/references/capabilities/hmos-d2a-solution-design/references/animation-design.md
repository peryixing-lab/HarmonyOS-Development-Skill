# 动效设计参数提取

**目标**：从功能需求描述和交互设计中提取所有动效需求，转化为 ArkUI 可实现的动效规格。

当功能需求中包含"动效"、"动画"、"过渡"、"转场"、"渐入"、"渐出"、"滑动"等关键词时，必须填写以下三个动效表格。仅写"添加渐进渐出动效"等一句话描述不够——开发阶段需要具体的 API 名称、持续时间和缓动曲线才能实现，缺少这些信息会导致动效实现偏离设计意图。

## 目录

- [§4.5 动效详细规格表（在 §4 事件处理与交互设计中记录）](#45-动效详细规格表在-4-事件处理与交互设计中记录)
- [§4.6 ArkUI 动效实现方案（在 §4 事件处理与交互设计中记录）](#46-arkui-动效实现方案在-4-事件处理与交互设计中记录)
- [§4.7 动效时序图（在 §4 事件处理与交互设计中记录）](#47-动效时序图在-4-事件处理与交互设计中记录)
- [动效自检清单](#动效自检清单)

## §4.5 动效详细规格表（在 §4 事件处理与交互设计中记录）

| 动效ID | 动效名称 | 触发事件 | 动效类型 | 持续时间 | 缓动曲线 | 动画属性 | 起始值→结束值 | 延迟 | 循环模式 |
|--------|---------|---------|---------|---------|---------|---------|-------------|------|---------|
| A01 | Tab切换渐入渐出 | selectedIndex变化 | 透明度渐变 | 200ms(出)+200ms(入) | EaseInOut | opacity | 1→0→1 | 0ms(出),200ms(入) | 单次 |
| A02 | 页面进入转场 | pushPathByName | 位移+透明度 | 300ms | EaseOut | translateX+opacity | 100%+0→0+1 | 0ms | 单次 |
| A03 | 收藏按钮切换 | onClick | 缩放+颜色 | 150ms | Spring | scale+fillColor | 1→1.2→1 / 灰→红 | 0ms | 单次 |

动效类型枚举：透明度渐变(fade) / 位移滑动(slide) / 缩放(scale) / 旋转(rotate) / 颜色过渡(color) / 组合(combined)

## §4.6 ArkUI 动效实现方案（在 §4 事件处理与交互设计中记录）

| 动效ID | 推荐 ArkUI API | 需要的状态变量 | 触发机制 | 实现要点 | 已知坑点 |
|--------|---------------|--------------|---------|---------|---------|
| A01 | `.animation()` + `@Monitor` | `@Local tabOpacity: number` | `@Monitor('selectedIndex')` 中设 opacity=0，setTimeout 后设为1 | Tabs 需设 `scrollable(false)` + `animationDuration(0)`，用 opacity 做渐变 | `animationDuration` 仅在 `scrollable(true)` 时生效；`scrollable(false)` 时此属性无效，必须自定义动画 |
| A02 | Navigation `customNavContentTransition` | 无（系统管理） | 系统自动触发 | 在 Navigation 上配置 `customNavContentTransition` 回调，返回自定义动画对象 | 需实现 `AnimatedTransition` 接口；返回 undefined 则使用默认转场 |
| A03 | `.animation()` + `@Local` | `@Local isFavorite: boolean` | onClick 翻转状态 | 对 Image 添加 `.scale()` 和 `.fillColor()`，绑定 `.animation()` | fillColor 动画需 Image 已设置 fillColor 才生效；Spring 曲线无法用 `.animation()` 实现，需用 `animateTo` |

### ArkUI 动效 API 选择决策树

```
是否需要响应用户交互触发？
├─ 是 → 状态变化驱动动画
│   ├─ 单属性简单动画 → `.animation()` 修饰符 + @Local/@Monitor
│   ├─ 多属性编排动画 → `animateTo()` 闭包内修改多个状态
│   └─ 弹性/物理动画 → `animateTo({ curve: Curve.Spring })` 或 `springMotion()`
└─ 否 → 系统自动触发
    ├─ 页面进入/退出转场 → Navigation `customNavContentTransition`
    ├─ 组件出现/消失动画 → `.transition()` + `if/else` 条件渲染
    └─ 列表项增删动画 → `List` 的 `.animateItemDuration()`
```

## §4.7 动效时序图（在 §4 事件处理与交互设计中记录）

对每个动效输出基于文本的时间轴，明确每个时间点的状态变化和视觉表现：

```
动效ID: A01 — Tab切换渐入渐出 (总时长 400ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t=0ms       用户点击Tab → selectedIndex 变化
            @Monitor 触发 → tabOpacity = 0
t=0~200ms   渐出阶段：opacity 1→0, EaseInOut
            页面内容逐渐消失
t=200ms     渐出完成，opacity = 0
            setTimeout 回调 → tabOpacity = 1
t=200~400ms 渐入阶段：opacity 0→1, EaseInOut
            新页面内容逐渐显现
t=400ms     渐入完成，opacity = 1，动效结束
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

动效时序图必须包含以下要素——时序图是动效实现的唯一精确规格，缺少任何要素都会让开发者无法准确还原动效节奏：
- 起始时间点（t=0ms）和触发动作
- 每个阶段的时间范围和属性变化
- 阶段切换点（setTimeout 延迟、动画完成等）
- 结束时间点和最终状态
- 总时长标注

## 动效自检清单

| 检查项 | 自检状态 | 备注 |
|--------|----------|------|
| 每个动效都有唯一ID | ✅/❌ | A01, A02, A03... |
| 动效类型明确（fade/slide/scale/rotate/color/combined） | ✅/❌ | |
| 持续时间精确到毫秒 | ✅/❌ | 含分段时长 |
| 缓动曲线已指定 | ✅/❌ | EaseInOut/EaseIn/EaseOut/Linear/Spring |
| ArkUI API 已选择 | ✅/❌ | `.animation()` / `animateTo()` / `customNavContentTransition` / `.transition()` |
| 需要的状态变量已声明 | ✅/❌ | 变量名 + 装饰器 + 类型 |
| 已知坑点已标注 | ✅/❌ | 特别是组件限制和 API 限制 |
| 动效时序图已输出 | ✅/❌ | 含时间轴和状态变化 |
| 动效与组件清单已关联 | ✅/❌ | §2.5 自定义组件清单增加"关联动效"列 |
