# 要到期啦 🕐

> 订阅与续费管理平台 — 管理你的 AI 工具、域名、服务器、软件会员等所有订阅项目

## 📱 多端支持

| 端 | 目录 | 技术栈 | 状态 |
|---|---|---|---|
| **Web 后台** | [`/web`](./web) | Next.js 16 + Tailwind + Recharts + Supabase | ✅ 活跃开发 |
| **微信小程序** | [`/miniprogram`](./miniprogram) | 原生 WXML + 云开发 + 订阅消息 | ✅ 可用 |
| **Chrome 扩展** | [`/extension`](./extension) | Manifest V3 + Service Worker | ✅ 可用 |
| ~~旧 H5 版本~~ | [`/h5`](./h5) | HTML + PWA + LocalStorage | 🗑️ 已归档 |

## ✨ 核心功能

### 5 大模块
1. **账号体系** — 微信登录 + 邮箱 Magic Link，默认昵称 `helloworld`
2. **订阅管理** — 完整 CRUD、9 个默认分类、标签系统、状态自动计算
3. **提醒系统** — 提前 30/15/7/3/1/0 天 + 过期后，三渠道推送（微信/Chrome/邮件）
4. **Dashboard** — 统计卡片 + 到期时间轴 + 支出分布图
5. **模板中心** — 12 个预置模板（ChatGPT Plus, Claude Max, Gemini Pro 等），一键创建

### 技术架构
```
Next.js (Web) + Supabase (BaaS) + PostgreSQL + Chrome Extension V3 + 微信小程序
```

## 🚀 快速开始

### Web 后台（开发）

```bash
cd web
npm install
cp .env.local.example .env.local
# 编辑 .env.local 填入 Supabase 配置
npm run dev
```

### 部署到 Vercel

1. Fork 或导入此仓库到你的 GitHub
2. 在 [vercel.com](https://vercel.com) 点击 **Import Project**
3. 选择 `web` 目录作为 Root Directory
4. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. 点击 **Deploy**

### 微信小程序

请参考 [小程序部署文档](./miniprogram/DEPLOY.md)

### Chrome 扩展

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择 `/extension` 目录

## 📦 项目结构

```
TokenDeallineReminder/
├── web/                    # Next.js Web 后台
│   ├── src/
│   │   ├── app/            # App Router 页面
│   │   ├── components/     # UI 组件
│   │   └── lib/            # 工具函数 + Supabase 客户端
│   ├── public/
│   └── package.json
│
├── miniprogram/            # 微信小程序
│   ├── pages/              # 首页/添加/详情/模板/设置
│   ├── cloudfunctions/     # 云函数（定时扫描/微信登录）
│   └── project.config.json
│
├── extension/              # Chrome 扩展
│   ├── manifest.json       # Manifest V3
│   ├── popup.html/js/css   # 弹窗面板
│   ├── background.js       # Service Worker（通知）
│   └── options.html/js     # 设置页
│
├── supabase/               # 数据库迁移
│   └── migrations/
│
├── packages/               # 共享类型定义
│   └── shared/types.ts
│
├── h5/                     # 旧版 H5（已归档）
│
└── scripts/                # 工具脚本
    └── setup-supabase.sh
```

## 🔑 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key（仅服务端） |
| `NEXT_PUBLIC_AUTHING_APP_ID` | ❌ | Authing App ID（微信登录桥接） |
| `NEXT_PUBLIC_AUTHING_HOST` | ❌ | Authing 域名 |
| `WECHAT_OPEN_APP_ID` | ❌ | 微信开放平台 App ID |
| `WECHAT_OPEN_APP_SECRET` | ❌ | 微信开放平台 Secret |

## 📄 License

MIT
