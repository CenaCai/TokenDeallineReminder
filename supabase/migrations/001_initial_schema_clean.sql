-- ============================================
-- 要到期啦 - Database Schema (Clean Version)
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. 用户资料表
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT 'helloworld',
  avatar_url TEXT,
  email TEXT,
  wechat_openid TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 分类表
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 标签表
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 订阅表
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  provider TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'lifetime', 'custom')),
  custom_cycle_days INT,
  start_date DATE NOT NULL,
  expire_date DATE,
  remark TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'cancelled')),
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 订阅-标签关联表
CREATE TABLE IF NOT EXISTS public.subscription_tags (
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (subscription_id, tag_id)
);

-- 6. 提醒策略表
CREATE TABLE IF NOT EXISTS public.reminder_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  days_before INT[] NOT NULL DEFAULT '{30,15,7,3,1,0}',
  repeat_type TEXT NOT NULL DEFAULT 'none' CHECK (repeat_type IN ('none', 'daily', 'weekly', 'until_handled')),
  channels TEXT[] NOT NULL DEFAULT '{"wechat","chrome","email"}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 提醒记录表
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('wechat', 'chrome', 'email')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  error_message TEXT
);

-- 8. 模板表
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  icon TEXT,
  is_official BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expire_date ON public.subscriptions(expire_date);
CREATE INDEX IF NOT EXISTS idx_reminder_policies_user_id ON public.reminder_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own reminder_policies" ON public.reminder_policies;
DROP POLICY IF EXISTS "Users can insert own reminder_policies" ON public.reminder_policies;
DROP POLICY IF EXISTS "Users can update own reminder_policies" ON public.reminder_policies;
DROP POLICY IF EXISTS "Users can delete own reminder_policies" ON public.reminder_policies;
DROP POLICY IF EXISTS "Users can view own reminder_logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Users can insert own reminder_logs" ON public.reminder_logs;
DROP POLICY IF EXISTS "Anyone can view templates" ON public.templates;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id OR is_system = true);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Tags
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Subscription Tags
CREATE POLICY "Users can view own subscription_tags" ON public.subscription_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own subscription_tags" ON public.subscription_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own subscription_tags" ON public.subscription_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.subscriptions WHERE id = subscription_id AND user_id = auth.uid())
);

-- Reminder Policies
CREATE POLICY "Users can view own reminder_policies" ON public.reminder_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminder_policies" ON public.reminder_policies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminder_policies" ON public.reminder_policies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminder_policies" ON public.reminder_policies FOR DELETE USING (auth.uid() = user_id);

-- Reminder Logs
CREATE POLICY "Users can view own reminder_logs" ON public.reminder_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminder_logs" ON public.reminder_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Templates (everyone can read)
CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT USING (true);

-- ============================================
-- Triggers: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS reminder_policies_updated_at ON public.reminder_policies;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER reminder_policies_updated_at BEFORE UPDATE ON public.reminder_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'helloworld'),
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Seed: Default Categories (system)
-- ============================================
INSERT INTO public.categories (name, icon, sort_order, is_system) VALUES
  ('AI工具', 'brain', 1, true),
  ('域名', 'globe', 2, true),
  ('服务器', 'server', 3, true),
  ('机场VPN', 'shield', 4, true),
  ('视频会员', 'tv', 5, true),
  ('音乐会员', 'music', 6, true),
  ('软件授权', 'key', 7, true),
  ('开发工具', 'code', 8, true),
  ('办公工具', 'briefcase', 9, true),
  ('其它', 'box', 10, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed: Templates
-- ============================================
INSERT INTO public.templates (name, category, provider, amount, currency, billing_cycle, icon) VALUES
  ('ChatGPT Plus', 'AI工具', 'OpenAI', 20, 'USD', 'monthly', 'message-square'),
  ('Claude Max', 'AI工具', 'Anthropic', 100, 'USD', 'monthly', 'sparkles'),
  ('Gemini Pro', 'AI工具', 'Google', 20, 'USD', 'monthly', 'star'),
  ('Cursor Pro', 'AI工具', 'Cursor', 20, 'USD', 'monthly', 'mouse-pointer'),
  ('Midjourney', 'AI工具', 'Midjourney', 10, 'USD', 'monthly', 'image'),
  ('OpenRouter', 'AI工具', 'OpenRouter', 0, 'USD', 'monthly', 'route'),
  ('Vercel', '开发工具', 'Vercel', 20, 'USD', 'monthly', 'triangle'),
  ('Github Pro', '开发工具', 'GitHub', 4, 'USD', 'monthly', 'github'),
  ('Cloudflare', '服务器', 'Cloudflare', 0, 'USD', 'monthly', 'cloud'),
  ('Namecheap', '域名', 'Namecheap', 9, 'USD', 'yearly', 'tag'),
  ('阿里云', '服务器', '阿里云', 0, 'CNY', 'monthly', 'cloud'),
  ('腾讯云', '服务器', '腾讯云', 0, 'CNY', 'monthly', 'cloud')
ON CONFLICT DO NOTHING;

-- ============================================
-- Success message
-- ============================================
SELECT 'Database setup complete!' as status;
