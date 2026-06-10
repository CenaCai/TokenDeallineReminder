# 发布与回退规范

本文档定义「要到期啦」的正式软件开发流程。目标是保证每个版本可追踪、可测试、可预发布、可回退。

## 环境

| 环境 | 用途 | 部署位置 | 数据 |
| --- | --- | --- | --- |
| 本地开发 | 日常功能开发 | 开发者 Mac，本地 `npm run dev` | 开发 Supabase 项目或本地数据 |
| 预发布 | 正式发布前验收 | 开发者 Mac，使用 production build 启动 | 预发布 Supabase 项目，禁止使用正式 service role key |
| 正式 | 用户访问 | Vercel，Root Directory 为 `web` | 正式 Supabase 项目 |

个人开发阶段可以用 Mac 作为预发布环境，但必须用 `npm run build && npm run start` 方式验证，不以 dev server 作为验收依据。

## 分支模型

| 分支 | 说明 | 规则 |
| --- | --- | --- |
| `main` | 正式稳定分支 | 只能通过 PR 合入，必须通过 Release preflight |
| `develop` | 开发集成分支 | 功能完成后先合入这里 |
| `feature/<scope>-<name>` | 功能分支 | 从 `develop` 创建，合入 `develop` |
| `release/vX.Y.Z` | 版本预发布分支 | 从 `develop` 创建，只允许修复发布阻塞问题 |
| `hotfix/vX.Y.Z` | 线上 P0 修复 | 从 `main` 或稳定 tag 创建，修复后合入 `main` 和 `develop` |

每个正式版本必须有对应的 `release/vX.Y.Z` 分支和 `vX.Y.Z` tag。

## 版本号

使用语义化版本：

- `MAJOR`: 不兼容的数据结构、接口或用户工作流变化
- `MINOR`: 向后兼容的新功能
- `PATCH`: 向后兼容的修复

示例：

- `v2.0.0`: v2 全平台版本首次正式发布
- `v2.1.0`: 新增邮件提醒
- `v2.1.1`: 修复提醒去重问题

如果只发布特定端，可以追加后缀：

- `v2.0.0-web`
- `v2.0.0-mp`
- `v2.0.0-extension`

## 标准发布流程

1. 从 `develop` 创建版本分支：

```bash
git checkout develop
git pull
git checkout -b release/v2.0.0
```

2. 在版本分支只做发布相关修改：

- 更新版本号
- 更新变更说明
- 修复测试发现的阻塞问题
- 不再合入新功能

3. 在 Mac 上跑预发布检查：

```bash
export NEXT_PUBLIC_SUPABASE_URL="预发布 Supabase URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="预发布 Supabase anon key"
export SUPABASE_SERVICE_ROLE_KEY="预发布 Supabase service role key"
bash scripts/preflight-web.sh
```

4. 手动验收关键路径：

- 打开登录页
- 邮箱 Magic Link 回调可用
- Dashboard 可加载
- 新建/编辑/删除订阅可用
- 模板一键创建可用
- Chrome 扩展配置后可以读取订阅
- 小程序可以打开首页和添加页

5. 推送 release 分支并创建 PR 到 `main`：

```bash
git push -u origin release/v2.0.0
```

6. GitHub Actions 的 `Release preflight` 必须通过。

7. PR 合入 `main` 后打 tag：

```bash
git checkout main
git pull
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0
```

8. 将 `main` 回合到 `develop`：

```bash
git checkout develop
git pull
git merge main
git push
```

## 自动化测试闸门

发布前至少通过以下检查：

- Web lint
- Web production build
- 本地启动 production server
- 接口 smoke 测试：
  - `GET /api/health`
  - `GET /`
  - `GET /api/auth/wechat`
- 小程序目录结构检查
- Chrome 扩展目录结构检查

当前自动化检查由以下文件维护：

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `scripts/preflight-web.sh`

## 预发布环境

Mac 预发布环境建议使用独立端口，例如：

```bash
PORT=3100 bash scripts/preflight-web.sh
```

如果要长时间对外预览，可以在预发布检查通过后单独启动：

```bash
cd web
npm run start -- -p 3100
```

预发布环境注意事项：

- 不使用开发服务器验收正式发布
- 不使用正式 service role key
- 不在公开文档、代码、截图中暴露密钥
- 每次预发布都记录对应分支和 commit SHA

## 正式部署

Web 正式环境由 Vercel 管理：

- Root Directory: `web`
- Production Branch: `main`
- 环境变量只配置在 Vercel Dashboard 或 GitHub Secrets
- 不把任何 service role key 提交到 Git 仓库

建议在 Vercel 中开启：

- Preview Deployments for PR
- Production Deployment only from `main`
- Environment Variables 分环境管理

## 回退策略

### Web 回退

优先用 Vercel 回退：

1. 打开 Vercel 项目
2. 进入 Deployments
3. 找到上一个稳定版本对应的 deployment
4. 点击 Promote to Production
5. 记录事故和回退版本

如果需要 Git 层面回退：

```bash
git checkout main
git pull
git revert <bad_commit_sha>
git push origin main
```

不要对公开 `main` 执行 `git reset --hard` 后强推。

### 小程序回退

小程序以微信公众平台后台版本为准：

1. 进入小程序管理后台
2. 找到线上稳定版本
3. 执行版本回退或重新提交旧 tag 对应代码
4. 若使用 CI 上传，使用上一个稳定 tag 重新上传

### 数据库回退

数据库回退必须单独评估。原则：

- 只允许向前兼容的迁移直接上线
- 删除字段、改类型、重命名字段必须分两阶段发布
- 每次数据库变更先在预发布项目验证
- P0 时优先回退应用版本，不轻易回滚数据库

## P0 处理流程

1. 立即停止继续发布
2. 判断是否影响登录、数据安全、提醒发送、支付/金额数据
3. 如果影响用户核心路径，先回退到上一个稳定版本
4. 从稳定 tag 创建 `hotfix/vX.Y.Z`
5. 修复后跑 `scripts/preflight-web.sh`
6. PR 合入 `main`
7. 打 patch tag
8. 合回 `develop`
9. 补事故记录

## 密钥规范

- `SUPABASE_SERVICE_ROLE_KEY` 只能存在于服务端环境变量和 CI/Vercel Secrets
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以出现在客户端，但仍建议从环境变量注入
- 小程序、Chrome 扩展只允许使用 anon key 或用户 token
- 已经公开暴露过的 service role key 必须立即轮换
