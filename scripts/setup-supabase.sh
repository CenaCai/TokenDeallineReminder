#!/usr/bin/env bash
# ============================================
# 要到期啦 - Supabase 一键初始化脚本
# ============================================
# 使用方法：
#   1. 先去 https://supabase.com 注册并登录
#   2. 在 Dashboard > Account > Access Tokens 创建一个 token
#   3. 运行: bash scripts/setup-supabase.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "🚀 要到期啦 - Supabase 初始化向导"
echo "=================================="
echo ""

# Step 1: Check Supabase CLI
echo "📦 检查 Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "  正在使用 npx 版本..."
    SUPABASE="npx supabase"
else
    SUPABASE="supabase"
fi
echo "  ✓ 就绪"
echo ""

# Step 2: Login
echo "🔑 Step 1: 登录 Supabase"
echo "  请在浏览器中打开 https://supabase.com/dashboard/account/tokens"
echo "  创建一个 Access Token 并粘贴到下方："
echo ""
$SUPABASE login
echo "  ✓ 登录成功"
echo ""

# Step 3: Create project
echo "📁 Step 2: 创建项目"
read -p "  项目名称 [yao-dao-qi-la]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-yao-dao-qi-la}

read -p "  数据库密码 (留空自动生成): " DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
    echo "  生成的密码: $DB_PASSWORD"
    echo "  ⚠️  请保存此密码！"
fi

read -p "  区域 [ap-southeast-1] (新加坡): " REGION
REGION=${REGION:-ap-southeast-1}

echo ""
echo "  正在创建项目 (约需2分钟)..."
$SUPABASE projects create "$PROJECT_NAME" \
    --database-password "$DB_PASSWORD" \
    --region "$REGION" \
    || echo "  项目可能已存在，继续..."
echo "  ✓ 项目创建完成"
echo ""

# Step 4: Link project
echo "🔗 Step 3: 关联项目"
PROJECT_ID=$($SUPABASE projects list 2>/dev/null | grep "$PROJECT_NAME" | awk '{print $1}' | head -1)

if [ -z "$PROJECT_ID" ]; then
    echo "  请输入项目 ID (从 Dashboard URL 中获取):"
    read -p "  Project ID: " PROJECT_ID
fi

cd "$PROJECT_ROOT"
$SUPABASE link --project-ref "$PROJECT_ID" || echo "  已关联，继续..."
echo "  ✓ 关联完成"
echo ""

# Step 5: Push migration
echo "🗄️  Step 4: 执行数据库迁移"
$SUPABASE db push || echo "  迁移可能已执行，继续..."
echo "  ✓ 数据库迁移完成"
echo ""

# Step 6: Get credentials
echo "📋 Step 5: 获取项目凭证"
echo "  请从 Supabase Dashboard > Settings > API 复制以下值："
echo ""
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │ Project URL: https://${PROJECT_ID}.supabase.co    │"
echo "  │ anon (public) key: (从 Dashboard 复制)            │"
echo "  │ service_role key: (从 Dashboard 复制)            │"
echo "  └──────────────────────────────────────────────────┘"
echo ""

# Step 7: Update .env.local
read -p "  请粘贴 Project URL: " SUPABASE_URL
read -p "  请粘贴 Anon Key: " ANON_KEY
read -p "  请粘贴 Service Role Key: " SERVICE_KEY

ENV_FILE="$PROJECT_ROOT/apps/web/.env.local"
cat > "$ENV_FILE" << ENVEOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY

# Authing (可选)
NEXT_PUBLIC_AUTHING_APP_ID=
NEXT_PUBLIC_AUTHING_HOST=
AUTHING_SECRET=

# 微信开放平台 (可选)
WECHAT_OPEN_APP_ID=
WECHAT_OPEN_APP_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

echo "  ✓ .env.local 已更新"
echo ""

# Step 8: Seed default categories (optional)
echo "🌱 Step 6: 初始化种子数据"
echo "  默认分类和模板已在迁移 SQL 中创建"
echo "  如需额外数据，可在 Supabase SQL Editor 中运行"
echo ""

echo "=================================="
echo "✅ 初始化完成！"
echo ""
echo "接下来："
echo "  1. cd apps/web && npm run dev"
echo "  2. 打开 http://localhost:3000"
echo "  3. 使用邮箱登录测试"
echo ""
echo "微信登录配置："
echo "  方案A: https://www.authing.cn (免费, 推荐)"
echo "  方案B: https://open.weixin.qq.com (需企业认证)"
echo "=================================="
