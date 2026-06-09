# 🚀 部署到 Vercel 指南

## 方式 1：一键导入（推荐）

1. 打开 👉 [vercel.com/new](https://vercel.com/new)
2. 用 GitHub 账号登录（如果没有就注册一个，免费）
3. 选择 **Import Git Repository**
4. 找到 `CenaCai/TokenDeallineReminder` → 点击 **Import**
5. 配置项目：
   - **Project Name**: `yao-dao-qi-la`（或你喜欢的名字）
   - **Framework Preset**: Next.js（自动检测）
   - **Root Directory**: 点击 Edit → 输入 `web` → 确认
   - **Build Command**: 留空（使用默认）
   - **Output Directory**: 留空（使用默认）

6. 添加环境变量（点击 **Environment Variables** 展开）：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nvgirjjogtctgwybbkyu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_WmPeiENItuf6SVqEkzvppA_uWFVFLbB` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Z2lyampvZ3RjdGd3eWJia3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAwNzc0OCwiZXhwIjoyMDk2NTgzNzQ4fQ.11NJdCR5BvMm23jmEi-VZunPGZn7FJRBGV-5cJWxMb0` |

7. 点击 **Deploy** 🎉

## 部署后

- Vercel 会给你一个域名，类似 `yao-dao-qi-la.vercel.app`
- 之后每次推送到 `develop` 分支，Vercel 会自动重新部署

## 配置 Auth 重定向 URL

部署成功后，还需要在 Supabase 添加 Vercel 的回调地址：

1. 打开 [supabase.com/dashboard/project/nvgirjjogtctgwybbkyu/auth/url-configuration](https://supabase.com/dashboard/project/nvgirjjogtctgwybbkyu/auth/url-configuration)
2. **Redirect URLs** 添加：
   ```
   http://localhost:3000/auth/callback
   https://你的域名.vercel.app/auth/callback
   ```
3. 点击 **Save**

## 方式 2：Vercel CLI

```bash
npm i -g vercel
cd web
vercel
# 按提示操作，选择 yao-dao-qi-la 项目
# 部署后设置环境变量：
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```
