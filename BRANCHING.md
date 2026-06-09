# 分支策略

## 主要分支

| 分支 | 用途 | 保护规则 |
|------|------|---------|
| `main` | 稳定发布版 | 需要 PR + 审核通过 |
| `develop` | 开发集成分支 | 所有功能分支的合入目标 |

## 版本分支

| 分支前缀 | 用途 | 示例 |
|----------|------|------|
| `h5/` | H5 版本功能开发 | `h5/add-dark-mode` |
| `mp/` | 小程序版本功能开发 | `mp/add-subscription` |
| `shared/` | 两个版本共享的功能 | `shared/update-design-tokens` |
| `hotfix/` | 紧急修复 | `hotfix/fix-ocr-crash` |
| `release/` | 发布准备 | `release/v1.0.0` |

## 工作流

```
main ──────────────────────────────────────●
                                           │
develop ────────────●───●───●───●───●───●───┤
                    │   │   │   │   │   │   │
h5/feature-a ────●─┘   │   │   │   │   │   │
mp/feature-b ────────●─┘   │   │   │   │   │
h5/feature-c ────────────────●─┘   │   │   │
mp/feature-d ──────────────────────●─┘   │   │
                                          │
release/v1.0.0 ───────────────────────────●┘
```

1. 从 `develop` 拉取功能分支（`h5/` 或 `mp/` 前缀）
2. 开发完成后提 PR 合入 `develop`
3. 准备发布时，从 `develop` 创建 `release/vX.Y.Z`
4. 测试通过后，`release` 分支合入 `main` 和 `develop`
5. 在 `main` 上打 tag `vX.Y.Z`

## 版本号规范

格式：`v{MAJOR}.{MINOR}.{PATCH}-{EDITION}`

- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能新增
- PATCH: 向后兼容的问题修正
- EDITION: `h5` 或 `mp`

示例：
- `v1.0.0-h5` — H5 首个正式版
- `v1.0.0-mp` — 小程序首个正式版
- `v1.1.0-h5` — H5 新增暗黑模式
- `v1.0.1-mp` — 小程序修复 OCR 问题
