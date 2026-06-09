# Token Deadline Reminder 🕐

> 记录每个产品的限时、剩余额度，定时提醒你续费、别浪费！

一款温暖卡片风格的额度追踪工具，帮助你管理 AI/SaaS 订阅、云服务资源包、金融产品等到期与额度提醒。

## 📱 两个版本

| 版本 | 目录 | 技术栈 | 适合场景 |
|------|------|--------|---------|
| **H5 版本** | [`/h5`](./h5) | HTML + CSS + JS, PWA, LocalStorage | 手机浏览器直接打开，添加到主屏幕 |
| **小程序版本** | [`/miniprogram`](./miniprogram) | 微信原生 WXML/WXSS, 云开发, 订阅消息 | 微信生态内，通知更可靠 |

## ✨ 核心功能

### 三种数据录入方式
1. ⚡ **API 接入** — 填入 API Key 自动查余额（H5: fetch / 小程序: 云函数代理）
2. 📷 **截图识别** — 上传账单截图自动识别录入（H5: Tesseract.js / 小程序: 微信 OCR 插件）
3. ✏️ **手动填写** — 全字段表单（不鼓励但支持）

### 提醒系统
- **H5**: PWA 浏览器推送通知 + 应用内弹窗提醒
- **小程序**: 微信订阅消息 + 云函数定时触发器

### 产品类型
通用混合设计 — AI 订阅、SaaS、云服务、金融理财等均可记录

## 🎨 设计令牌

| 令牌 | 值 |
|------|-----|
| 主色 | `#E8703A`（温暖橙） |
| 背景 | `#FFF8F0`（米白） |
| 卡片 | `#FFFFFF` + 柔和阴影 |
| 成功 | `#4CAF50` |
| 警告 | `#FF9800` |
| 危险 | `#F44336` |

## 🚀 快速开始

### H5 版本
```bash
# 直接打开或用任意静态服务器
cd h5
open index.html
# 或
npx serve .
```

### 小程序版本
请参考 [小程序部署文档](./miniprogram/DEPLOY.md)

## 📦 项目结构

```
TokenDeallineReminder/
├── h5/                          # H5 PWA 版本
│   ├── index.html               # 主入口
│   ├── css/styles.css           # 样式
│   ├── js/
│   │   ├── app.js               # 主逻辑
│   │   ├── db.js                # LocalStorage 数据层
│   │   ├── render.js            # 渲染引擎
│   │   ├── api-providers.js     # API 额度查询
│   │   ├── ocr.js               # Tesseract.js OCR
│   │   └── notifications.js     # PWA 通知
│   ├── sw.js                    # Service Worker
│   ├── manifest.json            # PWA Manifest
│   └── icons/                   # 应用图标
│
├── miniprogram/                 # 微信小程序版本
│   ├── app.js/json/wxss         # 小程序入口
│   ├── pages/
│   │   ├── index/               # 产品列表首页
│   │   ├── add/                 # 三种录入方式
│   │   ├── detail/              # 产品详情/同步/提醒
│   │   └── settings/            # 提醒配置/数据管理
│   ├── components/              # 复用组件
│   ├── cloudfunctions/          # 云函数
│   ├── scripts/                 # CI/CD 部署脚本
│   └── DEPLOY.md                # 部署文档
│
└── README.md
```

## 📄 License

MIT
