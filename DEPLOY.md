# 部署指南

## Web 正式环境

Web 端部署在 Vercel，项目根目录为 `web`。

### Vercel 配置

1. 打开 [vercel.com/new](https://vercel.com/new)
2. 导入 `CenaCai/TokenDeallineReminder`
3. 配置项目：
   - Framework Preset: Next.js
   - Root Directory: `web`
   - Production Branch: `main`
4. 在 Vercel Dashboard 中配置环境变量：

| Name | Environment | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production / Preview | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production / Preview | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production / Preview | 只允许服务端使用 |
| `NEXT_PUBLIC_APP_URL` | Production / Preview | Web 应用 URL |
| `NEXT_PUBLIC_AUTHING_APP_ID` | Production / Preview | 可选，Authing 微信登录 |
| `NEXT_PUBLIC_AUTHING_HOST` | Production / Preview | 可选，Authing 域名 |
| `AUTHING_SECRET` | Production / Preview | 可选，Authing 服务端密钥 |
| `WECHAT_OPEN_APP_ID` | Production / Preview | 可选，微信开放平台 |
| `WECHAT_OPEN_APP_SECRET` | Production / Preview | 可选，微信开放平台密钥 |

不要把真实密钥写进仓库、Markdown、Issue、PR 描述或截图。

### Supabase Auth 回调

在 Supabase Dashboard > Authentication > URL Configuration 中添加：

```text
http://localhost:3000/auth/callback
https://<your-production-domain>/auth/callback
https://<your-preview-domain>/auth/callback
```

如果启用微信登录，还需要添加：

```text
https://<your-production-domain>/api/auth/wechat/callback
https://<your-preview-domain>/api/auth/wechat/callback
```

## GitHub Secrets

GitHub Actions 需要以下 Secrets 才能使用真实环境跑发布检查：

| Secret | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MP_APPID` | 小程序 AppID，仅小程序发布需要 |
| `MP_PRIVATE_KEY` | 小程序上传私钥，仅小程序发布需要 |

## Mac 预发布

正式发布前，使用 Mac 跑 production build 和接口 smoke：

```bash
export NEXT_PUBLIC_SUPABASE_URL="预发布 Supabase URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="预发布 Supabase anon key"
export SUPABASE_SERVICE_ROLE_KEY="预发布 Supabase service role key"
PORT=3100 bash scripts/preflight-web.sh
```

检查通过后，再创建 PR 合入 `main`。

## 小程序

1. 在微信公众平台配置 request 合法域名：

```text
https://<your-supabase-project>.supabase.co
```

2. 在微信开发者工具中打开 `miniprogram`
3. 使用 AppID `wx24b81bb6575cd337`
4. 预览确认后上传并提交审核

如果要使用 GitHub Actions 上传小程序，需要补齐：

- `miniprogram/package.json`
- `miniprogram/package-lock.json`
- `miniprogram/scripts/upload.js`

## Chrome 扩展

开发环境：

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 加载 `extension` 目录
4. 在扩展设置页填写 Supabase URL、anon key、用户 token、Web 地址

正式发布到 Chrome Web Store 前需要补齐：

- `extension/icons/icon16.png`
- `extension/icons/icon32.png`
- `extension/icons/icon48.png`
- `extension/icons/icon128.png`

## 回退

Web 回退优先使用 Vercel：

1. 打开 Vercel 项目
2. 进入 Deployments
3. 找到上一个稳定版本
4. Promote to Production

Git 层面回退使用 `git revert`，不要强推 `main`。

完整回退流程见 [RELEASE.md](./RELEASE.md)。
