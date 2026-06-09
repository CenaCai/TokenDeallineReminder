/**
 * db.js — LocalStorage 数据层
 * 产品数据结构:
 * {
 *   id: string,
 *   name: string,
 *   emoji: string,
 *   type: string,           // 'ai' | 'cloud' | 'finance' | 'other'
 *   provider: string,       // 服务商标识
 *   // 额度
 *   quota_total: number,    // 总额度（为0表示不追踪额度）
 *   quota_used: number,     // 已用额度
 *   quota_unit: string,     // 单位: '元' | '次' | 'token' | 'GB' | ''
 *   // 时间
 *   expire_date: string,    // 到期日 'YYYY-MM-DD' 或 ''
 *   renew_period: string,   // 续费周期: 'monthly' | 'yearly' | 'once' | ''
 *   renew_price: number,    // 续费价格（元）
 *   // API 相关
 *   api_key: string,        // API Key（可选，本地加密存储）
 *   api_provider: string,   // API 服务商 key
 *   auto_sync: boolean,     // 是否自动同步
 *   last_sync: string,      // 最后同步时间
 *   // 提醒
 *   remind_enabled: boolean,
 *   // 元数据
 *   note: string,
 *   created_at: string,
 *   updated_at: string,
 *   // 历史记录
 *   history: Array<{date: string, quota_used: number, note: string}>
 * }
 */

const DB = {
  PRODUCTS_KEY: 'quota_tracker_products',
  SETTINGS_KEY: 'quota_tracker_settings',
  _currentUserId: 'default',

  /* ---- 用户绑定 ---- */
  setUser(userId) {
    this._currentUserId = userId || 'default';
    // 更新 key 为用户维度的 key
    this.PRODUCTS_KEY = 'qt_products_' + this._currentUserId;
    this.SETTINGS_KEY = 'qt_settings_' + this._currentUserId;
  },

  // 将无用户前缀的旧数据迁移到用户维度
  migrateToUser(userId) {
    const oldProducts = localStorage.getItem('quota_tracker_products');
    const oldSettings = localStorage.getItem('quota_tracker_settings');
    
    if (oldProducts && !localStorage.getItem('qt_products_' + userId)) {
      localStorage.setItem('qt_products_' + userId, oldProducts);
    }
    if (oldSettings && !localStorage.getItem('qt_settings_' + userId)) {
      localStorage.setItem('qt_settings_' + userId, oldSettings);
    }
    
    this.setUser(userId);
  },

  /* ---- 产品 CRUD ---- */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    } catch { return []; }
  },

  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  save(product) {
    const list = this.getAll();
    const idx = list.findIndex(p => p.id === product.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      product.updated_at = now;
      list[idx] = product;
    } else {
      product.id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
      product.created_at = now;
      product.updated_at = now;
      product.history = product.history || [];
      list.unshift(product);
    }
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(list));
    return product;
  },

  delete(id) {
    const list = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(list));
  },

  updateQuota(id, quotaUsed, note = '') {
    const product = this.getById(id);
    if (!product) return;
    const prev = product.quota_used;
    product.quota_used = quotaUsed;
    product.last_sync = new Date().toISOString();
    // 追加历史
    if (!product.history) product.history = [];
    product.history.unshift({
      date: new Date().toLocaleDateString('zh-CN'),
      quota_used: quotaUsed,
      prev_used: prev,
      note: note || '更新额度'
    });
    // 只保留最近20条
    if (product.history.length > 20) product.history = product.history.slice(0, 20);
    this.save(product);
  },

  /* ---- 设置 ---- */
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
    } catch { return {}; }
  },

  saveSettings(settings) {
    const curr = this.getSettings();
    const merged = { ...curr, ...settings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(merged));
  },

  /* ---- 计算状态 ---- */
  getStatus(product) {
    const now = new Date();
    const settings = this.getSettings();
    const lowThreshold = (settings.lowQuotaThreshold || 20) / 100;
    const expireDaysBefore = settings.expireDaysBefore || 7;

    let status = 'ok';
    let reasons = [];

    // 检查到期
    if (product.expire_date) {
      const expire = new Date(product.expire_date);
      const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        status = 'expired';
        reasons.push('已到期');
      } else if (daysLeft <= expireDaysBefore) {
        status = 'warn';
        reasons.push(`${daysLeft}天后到期`);
      }
    }

    // 检查额度
    if (product.quota_total > 0) {
      const remaining = product.quota_total - product.quota_used;
      const ratio = remaining / product.quota_total;
      if (ratio <= 0.05) {
        status = 'danger';
        reasons.push('额度即将耗尽');
      } else if (ratio <= lowThreshold && status === 'ok') {
        status = 'warn';
        reasons.push('额度不足');
      }
    }

    return { status, reasons };
  },

  /* ---- 获取需要提醒的产品 ---- */
  getAlerts() {
    return this.getAll()
      .filter(p => p.remind_enabled !== false)
      .map(p => ({ product: p, ...this.getStatus(p) }))
      .filter(r => r.status !== 'ok');
  }
};
