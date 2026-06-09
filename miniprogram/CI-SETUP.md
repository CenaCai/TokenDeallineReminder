# 🔐 小程序 CI/CD 配置指南

## 一、获取上传密钥（必须）

### Step 1：登录微信公众平台
前往 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置

### Step 2：生成上传密钥
1. 找到「小程序代码上传」区域
2. 点击「生成」按钮
3. **扫码验证身份**
4. 下载 **上传密钥文件**（文件名格式：`private.wx你的AppID.key`）
5. ⚠️ **同时记下密钥对应的代码（code）**，配置 IP 白名单时需要

### Step 3：配置 IP 白名单
同一页面下方：
1. 「IP 白名单」→ 点击「修改」
2. 添加你的公网 IP（或关闭白名单，仅开发环境建议关闭）
3. 如果用 GitHub Actions，需要添加 GitHub Actions 的 IP 段
   - 查询：https://api.github.com/meta → `actions` 字段
   - 或直接关闭白名单（方便但安全性降低）

---

## 二、本地配置（首次）

### 方式 A：配置文件（推荐本地开发）

```bash
# 1. 复制配置模板
cp ci-config.template.json ci-config.json

# 2. 编辑 ci-config.json，填入实际值
# {
#   "appid": "wx你的AppID",
#   "privateKeyPath": "./private.wx你的AppID.key"
# }

# 3. 把密钥文件放到项目根目录
cp ~/Downloads/private.wx你的AppID.key ./
```

### 方式 B：环境变量

```bash
# 1. 复制环境变量模板
cp .env.ci.template .env.ci

# 2. 编辑 .env.ci，填入实际值

# 3. 加载环境变量
source .env.ci
```

### 安装依赖并测试

```bash
cd quota-tracker-miniprogram
npm install

# 生成预览码（测试连通性）
npm run upload:preview

# 上传开发版
npm run upload
```

---

## 三、GitHub Actions 配置（自动部署）

### Step 1：配置 Secrets

在你的 GitHub 仓库 → Settings → Secrets and variables → Actions，添加：

| Secret 名 | 值 | 说明 |
|-----------|-----|------|
| `MP_APPID` | `wx1234567890abcdef` | 你的小程序 AppID |
| `MP_PRIVATE_KEY` | 密钥文件的**完整内容** | 包含 BEGIN/END 行 |

获取 MP_PRIVATE_KEY 内容：
```bash
cat private.wx你的AppID.key | pbcopy
# 然后粘贴到 GitHub Secrets
```

### Step 2：调整工作流路径

如果你的仓库结构不同，修改 `.github/workflows/deploy.yml` 中的路径：
```yaml
paths:
  - 'quota-tracker-miniprogram/**'  # ← 改为你的实际路径
```

### Step 3：触发部署

**自动触发**：推送代码到 `main` 分支且修改了 `quota-tracker-miniprogram/` 下的文件

**手动触发**：GitHub → Actions → 选择工作流 → Run workflow
- 可选环境：dev / prod
- 可选仅预览：勾选后只生成预览码不上传

---

## 四、工作流说明

```
推送代码到 main
    │
    ├── 自动检测文件变更
    │
    ▼
安装 Node.js + npm 依赖
    │
    ▼
写入密钥文件
    │
    ▼
┌───────────────────────┐
│  npm run upload        │ ← 上传开发版
│  npm run upload:preview │ ← 或仅生成预览码
└───────────────────────┘
    │
    ▼
上传成功 → mp.weixin.qq.com 版本管理中可见
    │
    ▼
手动操作：设为体验版 / 提交审核 / 发布
```

---

## 五、版本号规则

| 环境 | 版本格式 | 示例 |
|------|---------|------|
| 开发版 | `0.0.YYMMDD` | `0.0.260609` |
| 正式版 | `1.0.YYMMDD` | `1.0.260609` |

版本描述自动包含：`{环境}@{日期}.{时间}`

---

## 六、常见问题

### Q: 上传报错 "not in whitelist"
A: 当前 IP 不在白名单中。要么添加 IP，要么在 mp.weixin.qq.com 关闭白名单。

### Q: 上传报错 "invalid key"
A: 密钥文件与 AppID 不匹配，或密钥已过期。重新生成一份。

### Q: GitHub Actions 上传失败
A: 检查 Secrets 中的 `MP_PRIVATE_KEY` 是否包含完整内容（包括 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----` 行）。

### Q: 如何查看上传结果
A: 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 管理 → 版本管理，在「开发版本」中可以看到。

### Q: 能不能一步到位发布到线上
A: 不能。微信规定所有小程序必须经过**审核**才能发布。CI/CD 只能做到上传代码，审核和发布仍需手动操作。

### Q: 云函数怎么自动部署
A: 云函数目前不支持 CI 自动部署，需在微信开发者工具中手动上传。微信官方暂未开放云函数的 CLI 部署接口。

---

## 七、安全提醒

- ✅ `ci-config.json`、`.env.ci`、`private.*.key` 已加入 `.gitignore`，不会进入 Git
- ✅ GitHub Actions 使用 Secrets 存储密钥，加密且不可逆读
- ✅ 每次部署后自动清理密钥文件
- ⚠️ 绝不要将密钥文件提交到 Git 仓库
- ⚠️ 定期轮换上传密钥（建议每 3 个月）
