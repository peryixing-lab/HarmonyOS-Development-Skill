# 评分格式

## 评分 JSON

下列 JSON 是本能力的视觉分析输出格式，不是 `scripts/ui_score.py` 写入的原始 `score.json`。

```json
{
  "script_final_baseline_score": 0,
  "script_raw_baseline_score": 0,
  "script_scale_tolerant_baseline_score": 0,
  "overall": 0,
  "comparability": 1.0,
  "scores": {
    "state_match": 0,
    "region_alignment": 0,
    "fixed_component_layout": 0,
    "text_integrity": 0,
    "visual_style": 0,
    "media_fit": 0,
    "anchor_integrity": 0,
    "overlap_integrity": 0
  },
  "global_scale_assessment": {
    "has_uniform_scale_difference": false,
    "estimated_candidate_scale_vs_reference": 1.0,
    "scale_affects_usability_or_layout": false,
    "notes": ""
  },
  "evidence": {
    "script_report": "report/score.json",
    "notes": []
  }
}
```

所有评分字段为 0-100，`comparability` 除外，范围为 0-1。

`script_final_baseline_score` 应使用缩放容差后的脚本评分。`script_raw_baseline_score` 仅作为证据保留。不要仅因全局分辨率/缩放差异导致的原始分数下降而降低 `overall`。

脚本字段映射：`script_final_baseline_score` 来自脚本 `score.json` 的 `aggregate.final_baseline_score`；`script_raw_baseline_score` 来自 `aggregate.deterministic_baseline_score`；`script_scale_tolerant_baseline_score` 来自 `aggregate.scale_tolerant_baseline_score`。本能力的 `overall` 是视觉分析分数，不覆盖脚本输出，也不作为工作流阈值判定分数。

## 问题 JSON

```json
{
  "issues": [
    {
      "area": "string",
      "problem": "string",
      "likely_code_area": "string",
      "severity": "low|medium|high|critical",
      "evidence": "optional string"
    }
  ]
}
```

约束：

- 允许输出零到三个问题。
- 不得输出超过三个问题。
- 不为凑够三个而添加弱问题。当没有差异明确可见、可在代码中定位且有实际意义时，返回 `[]`。
- 不要将手机状态栏/时间/电池/信号作为问题。
- 不要将纯全局缩放/分辨率差异作为问题，除非它导致具体的 UI 失败。
- `area` 必须命名一个 UI 区域，而非仅坐标描述。
- `problem` 必须以实现术语描述布局/视觉缺陷。
- `likely_code_area` 必须指向合理的代码约束、样式或组件。

## 组合 JSON

视觉校准调用使用以下组合格式，同时返回评分和问题：

```json
{
  "overall": 0,
  "comparability": 1.0,
  "scores": {},
  "issues": []
}
```

问题列表上限为三个，不要求凑满。组合结果中的 `overall` 同样是本能力的视觉分析分数，不覆盖脚本输出，也不作为工作流阈值判定分数。
