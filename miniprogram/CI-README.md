# 额度追踪 - CI/CD 自动部署

## ⚡ 快速开始

### 你需要做的（仅 2 步）

#### Step 1：获取上传密钥
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置
2. 找到「小程序代码上传」→ 点击「生成」
3. 扫码验证后，**下载密钥文件**（`private.wx你的AppID.key`）

#### Step 2：配置密钥
```bash
cd quota-tracker-miniprogram

# 方式A：本地配置文件
cp ci-config.template.json ci-config.json
# 编辑 ci-config.json，填入 appid 和密钥路径
cp ~/Downloads/private.wx*.key ./

# 方式B：环境变量
cp .env.ci.template .env.ci
# 编辑 .env.ci 填入实际值
```

然后一键部署：
```bash
npm run upload          # 上传开发版
npm run upload:preview  # 仅生成预览二维码
npm run upload:prod     # 上传正式版
```

---

## 📋 部署文件清单

| 文件 | 用途 |
|------|------|
| `scripts/upload.js` | miniprogram-ci 上传脚本（支持预览/上传/多环境） |
| `.github/workflows/deploy.yml` | GitHub Actions 自动部署工作流 |
| `ci-config.template.json` | 本地密钥配置模板 |
| `.env.ci.template` | 环境变量模板 |
| `CI-SETUP.md` | 完整的密钥获取和配置指南 |
| `.gitignore` | 确保密钥文件不进 Git |

---

## 🚀 GitHub Actions 自动部署

推送到 `main` 分支时自动上传开发版，也可手动触发。

需在 GitHub 仓库配置 2 个 Secrets：
- `MP_APPID`：小程序 AppID
- `MP_PRIVATE_KEY`：密钥文件完整内容

详见 `CI-SETUP.md`
