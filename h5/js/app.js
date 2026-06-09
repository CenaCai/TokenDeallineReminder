/**
 * app.js — 主应用逻辑、事件绑定、页面协调
 */

const App = {
  currentFilter: 'all',
  currentMethod: 'api',
  editingProductId: null,

  /* ================================================================
     初始化
     ================================================================ */
  init() {
    // 注册 Service Worker
    Notifications.registerSW();

    // 加载设置
    this.loadSettings();

    // 渲染列表
    Render.renderList(this.currentFilter);

    // 绑定所有事件
    this.bindHeader();
    this.bindFAB();
    this.bindFilters();
    this.bindAddSheet();
    this.bindDetailSheet();
    this.bindNotifSheet();
    this.bindAlertButtons();
    this.bindListDelegation();

    // 启动定时检查
    Notifications.scheduleCheck();

    // 更新通知权限卡片
    Notifications.updatePermCard();
  },

  /* ================================================================
     Header
     ================================================================ */
  bindHeader() {
    document.getElementById('notif-btn').addEventListener('click', () => {
      this.openSheet('page-notif');
      Notifications.updatePermCard();
    });
  },

  /* ================================================================
     FAB 添加按钮
     ================================================================ */
  bindFAB() {
    document.getElementById('fab-add').addEventListener('click', () => {
      this.editingProductId = null;
      this.openAddSheet();
    });
  },

  openAddSheet(prefill = {}) {
    this.currentMethod = 'api';
    this.switchMethod('api');
    Render.buildManualForm(prefill);
    document.getElementById('api-provider').value = prefill.api_provider || '';
    document.getElementById('api-custom-name-group').style.display = 'none';
    document.getElementById('api-result').classList.add('hidden');
    document.getElementById('ocr-result').classList.add('hidden');
    document.getElementById('preview-img').classList.add('hidden');
    document.getElementById('upload-placeholder').style.display = 'flex';
    this.openSheet('page-add');
  },

  /* ================================================================
     筛选标签
     ================================================================ */
  bindFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter;
        Render.renderList(this.currentFilter);
      });
    });
  },

  /* ================================================================
     添加/编辑 Sheet
     ================================================================ */
  bindAddSheet() {
    // 关闭
    document.getElementById('close-add').addEventListener('click', () => this.closeSheet('page-add'));
    document.getElementById('page-add').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeSheet('page-add');
    });

    // 切换录入方式
    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchMethod(btn.dataset.method));
    });

    // API 服务商切换
    document.getElementById('api-provider').addEventListener('change', e => {
      const v = e.target.value;
      document.getElementById('api-custom-name-group').style.display = v === 'custom' ? 'block' : 'none';
      document.getElementById('api-result').classList.add('hidden');
    });

    // API Key 显示/隐藏
    document.getElementById('toggle-key-vis').addEventListener('click', () => {
      const inp = document.getElementById('api-key-input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // 自动获取余额
    document.getElementById('btn-fetch-api').addEventListener('click', () => this.handleFetchAPI());

    // 保存 API 产品
    document.getElementById('btn-save-api').addEventListener('click', () => this.saveAPIProduct());

    // 文件上传 / OCR
    document.getElementById('upload-zone').addEventListener('click', e => {
      if (!e.target.matches('input')) {
        document.getElementById('file-input').click();
      }
    });
    document.getElementById('file-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    });

    // 拖拽上传
    const zone = document.getElementById('upload-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.handleImageUpload(file);
    });

    // OCR 分析
    document.getElementById('btn-ocr-analyze').addEventListener('click', () => this.handleOCR());

    // 手动保存
    document.getElementById('btn-save-manual').addEventListener('click', () => this.saveManualProduct());
  },

  switchMethod(method) {
    this.currentMethod = method;
    document.querySelectorAll('.method-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.method === method);
    });
    document.querySelectorAll('.method-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`panel-${method}`).classList.remove('hidden');
  },

  /* ---- API 获取余额 ---- */
  async handleFetchAPI() {
    const provider = document.getElementById('api-provider').value;
    const apiKey = document.getElementById('api-key-input').value.trim();

    if (!provider) { this.toast('请选择服务商', 'warn'); return; }
    if (!apiKey)   { this.toast('请输入 API Key', 'warn'); return; }

    const btn = document.getElementById('btn-fetch-api');
    const spinner = btn.querySelector('.spin-icon');
    const label = btn.querySelector('span');
    btn.disabled = true;
    spinner.classList.remove('hidden');
    label.textContent = '查询中…';

    try {
      const result = await APIProviders.fetch(provider, apiKey);
      document.getElementById('api-balance').textContent = result.balance || '—';
      document.getElementById('api-expire').textContent = result.expire || '无到期限制';
      document.getElementById('api-result').classList.remove('hidden');

      // 存储临时结果用于保存
      this._pendingAPIResult = { ...result, provider, apiKey };
      this.toast('获取成功', 'ok');
    } catch (e) {
      this.toast(e.message || '查询失败', 'danger');
      // 如果是 CORS 等问题，自动切换到手动模式并提示
      if (e.message.includes('CORS') || e.message.includes('截图识别') || e.message.includes('手动')) {
        setTimeout(() => {
          this.switchMethod('ocr');
          this.toast('已切换到截图识别模式', 'ok');
        }, 1500);
      }
    } finally {
      btn.disabled = false;
      spinner.classList.add('hidden');
      label.textContent = '自动获取余额';
    }
  },

  saveAPIProduct() {
    const r = this._pendingAPIResult;
    if (!r) return;
    const meta = { openai: 'OpenAI', anthropic: 'Anthropic', deepseek: 'DeepSeek', zhipu: '智谱AI', minimax: 'MiniMax', aliyun: '阿里云', tencent: '腾讯云' };
    const providerMeta = PROVIDER_META[r.provider] || {};
    const product = {
      name: document.getElementById('api-custom-name')?.value.trim() || meta[r.provider] || r.provider,
      emoji: providerMeta.emoji || '⚡',
      type: 'ai',
      api_provider: r.provider,
      api_key: r.apiKey,
      auto_sync: true,
      quota_total: r.quota_total || 0,
      quota_used: r.quota_used || 0,
      quota_unit: r.unit || '元',
      expire_date: r.expire ? this.parseDate(r.expire) : '',
      renew_period: '',
      renew_price: 0,
      remind_enabled: true,
      last_sync: new Date().toISOString(),
      note: '通过 API 自动获取'
    };
    DB.save(product);
    this.closeSheet('page-add');
    Render.renderList(this.currentFilter);
    this.toast('产品已保存', 'ok');
    this._pendingAPIResult = null;
  },

  /* ---- 图片上传 ---- */
  handleImageUpload(file) {
    this._ocrFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.getElementById('preview-img');
      img.src = e.target.result;
      img.classList.remove('hidden');
      document.getElementById('upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
    this.toast('图片已选择，点击「开始识别」', 'ok');
  },

  /* ---- OCR 识别 ---- */
  async handleOCR() {
    if (!this._ocrFile) { this.toast('请先上传截图', 'warn'); return; }

    const btn = document.getElementById('btn-ocr-analyze');
    const spinner = btn.querySelector('.spin-icon');
    const label = btn.querySelector('span');
    btn.disabled = true;
    spinner.classList.remove('hidden');
    label.textContent = '识别中…';

    try {
      this.toast('正在识别，请稍候…');
      const info = await OCR.recognize(this._ocrFile);
      document.getElementById('ocr-result').classList.remove('hidden');

      // 切换到手动面板并填入识别结果
      this.switchMethod('manual');
      Render.buildManualForm(info);
      OCR.fillForm(info);

      const conf = info.confidence;
      if (conf >= 60) {
        this.toast(`识别完成，置信度 ${conf}%，请检查并修正`, 'ok');
      } else {
        this.toast(`识别置信度较低（${conf}%），请仔细核对`, 'warn');
      }
    } catch (e) {
      this.toast('识别失败：' + (e.message || '未知错误'), 'danger');
    } finally {
      btn.disabled = false;
      spinner.classList.add('hidden');
      label.textContent = '开始识别';
    }
  },

  /* ---- 保存手动产品 ---- */
  saveManualProduct() {
    const product = Render.readManualForm();
    if (!product) return;
    DB.save(product);
    this.closeSheet('page-add');
    Render.renderList(this.currentFilter);
    this.toast(this.editingProductId ? '已更新产品' : '产品已保存', 'ok');
    this.editingProductId = null;
  },

  /* ================================================================
     详情 Sheet
     ================================================================ */
  bindDetailSheet() {
    document.getElementById('close-detail').addEventListener('click', () => this.closeSheet('page-detail'));
    document.getElementById('page-detail').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeSheet('page-detail');
    });
  },

  openDetailSheet(productId) {
    const product = DB.getById(productId);
    if (!product) return;
    Render.renderDetail(product);
    this.openSheet('page-detail');
  },

  /* ================================================================
     编辑、删除
     ================================================================ */
  openEditProduct(productId) {
    const product = DB.getById(productId);
    if (!product) return;
    this.editingProductId = productId;
    this.closeSheet('page-detail');
    setTimeout(() => {
      this.openAddSheet(product);
      // 切换到手动面板
      this.switchMethod('manual');
      Render.buildManualForm(product);
    }, 300);
  },

  confirmDelete(productId) {
    const product = DB.getById(productId);
    if (!product) return;
    Notifications.showInAppAlert('🗑️', '删除产品', `确认删除「${product.name}」？此操作不可撤销`);
    // 临时替换确认按钮行为
    const okBtn = document.getElementById('btn-alert-ok');
    okBtn.textContent = '确认删除';
    okBtn.style.background = 'var(--danger)';
    this._pendingDeleteId = productId;
  },

  /* ================================================================
     通知 Sheet
     ================================================================ */
  bindNotifSheet() {
    document.getElementById('close-notif').addEventListener('click', () => this.closeSheet('page-notif'));
    document.getElementById('page-notif').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeSheet('page-notif');
    });

    document.getElementById('btn-request-notif').addEventListener('click', async () => {
      const result = await Notifications.requestPermission();
      if (result === 'granted') {
        this.toast('通知权限已开启', 'ok');
        Notifications.updatePermCard();
      } else {
        this.toast('未获得通知权限', 'warn');
      }
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      const settings = {
        lowQuotaThreshold: parseInt(document.getElementById('low-quota-threshold').value),
        expireDaysBefore: parseInt(document.getElementById('expire-days-before').value),
        dailyCheckTime: document.getElementById('daily-check-time').value,
      };
      DB.saveSettings(settings);
      Notifications.scheduleCheck();
      this.closeSheet('page-notif');
      this.toast('设置已保存', 'ok');
    });
  },

  /* ================================================================
     告警弹窗按钮
     ================================================================ */
  bindAlertButtons() {
    document.getElementById('btn-alert-later').addEventListener('click', () => {
      document.getElementById('alert-overlay').classList.add('hidden');
      this.resetAlertBtn();
    });
    document.getElementById('btn-alert-ok').addEventListener('click', () => {
      // 若是删除确认
      if (this._pendingDeleteId) {
        DB.delete(this._pendingDeleteId);
        this._pendingDeleteId = null;
        this.closeSheet('page-detail');
        Render.renderList(this.currentFilter);
        this.toast('已删除', 'ok');
      }
      document.getElementById('alert-overlay').classList.add('hidden');
      this.resetAlertBtn();
    });
  },

  resetAlertBtn() {
    const okBtn = document.getElementById('btn-alert-ok');
    okBtn.textContent = '知道了';
    okBtn.style.background = '';
    this._pendingDeleteId = null;
  },

  /* ================================================================
     列表事件委托（刷新额度、查看、编辑）
     ================================================================ */
  bindListDelegation() {
    document.getElementById('product-list').addEventListener('click', async e => {
      const updateBtn = e.target.closest('.btn-update-quota');
      const viewBtn   = e.target.closest('.btn-view-detail');
      const editBtn   = e.target.closest('.btn-edit-product');
      const cardEl    = e.target.closest('.product-card');

      if (updateBtn) {
        e.stopPropagation();
        await this.refreshProductQuota(updateBtn.dataset.id);
        return;
      }
      if (viewBtn) {
        e.stopPropagation();
        this.openDetailSheet(viewBtn.dataset.id);
        return;
      }
      if (editBtn) {
        e.stopPropagation();
        this.openEditProduct(editBtn.dataset.id);
        return;
      }
      // 点击卡片本身打开详情
      if (cardEl) {
        this.openDetailSheet(cardEl.dataset.id);
      }
    });
  },

  /* ----------------------------------------------------------------
     刷新产品额度（如果有 API Key 则自动拉取，否则提示手动）
     ---------------------------------------------------------------- */
  async refreshProductQuota(productId) {
    const product = DB.getById(productId);
    if (!product) return;

    if (product.auto_sync && product.api_key && product.api_provider) {
      // 有 API Key，自动拉取
      const card = document.querySelector(`.product-card[data-id="${productId}"]`);
      if (card) {
        const btn = card.querySelector('.btn-update-quota');
        if (btn) { btn.textContent = '更新中…'; btn.disabled = true; }
      }
      try {
        const result = await APIProviders.fetch(product.api_provider, product.api_key);
        DB.updateQuota(productId, result.quota_used || 0, 'API 自动同步');
        Render.renderList(this.currentFilter);
        this.toast('额度已更新', 'ok');
      } catch (e) {
        this.toast('自动更新失败：' + e.message, 'danger');
        Render.renderList(this.currentFilter);
      }
    } else {
      // 没有 API，提示手动更新
      this.openEditProduct(productId);
      this.toast('请手动更新额度信息', 'warn');
    }
  },

  /* ================================================================
     Sheet 开关工具
     ================================================================ */
  openSheet(pageId) {
    const overlay = document.getElementById(pageId);
    overlay.classList.remove('hidden');
    // 微小延迟让动画生效
    requestAnimationFrame(() => {
      const sheet = overlay.querySelector('.bottom-sheet');
      if (sheet) sheet.style.transform = 'translateY(0)';
    });
    document.body.style.overflow = 'hidden';
  },

  closeSheet(pageId) {
    const overlay = document.getElementById(pageId);
    const sheet = overlay?.querySelector('.bottom-sheet');
    if (sheet) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(() => {
        overlay.classList.add('hidden');
        sheet.style.transform = '';
        document.body.style.overflow = '';
      }, 300);
    } else {
      overlay?.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  /* ================================================================
     Toast 提示
     ================================================================ */
  toast(msg, type = '') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px) scale(0.95)';
      el.style.transition = 'all 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 2800);
  },

  /* ================================================================
     设置加载
     ================================================================ */
  loadSettings() {
    const s = DB.getSettings();
    if (s.lowQuotaThreshold) {
      const sel = document.getElementById('low-quota-threshold');
      if (sel) sel.value = s.lowQuotaThreshold;
    }
    if (s.expireDaysBefore) {
      const sel = document.getElementById('expire-days-before');
      if (sel) sel.value = s.expireDaysBefore;
    }
    if (s.dailyCheckTime) {
      const inp = document.getElementById('daily-check-time');
      if (inp) inp.value = s.dailyCheckTime;
    }
  },

  /* ================================================================
     工具函数
     ================================================================ */
  parseDate(str) {
    if (!str) return '';
    // 尝试格式化各种日期字符串为 YYYY-MM-DD
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return str;
  }
};

/* ================================================================
   DOMContentLoaded
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // 演示数据（仅首次打开且无数据时插入）
  if (DB.getAll().length === 0) {
    const demos = [
      {
        name: 'DeepSeek API',
        emoji: '🔮',
        type: 'ai',
        api_provider: 'deepseek',
        quota_total: 100,
        quota_used: 78,
        quota_unit: '元',
        expire_date: '',
        renew_period: 'monthly',
        renew_price: 0,
        remind_enabled: true,
        auto_sync: false,
        note: '个人开发用'
      },
      {
        name: 'ChatGPT Plus',
        emoji: '🤖',
        type: 'ai',
        api_provider: 'openai',
        quota_total: 0,
        quota_used: 0,
        quota_unit: '元',
        expire_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 5);
          return d.toISOString().slice(0,10);
        })(),
        renew_period: 'monthly',
        renew_price: 143,
        remind_enabled: true,
        auto_sync: false,
        note: '订阅即将到期'
      },
      {
        name: '阿里云 ECS',
        emoji: '☁️',
        type: 'cloud',
        api_provider: 'aliyun',
        quota_total: 500,
        quota_used: 120,
        quota_unit: '元',
        expire_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 45);
          return d.toISOString().slice(0,10);
        })(),
        renew_period: 'yearly',
        renew_price: 500,
        remind_enabled: true,
        auto_sync: false,
        note: '按量计费余额'
      }
    ];
    demos.forEach(d => DB.save(d));
    Render.renderList('all');
  }
});
