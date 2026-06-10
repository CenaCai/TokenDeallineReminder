# 分支策略

本项目使用轻量 Git Flow，适合个人开发者维护多端应用。完整发布、预发布、回退流程见 [RELEASE.md](./RELEASE.md)。

## 长期分支

| 分支 | 用途 | 合入规则 |
| --- | --- | --- |
| `main` | 正式稳定版本 | 只能通过 PR 合入，必须通过 Release preflight |
| `develop` | 日常开发集成 | 功能分支先合入这里 |

## 临时分支

| 分支格式 | 用途 | 来源 | 合入目标 |
| --- | --- | --- | --- |
| `feature/<scope>-<name>` | 新功能 | `develop` | `develop` |
| `fix/<scope>-<name>` | 普通缺陷修复 | `develop` | `develop` |
| `release/vX.Y.Z` | 某个版本的预发布和冻结 | `develop` | `main` 和 `develop` |
| `hotfix/vX.Y.Z` | 线上 P0 修复 | `main` 或稳定 tag | `main` 和 `develop` |

`scope` 建议使用：

- `web`
- `mp`
- `extension`
- `supabase`
- `docs`
- `shared`

示例：

- `feature/web-subscription-tags`
- `fix/mp-reminder-openid`
- `release/v2.0.0`
- `hotfix/v2.0.1`

## 版本分支要求

每个正式版本必须满足：

1. 有对应的 `release/vX.Y.Z` 分支
2. 在 Mac 预发布环境跑通 `scripts/preflight-web.sh`
3. GitHub Actions 的 `Release preflight` 通过
4. 合入 `main` 后创建对应 tag，例如 `v2.0.0`
5. `main` 合回 `develop`

## 禁止事项

- 禁止直接向 `main` 推送功能代码
- 禁止对公开 `main` 强推
- 禁止把 service role key、微信私钥、`.env.local` 提交到仓库
- 禁止未经预发布检查直接上线
