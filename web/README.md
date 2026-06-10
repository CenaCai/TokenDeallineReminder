# Web 后台

`web` 是「要到期啦」的 Next.js 后台，用于登录、订阅管理、模板中心、Dashboard 和设置。

## 开发

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

## 必需环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

微信登录相关变量为可选，详见根目录 [DEPLOY.md](../DEPLOY.md)。

## 检查

```bash
npm run lint
npm run build
```

发布前使用根目录脚本进行 production build 和接口 smoke：

```bash
cd ..
bash scripts/preflight-web.sh
```

接口健康检查：

```text
GET /api/health
```

## 部署

Web 正式环境部署在 Vercel：

- Root Directory: `web`
- Production Branch: `main`
- 环境变量只配置在 Vercel Dashboard 或 GitHub Secrets

发布和回退流程见根目录 [RELEASE.md](../RELEASE.md)。
