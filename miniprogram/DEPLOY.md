# 微信小程序部署配置指南

## 📋 前置准备

### 1. 注册微信小程序
- 前往 [mp.weixin.qq.com](https://mp.weixin.qq.com) 注册小程序账号
- 获取 **AppID**（在「开发 → 开发管理 → 开发设置」中）
- 完成**微信认证**（订阅消息、云开发等能力需要认证）

### 2. 安装开发者工具
- 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 使用微信扫码登录

---

## 🚀 部署步骤

### Step 1：导入项目
1. 打开微信开发者工具
2. 点击「+」导入项目
3. 目录选择 `quota-tracker-miniprogram`
4. AppID 填入你的小程序 AppID
5. 后端服务选择「微信云开发」

### Step 2：配置 AppID
编辑 `project.config.json`，替换 AppID：
```json
{
  "appid": "wx1234567890abcdef"  // ← 替换为你的 AppID
}
```

### Step 3：开通云开发
1. 在开发者工具中点击「云开发」按钮
2. 创建云开发环境，命名如 `quota-tracker-prod`
3. 记录**云环境 ID**（如 `quota-tracker-xxxxx`）

### Step 4：配置云环境 ID
编辑 `app.js`，替换云环境 ID：
```javascript
wx.cloud.init({
  traceUser: true,
  env: 'quota-tracker-xxxxx'  // ← 替换为你的云环境 ID
})
```

### Step 5：创建数据库集合
在云开发控制台 → 数据库，创建以下集合：

| 集合名 | 说明 | 权限 |
|--------|------|------|
| `products` | 产品额度数据 | 仅创建者可读写 |
| `users` | 用户设置 | 仅创建者可读写 |

### Step 6：部署云函数
1. 在开发者工具左侧找到 `cloudfunctions` 目录
2. 右键 `checkQuota` → 「上传并部署：云端安装依赖」
3. 右键 `sendReminder` → 「上传并部署：云端安装依赖」
4. 等待部署完成

### Step 7：配置定时触发器
1. 在云开发控制台 → 云函数 → `sendReminder`
2. 点击「定时触发器」
3. 配置：
   - 触发周期：自定义触发周期
   - Cron 表达式：`0 0 9 * * * *`（每天 9:00）
   - 状态：开启

### Step 8：申请订阅消息模板
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)
2. 功能 → 订阅消息 → 添加模板
3. 选择合适模板（建议搜索「到期提醒」或自定义）
4. 记录**模板 ID**
5. 替换代码中所有 `你的模板ID` 为实际模板 ID

### Step 9：申请 OCR 插件
1. 在微信公众平台 → 功能 → 插件
2. 搜索 `wx4418e3e03e19be01`（微信 OCR 插件）
3. 点击添加
4. 或在 `app.json` 的 `plugins` 配置中确认插件版本号

### Step 10：配置服务器域名（API 查询）
1. 在微信公众平台 → 开发 → 开发管理 → 开发设置
2. 服务器域名 → request 合法域名，添加：
   - `https://api.deepseek.com`
   - 其他需要查询的 API 域名
3. **注意**：云函数调用不受域名限制，只有前端 `wx.request` 才受限

---

## ⚠️ 关键配置清单

| 配置项 | 文件位置 | 需替换内容 |
|--------|---------|-----------|
| AppID | `project.config.json` | `"appid": "你的AppID"` |
| 云环境 ID | `app.js` | `env: '你的云环境ID'` |
| 订阅消息模板 | `detail.js` + `sendReminder/index.js` | `tmplIds: ['你的模板ID']` |

---

## 🧪 测试流程

1. **编译预览**：开发者工具中点击「编译」
2. **真机调试**：点击「真机调试」，手机扫码测试
3. **添加产品**：测试三种录入方式
4. **通知测试**：在详情页点击「🔔 提醒」测试订阅消息授权
5. **云函数测试**：在云开发控制台手动触发 `sendReminder`

---

## 📦 项目结构

```
quota-tracker-miniprogram/
├── app.js                    # 全局逻辑（云开发初始化、提醒检查）
├── app.json                  # 全局配置（页面路由、TabBar、OCR插件）
├── app.wxss                  # 全局样式（温暖卡片设计系统）
├── project.config.json       # 项目配置
├── sitemap.json              # 搜索配置
├── pages/
│   ├── index/                # 首页 - 产品列表
│   ├── add/                  # 添加页 - 三种录入模式
│   ├── detail/               # 详情页 - 额度/到期/续费/同步
│   └── settings/             # 设置页 - 提醒/订阅/数据管理
├── components/
│   ├── product-card/         # 产品卡片组件
│   ├── empty-state/          # 空状态组件
│   └── emoji-picker/         # Emoji 选择器组件
├── cloudfunctions/
│   ├── checkQuota/           # 云函数 - API额度查询 & OCR
│   └── sendReminder/         # 云函数 - 定时提醒推送
├── utils/                    # 工具函数
└── images/                   # Tab 图标
```

---

## 💡 与 H5 版本的差异

| 功能 | H5 版本 | 小程序版本 |
|------|---------|-----------|
| 数据存储 | LocalStorage | 云开发数据库（多端同步） |
| API 查询 | 前端 fetch（受 CORS） | 云函数代理（无限制） |
| OCR | Tesseract.js（客户端） | 微信 OCR 插件 / 云函数 |
| 通知 | PWA Notification | 微信订阅消息 |
| 定时提醒 | Service Worker | 云函数定时触发器 |
| 截图 | input file | wx.chooseMedia |
| 离线使用 | ✅ Service Worker 缓存 | ❌ 依赖网络 |

---

## 🔧 常见问题

### Q: 云函数调用报错 `request:ok`
A: 检查云函数是否部署成功，在云开发控制台查看日志

### Q: 订阅消息发不出去
A: 订阅消息需要用户每次主动授权，一次授权只能发一条。建议在关键操作时引导用户授权

### Q: OCR 识别效果不好
A: 可以更换 OCR 插件版本，或在云函数中使用第三方 OCR API（如百度/腾讯云 OCR）

### Q: Tab 图标不显示
A: 确保 `images/` 目录下的图标文件存在，且 `app.json` 中路径正确
