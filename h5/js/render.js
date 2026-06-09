/**
 * render.js — 渲染产品卡片与详情页
 */

const EMOJI_LIST = ['🤖','⚡','🔥','🌊','💎','🎯','🚀','💡','🔑','📊','🌙','☁️','🛡️','💰','📱','🎨','🎵','🔮','🌟','💫','🏆','🎪','🦋','🌈'];

const PROVIDER_META = {
  openai:    { emoji: '🤖', name: 'OpenAI',         color: '#10a37f' },
  anthropic: { emoji: '🧠', name: 'Anthropic',      color: '#cc785c' },
  deepseek:  { emoji: '🔮', name: 'DeepSeek',       color: '#4e6ef2' },
  zhipu:     { emoji: '⚡', name: '智谱 AI',        color: '#6366f1' },
  minimax:   { emoji: '🌟', name: 'MiniMax',        color: '#f59e0b' },
  aliyun:    { emoji: '☁️', name: '阿里云',         color: '#ff6a00' },
  tencent:   { emoji: '🔵', name: '腾讯云',         color: '#0052d9' },
  custom:    { emoji: '🎯', name: '自定义',          color: '#8b5cf6' },
};

const TYPE_LABELS = {
  ai: 'AI 服务', cloud: '云服务', finance: '金融理财', other: '其他'
};

const RENEW_LABELS = {
  monthly: '按月续费', yearly: '按年续费', once: '一次性', '': '未设置'
};

const Render = {

  /* ---- 刷新整个列表 ---- */
  renderList(filter = 'all') {
    const list = document.getElementById('product-list');
    const empty = document.getElementById('empty-state');
    let products = DB.getAll();

    // 筛选
    if (filter !== 'all') {
      products = products.filter(p => {
        const { status } = DB.getStatus(p);
        if (filter === 'expiring') return status === 'warn' || status === 'expired';
        if (filter === 'low')      return status === 'danger';
        if (filter === 'normal')   return status === 'ok';
        return true;
      });
    }

    // 清除旧卡片（保留 empty-state）
    const oldCards = list.querySelectorAll('.product-card');
    oldCards.forEach(c => c.remove());

    // 更新统计
    this.updateStats();

    if (products.length === 0) {
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    products.forEach((p, i) => {
      const card = this.buildCard(p);
      card.style.animationDelay = `${i * 50}ms`;
      list.appendChild(card);
    });
  },

  /* ---- 构建单张卡片 ---- */
  buildCard(product) {
    const { status, reasons } = DB.getStatus(product);
    const statusLabels = { ok: '正常', warn: '需关注', danger: '告急', expired: '已到期' };
    const meta = PROVIDER_META[product.api_provider] || {};
    const emoji = product.emoji || meta.emoji || '📦';

    // 计算剩余额度比例
    let progressPct = 100;
    let progressClass = status;
    if (product.quota_total > 0) {
      const remaining = product.quota_total - product.quota_used;
      progressPct = Math.max(0, Math.round(remaining / product.quota_total * 100));
    }

    // 到期天数
    let daysLeftText = '';
    if (product.expire_date) {
      const now = new Date();
      const expire = new Date(product.expire_date);
      const days = Math.ceil((expire - now) / 86400000);
      daysLeftText = days < 0 ? '已到期' : days === 0 ? '今天到期' : `${days}天后到期`;
    }

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;

    card.innerHTML = `
      <div class="card-status-bar ${status}"></div>
      <div class="card-head">
        <div class="card-brand">
          <div class="brand-logo">${emoji}</div>
          <div class="brand-info">
            <div class="brand-name">${this.escape(product.name)}</div>
            <div class="brand-type">${TYPE_LABELS[product.type] || '产品'}</div>
          </div>
        </div>
        <span class="card-badge ${status}">${statusLabels[status]}</span>
      </div>
      ${product.quota_total > 0 ? `
      <div class="quota-progress-wrap">
        <div class="quota-labels">
          <span class="quota-label-text">剩余额度</span>
          <span class="quota-value">${this.formatQuota(product.quota_total - product.quota_used, product.quota_unit)} / ${this.formatQuota(product.quota_total, product.quota_unit)}</span>
        </div>
        <div class="quota-bar-bg">
          <div class="quota-bar-fill ${progressPct <= 20 ? 'danger' : progressPct <= 50 ? 'warn' : ''}" style="width:${progressPct}%"></div>
        </div>
      </div>
      ` : ''}
      <div class="card-meta">
        ${daysLeftText ? `<div class="meta-item ${status === 'expired' || status === 'warn' ? status : ''}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${daysLeftText}
        </div>` : ''}
        ${reasons.length > 0 ? `<div class="meta-item warn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ${reasons[0]}
        </div>` : ''}
        ${product.last_sync ? `<div class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          ${this.timeAgo(product.last_sync)}
        </div>` : ''}
      </div>
      <div class="card-actions">
        <button class="card-action-btn primary btn-update-quota" data-id="${product.id}">刷新额度</button>
        <button class="card-action-btn btn-view-detail" data-id="${product.id}">查看详情</button>
        <button class="card-action-btn btn-edit-product" data-id="${product.id}">编辑</button>
      </div>
    `;

    return card;
  },

  /* ---- 渲染详情页 ---- */
  renderDetail(product) {
    const { status } = DB.getStatus(product);
    const meta = PROVIDER_META[product.api_provider] || {};
    const emoji = product.emoji || meta.emoji || '📦';
    const body = document.getElementById('detail-body');
    document.getElementById('detail-title').textContent = product.name;

    let progressPct = 100;
    if (product.quota_total > 0) {
      progressPct = Math.max(0, Math.round((product.quota_total - product.quota_used) / product.quota_total * 100));
    }

    let daysLeft = null;
    if (product.expire_date) {
      daysLeft = Math.ceil((new Date(product.expire_date) - new Date()) / 86400000);
    }

    body.innerHTML = `
      <div class="detail-hero">
        <div class="detail-logo">${emoji}</div>
        <div>
          <div class="detail-name">${this.escape(product.name)}</div>
          <div class="detail-type">${TYPE_LABELS[product.type] || ''} · ${RENEW_LABELS[product.renew_period] || ''}</div>
        </div>
      </div>

      ${product.quota_total > 0 ? `
      <div class="detail-quota-card">
        <div class="detail-quota-title">剩余额度</div>
        <div class="detail-quota-nums">
          <span class="quota-big">${this.formatQuota(product.quota_total - product.quota_used, '')}</span>
          <span class="quota-unit">${product.quota_unit || ''}</span>
          <span class="quota-total">/ ${this.formatQuota(product.quota_total, product.quota_unit)}</span>
        </div>
        <div class="quota-bar-bg">
          <div class="quota-bar-fill ${progressPct <= 20 ? 'danger' : progressPct <= 50 ? 'warn' : ''}"
               style="width:${progressPct}%"></div>
        </div>
      </div>
      ` : ''}

      <div class="detail-info-grid">
        ${product.expire_date ? `
        <div class="info-cell">
          <div class="info-cell-label">到期日期</div>
          <div class="info-cell-value ${daysLeft !== null && daysLeft <= 7 ? 'warn' : ''}">${product.expire_date}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">剩余天数</div>
          <div class="info-cell-value ${daysLeft !== null && daysLeft <= 7 ? 'warn' : ''}">${daysLeft !== null ? (daysLeft < 0 ? '已到期' : daysLeft + '天') : '—'}</div>
        </div>
        ` : ''}
        ${product.renew_price > 0 ? `
        <div class="info-cell">
          <div class="info-cell-label">续费费用</div>
          <div class="info-cell-value">¥${product.renew_price}</div>
        </div>
        ` : ''}
        ${product.api_provider ? `
        <div class="info-cell">
          <div class="info-cell-label">服务商</div>
          <div class="info-cell-value">${(PROVIDER_META[product.api_provider] || {}).name || product.api_provider}</div>
        </div>
        ` : ''}
        <div class="info-cell">
          <div class="info-cell-label">自动同步</div>
          <div class="info-cell-value">${product.auto_sync ? '已开启' : '未开启'}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">上次同步</div>
          <div class="info-cell-value">${product.last_sync ? this.timeAgo(product.last_sync) : '—'}</div>
        </div>
      </div>

      ${product.note ? `<div class="info-cell" style="margin-bottom:14px">
        <div class="info-cell-label">备注</div>
        <div class="info-cell-value">${this.escape(product.note)}</div>
      </div>` : ''}

      <div class="detail-actions">
        <button class="detail-btn edit" id="detail-edit-btn" data-id="${product.id}">编辑产品</button>
        <button class="detail-btn delete" id="detail-delete-btn" data-id="${product.id}">删除</button>
      </div>

      ${product.history && product.history.length > 0 ? `
      <div class="detail-history">
        <div class="history-title">更新记录</div>
        <div class="history-list">
          ${product.history.slice(0, 8).map(h => `
            <div class="history-item">
              <span>${h.date} · ${h.note || '更新额度'}</span>
              <span class="history-val">${this.formatQuota(h.quota_used, product.quota_unit)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    `;

    // 绑定详情页内的按钮
    document.getElementById('detail-edit-btn').addEventListener('click', (e) => {
      App.openEditProduct(product.id);
    });
    document.getElementById('detail-delete-btn').addEventListener('click', (e) => {
      App.confirmDelete(product.id);
    });
  },

  /* ---- 构建手动录入表单 ---- */
  buildManualForm(prefill = {}) {
    const container = document.getElementById('manual-form');
    const emojis = EMOJI_LIST;
    const selectedEmoji = prefill.emoji || emojis[0];

    container.innerHTML = `
      <div class="form-section-title">基本信息</div>
      <div class="form-group">
        <label class="form-label">产品名称 <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="m-name" placeholder="例如：ChatGPT Plus" value="${this.escape(prefill.name || '')}" />
      </div>

      <div class="form-group">
        <label class="form-label">图标</label>
        <div class="emoji-grid">
          ${emojis.map(e => `<button type="button" class="emoji-opt ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>`).join('')}
        </div>
        <input type="hidden" id="m-emoji" value="${selectedEmoji}" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">产品类型</label>
          <select class="form-select" id="m-type">
            <option value="ai" ${prefill.type==='ai'?'selected':''}>AI 服务</option>
            <option value="cloud" ${prefill.type==='cloud'?'selected':''}>云服务</option>
            <option value="finance" ${prefill.type==='finance'?'selected':''}>金融理财</option>
            <option value="other" ${prefill.type==='other'?'selected':''}>其他</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">续费周期</label>
          <select class="form-select" id="m-renew-period">
            <option value="">不续费</option>
            <option value="monthly" ${prefill.renew_period==='monthly'?'selected':''}>按月</option>
            <option value="yearly" ${prefill.renew_period==='yearly'?'selected':''}>按年</option>
            <option value="once" ${prefill.renew_period==='once'?'selected':''}>一次性</option>
          </select>
        </div>
      </div>

      <div class="form-section-title">额度信息</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">总额度</label>
          <input type="number" class="form-input" id="m-quota-total" placeholder="0 = 不限" value="${prefill.quota_total || ''}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">已使用</label>
          <input type="number" class="form-input" id="m-quota-used" placeholder="0" value="${prefill.quota_used || '0'}" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">单位</label>
        <select class="form-select" id="m-quota-unit">
          <option value="元" ${prefill.quota_unit==='元'?'selected':''}>元（¥）</option>
          <option value="次" ${prefill.quota_unit==='次'?'selected':''}>次数</option>
          <option value="token" ${prefill.quota_unit==='token'?'selected':''}>Token</option>
          <option value="GB" ${prefill.quota_unit==='GB'?'selected':''}>GB</option>
          <option value="" ${!prefill.quota_unit?'selected':''}>无单位</option>
        </select>
      </div>

      <div class="form-section-title">时间 & 费用</div>
      <div class="form-group">
        <label class="form-label">到期日期</label>
        <input type="date" class="form-input" id="m-expire" value="${prefill.expire_date || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">续费价格（元）</label>
        <input type="number" class="form-input" id="m-renew-price" placeholder="0" value="${prefill.renew_price || ''}" min="0" step="0.01" />
      </div>

      <div class="form-section-title">其他</div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <input type="text" class="form-input" id="m-note" placeholder="可选" value="${this.escape(prefill.note || '')}" />
      </div>
    `;

    // 绑定 emoji 选择
    container.querySelectorAll('.emoji-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('m-emoji').value = btn.dataset.emoji;
      });
    });

    // 保存隐藏的编辑 id
    if (prefill.id) {
      const hiddenId = document.createElement('input');
      hiddenId.type = 'hidden';
      hiddenId.id = 'm-edit-id';
      hiddenId.value = prefill.id;
      container.appendChild(hiddenId);
    }
  },

  /* ---- 从手动表单读取产品对象 ---- */
  readManualForm() {
    const name = document.getElementById('m-name')?.value.trim();
    if (!name) { App.toast('请填写产品名称', 'warn'); return null; }
    return {
      id: document.getElementById('m-edit-id')?.value || undefined,
      name,
      emoji: document.getElementById('m-emoji')?.value || '📦',
      type: document.getElementById('m-type')?.value || 'other',
      renew_period: document.getElementById('m-renew-period')?.value || '',
      quota_total: parseFloat(document.getElementById('m-quota-total')?.value) || 0,
      quota_used: parseFloat(document.getElementById('m-quota-used')?.value) || 0,
      quota_unit: document.getElementById('m-quota-unit')?.value || '元',
      expire_date: document.getElementById('m-expire')?.value || '',
      renew_price: parseFloat(document.getElementById('m-renew-price')?.value) || 0,
      note: document.getElementById('m-note')?.value.trim() || '',
      remind_enabled: true,
    };
  },

  /* ---- 更新统计数字 ---- */
  updateStats() {
    const products = DB.getAll();
    const alerts = products.filter(p => {
      const { status } = DB.getStatus(p);
      return status !== 'ok';
    });
    document.getElementById('stat-total').textContent = products.length;
    document.getElementById('stat-warn').textContent = alerts.length;
    document.getElementById('stat-ok').textContent = products.length - alerts.length;
  },

  /* ---- 工具函数 ---- */
  escape(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },

  formatQuota(num, unit) {
    if (num === undefined || num === null) return '—';
    if (num >= 1e8) return (num/1e8).toFixed(1) + '亿' + (unit||'');
    if (num >= 1e4) return (num/1e4).toFixed(1) + 'w' + (unit||'');
    return num.toLocaleString('zh-CN') + (unit||'');
  },

  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    const day  = Math.floor(diff / 86400000);
    if (min < 2)  return '刚刚';
    if (min < 60) return `${min}分钟前`;
    if (hr < 24)  return `${hr}小时前`;
    if (day < 7)  return `${day}天前`;
    return new Date(iso).toLocaleDateString('zh-CN');
  }
};
