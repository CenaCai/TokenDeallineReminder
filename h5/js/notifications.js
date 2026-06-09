/**
 * notifications.js — 提醒与通知系统
 */

const Notifications = {

  /* ---- 请求权限 ---- */
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  },

  get permission() {
    return ('Notification' in window) ? Notification.permission : 'unsupported';
  },

  /* ---- 发送系统通知 ---- */
  send(title, body, options = {}) {
    if (this.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-72.png',
      tag: options.tag || 'quota-alert',
      renotify: true,
      ...options
    });
    n.onclick = () => { window.focus(); n.close(); };
    return n;
  },

  /* ---- 检查所有产品并发出提醒 ---- */
  checkAndAlert() {
    const alerts = DB.getAlerts();
    if (alerts.length === 0) return;

    // 系统通知
    if (this.permission === 'granted') {
      if (alerts.length === 1) {
        const { product, reasons } = alerts[0];
        this.send(`⚠️ ${product.name}`, reasons.join('，'));
      } else {
        this.send(`⚠️ 有 ${alerts.length} 个产品需要关注`, alerts.map(a => a.product.name).join('、'));
      }
    }

    // 应用内弹窗（只弹第一条最紧急的）
    const urgent = alerts.sort((a, b) => {
      const order = { danger: 0, expired: 1, warn: 2 };
      return (order[a.status] || 3) - (order[b.status] || 3);
    })[0];

    const iconMap = { danger: '🔴', expired: '⏰', warn: '⚠️', ok: '✅' };
    this.showInAppAlert(
      iconMap[urgent.status] || '⚠️',
      urgent.product.name,
      urgent.reasons.join('，') + (urgent.status === 'expired' ? '\n请及时续费！' : '，请注意！'),
    );
  },

  /* ---- 应用内告警弹窗 ---- */
  showInAppAlert(icon, title, msg) {
    document.getElementById('alert-icon').textContent = icon;
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-msg').textContent = msg;
    document.getElementById('alert-overlay').classList.remove('hidden');
  },

  /* ---- 注册 Service Worker ---- */
  async registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      console.log('[SW] Registered:', reg.scope);
      return reg;
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
    }
  },

  /* ---- 调度定时检查（基于页面打开时） ---- */
  scheduleCheck() {
    const settings = DB.getSettings();
    const checkTime = settings.dailyCheckTime || '09:00';
    const [h, m] = checkTime.split(':').map(Number);

    // 计算距离下次检查时间的毫秒数
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const msUntil = next - now;
    console.log(`[Notif] 下次检查：${next.toLocaleString('zh-CN')} (${Math.round(msUntil/60000)}分钟后)`);

    // 设置 setTimeout（页面保持打开时有效）
    clearTimeout(this._checkTimer);
    this._checkTimer = setTimeout(() => {
      this.checkAndAlert();
      this.scheduleCheck(); // 重新调度明天
    }, msUntil);

    // 立即做一次轻量检查（不弹窗，只 Toast）
    this.silentCheck();
  },

  /* ---- 轻量检查（打开 App 时） ---- */
  silentCheck() {
    const alerts = DB.getAlerts();
    if (alerts.length === 0) return;
    const dangerCount = alerts.filter(a => a.status === 'danger' || a.status === 'expired').length;
    if (dangerCount > 0) {
      setTimeout(() => {
        App.toast(`⚠️ ${dangerCount} 个产品需要紧急关注`, 'danger');
      }, 800);
    } else if (alerts.length > 0) {
      setTimeout(() => {
        App.toast(`${alerts.length} 个产品需要关注`, 'warn');
      }, 1200);
    }
  },

  /* ---- 更新通知设置卡片状态 ---- */
  updatePermCard() {
    const card = document.getElementById('notif-perm-card');
    const btn  = document.getElementById('btn-request-notif');
    if (!card) return;

    if (this.permission === 'granted') {
      card.classList.add('granted');
      card.querySelector('.notif-perm-icon').textContent = '✅';
      card.querySelector('.notif-perm-title').textContent = '通知已开启';
      card.querySelector('.notif-perm-desc').textContent = '系统通知权限已授权，将在后台收到提醒';
      btn.textContent = '已授权';
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else if (this.permission === 'denied') {
      card.querySelector('.notif-perm-title').textContent = '通知被拒绝';
      card.querySelector('.notif-perm-desc').textContent = '请前往浏览器设置手动开启通知权限';
      btn.textContent = '打开设置';
      btn.onclick = () => { App.toast('请手动在浏览器设置中开启通知权限', 'warn'); };
    } else if (this.permission === 'unsupported') {
      card.querySelector('.notif-perm-title').textContent = '浏览器不支持推送通知';
      card.querySelector('.notif-perm-desc').textContent = '将使用应用内弹窗提醒替代';
      btn.textContent = '知道了';
      btn.onclick = () => App.closeSheet('page-notif');
    }
  }
};
