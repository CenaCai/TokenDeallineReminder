// ============================================
// 要到期啦 - Shared Types & Constants
// ============================================

// ---- Subscription Status ----
export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled';

// ---- Billing Cycle ----
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'custom';

// ---- Reminder Channel ----
export type ReminderChannel = 'wechat' | 'chrome' | 'email';

// ---- Repeat Type ----
export type RepeatType = 'none' | 'daily' | 'weekly' | 'until_handled';

// ---- Category ----
export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

// ---- Tag ----
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// ---- Subscription ----
export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  provider: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  custom_cycle_days: number | null;
  start_date: string;
  expire_date: string | null;
  remark: string | null;
  status: SubscriptionStatus;
  auto_renew: boolean;
  tags?: Tag[];
  category?: Category | null;
  created_at: string;
  updated_at: string;
}

// ---- Reminder Policy ----
export interface ReminderPolicy {
  id: string;
  user_id: string;
  subscription_id: string;
  days_before: number[];
  repeat_type: RepeatType;
  channels: ReminderChannel[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Reminder Log ----
export interface ReminderLog {
  id: string;
  user_id: string;
  subscription_id: string;
  channel: ReminderChannel;
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
  error_message: string | null;
}

// ---- Template ----
export interface Template {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  icon: string | null;
  is_official: boolean;
  created_at: string;
}

// ---- Profile ----
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  email: string | null;
  wechat_openid: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  total_subscriptions: number;
  monthly_expense: number;
  yearly_expense: number;
  expiring_soon_count: number;
  expired_count: number;
}

// ---- Timeline Item ----
export interface TimelineItem {
  date: string;
  subscriptions: Subscription[];
}

// ---- Expense Stat ----
export interface ExpenseByCategory {
  category: string;
  total: number;
  currency: string;
}

export interface ExpenseByMonth {
  month: string; // 'YYYY-MM'
  total: number;
  currency: string;
}

export interface ExpenseByCurrency {
  currency: string;
  total: number;
}

// ---- Default Categories ----
export const DEFAULT_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'AI工具', icon: 'brain' },
  { name: '域名', icon: 'globe' },
  { name: '服务器', icon: 'server' },
  { name: '机场VPN', icon: 'shield' },
  { name: '视频会员', icon: 'tv' },
  { name: '音乐会员', icon: 'music' },
  { name: '软件授权', icon: 'key' },
  { name: '开发工具', icon: 'code' },
  { name: '办公工具', icon: 'briefcase' },
  { name: '其它', icon: 'box' },
];

// ---- Default Tags ----
export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: 'OpenAI', color: '#10a37f' },
  { name: 'Claude', color: '#d97706' },
  { name: 'Cursor', color: '#6366f1' },
  { name: 'Gemini', color: '#3b82f6' },
  { name: 'Midjourney', color: '#8b5cf6' },
  { name: 'Vercel', color: '#000000' },
  { name: 'Cloudflare', color: '#f97316' },
  { name: '阿里云', color: '#ff6a00' },
  { name: '腾讯云', color: '#006eff' },
];

// ---- Reminder Days Options ----
export const REMINDER_DAYS_OPTIONS = [
  { value: 30, label: '提前30天' },
  { value: 15, label: '提前15天' },
  { value: 7, label: '提前7天' },
  { value: 3, label: '提前3天' },
  { value: 1, label: '提前1天' },
  { value: 0, label: '当天' },
  { value: -1, label: '过期后' },
];

// ---- Currency Options ----
export const CURRENCY_OPTIONS = [
  { value: 'CNY', label: 'CNY ¥', symbol: '¥' },
  { value: 'USD', label: 'USD $', symbol: '$' },
  { value: 'EUR', label: 'EUR €', symbol: '€' },
  { value: 'GBP', label: 'GBP £', symbol: '£' },
  { value: 'JPY', label: 'JPY ¥', symbol: '¥' },
];

// ---- Billing Cycle Options ----
export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' },
  { value: 'lifetime', label: '终身' },
  { value: 'custom', label: '自定义' },
];
