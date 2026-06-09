/**
 * auth.js — Authing 微信登录集成
 * 
 * 使用 Authing Guard SDK 实现微信登录
 * 免费版支持 8000 MAU，足够个人/小型项目使用
 * 
 * 配置步骤：
 * 1. 注册 https://www.authing.cn → 创建应用 → 选「单页应用」
 * 2. 在「社会化登录」中配置微信登录（公众号/开放平台）
 * 3. 将 App ID 填入下方 AUTHING_APP_ID
 * 4. 将域名加入 Authing 回调地址
 */

const Auth = {
  // ============ 配置区 ============
  // 请将下面的值替换为你的 Authing 应用配置
  // 获取方式：Authing 控制台 → 应用 → 应用详情
  AUTHING_APP_ID: '你的Authing应用ID',    // ← 替换
  AUTHING_HOST: '你的Authing域名.authing.cn',  // ← 替换，如 myapp.authing.cn
  
  // Authing 实例
  _guard: null,
  _authingClient: null,
  _currentUser: null,

  // ============ 初始化 ============
  async init() {
    // 检查是否已配置 Authing
    if (this.AUTHING_APP_ID === '你的Authing应用ID') {
      console.warn('[Auth] Authing 未配置，使用本地模式');
      this._tryLocalLogin();
      return;
    }

    try {
      // 动态加载 Authing SDK
      await this._loadSDK();
      
      // 初始化 Authing
      const { AuthenticationClient } = window.Authing;
      this._authingClient = new AuthenticationClient({
        appId: this.AUTHING_APP_ID,
        // host: this.AUTHING_HOST,  // 如果使用私有化部署则取消注释
      });

      // 检查已有的登录态
      const userInfo = localStorage.getItem('qt_auth_user');
      if (userInfo) {
        try {
          this._currentUser = JSON.parse(userInfo);
          this.onLoginSuccess(this._currentUser, false);
          return;
        } catch (e) {
          localStorage.removeItem('qt_auth_user');
        }
      }

      // 未登录，显示登录页
      this.showLoginPage();
    } catch (err) {
      console.error('[Auth] 初始化失败，回退到本地模式:', err);
      this._tryLocalLogin();
    }
  },

  // 动态加载 Authing Guard SDK
  _loadSDK() {
    return new Promise((resolve, reject) => {
      if (window.Authing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@authing/guard@5/dist/guard.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Authing SDK 加载失败'));
      document.head.appendChild(script);
    });
  },

  // ============ 登录页 ============
  showLoginPage() {
    const loginPage = document.getElementById('page-login');
    const mainContent = document.querySelector('.main-content');
    const appHeader = document.querySelector('.app-header');
    
    if (loginPage) loginPage.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (appHeader) appHeader.style.display = 'none';
  },

  hideLoginPage() {
    const loginPage = document.getElementById('page-login');
    const mainContent = document.querySelector('.main-content');
    const appHeader = document.querySelector('.app-header');
    
    if (loginPage) loginPage.style.display = 'none';
    if (mainContent) mainContent.style.display = '';
    if (appHeader) appHeader.style.display = '';
  },

  // ============ 微信登录（Authing 托管模式） ============
  async loginWithWechat() {
    if (!this._authingClient) {
      this.showToast('请先配置 Authing', 'error');
      return;
    }

    try {
      // 如果在微信浏览器内，使用公众号授权
      const isWechat = /MicroMessenger/i.test(navigator.userAgent);
      
      if (isWechat && this.AUTHING_HOST !== '你的Authing域名.authing.cn') {
        // 微信内浏览器 → 公众号网页授权
        const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
        const authUrl = `https://${this.AUTHING_HOST}/connections/social/wechatmp?app_id=${this.AUTHING_APP_ID}&redirect_uri=${redirectUri}`;
        window.location.href = authUrl;
      } else {
        // 非微信浏览器 → 扫码登录（微信开放平台）
        this.showQRLogin();
      }
    } catch (err) {
      console.error('[Auth] 微信登录失败:', err);
      this.showToast('登录失败，请重试', 'error');
    }
  },

  // 扫码登录（弹窗方式）
  async showQRLogin() {
    try {
      const { Guard } = window.Authing;
      
      if (!this._guard) {
        this._guard = new Guard({
          appId: this.AUTHING_APP_ID,
          // host: this.AUTHING_HOST,
          mode: 'modal',           // 弹窗模式
          theme: {
            primaryColor: '#E8703A',  // 温暖橙主题
          },
          socialConnections: ['wechat:pc'],  // 微信扫码
          defaultScenes: 'login',
        });
        
        // 监听登录事件
        this._guard.on('login', (user) => {
          this._currentUser = user;
          localStorage.setItem('qt_auth_user', JSON.stringify(user));
          this.onLoginSuccess(user, true);
        });
      }

      this._guard.start('#auth-guard-container');
    } catch (err) {
      console.error('[Auth] 扫码登录启动失败:', err);
      this.showToast('扫码登录启动失败', 'error');
    }
  },

  // ============ 本地模式（无 Authing 配置时的降级方案） ============
  _tryLocalLogin() {
    const localUser = localStorage.getItem('qt_local_user');
    if (localUser) {
      try {
        this._currentUser = JSON.parse(localUser);
        this.onLoginSuccess(this._currentUser, false);
        return;
      } catch (e) {
        localStorage.removeItem('qt_local_user');
      }
    }
    // 本地模式下也显示登录页（简易版）
    this.showLoginPage();
  },

  // 本地模式登录（创建一个虚拟用户）
  localLogin(nickname) {
    const user = {
      id: 'local_' + Date.now(),
      nickname: nickname || '本地用户',
      avatar: '',
      provider: 'local',
      createdAt: new Date().toISOString()
    };
    this._currentUser = user;
    localStorage.setItem('qt_local_user', JSON.stringify(user));
    localStorage.setItem('qt_auth_user', JSON.stringify(user));
    this.onLoginSuccess(user, true);
  },

  // ============ 游客模式 ============
  guestLogin() {
    const user = {
      id: 'guest_' + Date.now(),
      nickname: '游客',
      avatar: '',
      provider: 'guest',
      createdAt: new Date().toISOString()
    };
    this._currentUser = user;
    localStorage.setItem('qt_auth_user', JSON.stringify(user));
    this.onLoginSuccess(user, true);
  },

  // ============ 登录成功回调 ============
  onLoginSuccess(user, isFresh) {
    console.log('[Auth] 登录成功:', user.nickname || user.id);
    this.hideLoginPage();
    this.updateUserUI(user);
    
    // 如果是新登录，可能需要迁移本地数据到用户空间
    if (isFresh) {
      DB.migrateToUser(user.id);
    }
    
    // 通知 app 重新渲染
    if (typeof App !== 'undefined' && App.onAuthChange) {
      App.onAuthChange(user);
    }
  },

  // 更新用户头像和昵称
  updateUserUI(user) {
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    
    if (avatarEl) {
      if (user.avatar) {
        avatarEl.innerHTML = '<img src="' + user.avatar + '" alt="avatar" />';
      } else {
        avatarEl.textContent = (user.nickname || '?').charAt(0).toUpperCase();
      }
    }
    if (nameEl) {
      nameEl.textContent = user.nickname || '用户';
    }
  },

  // ============ 登出 ============
  async logout() {
    const confirmed = await this.showConfirm('确定要退出登录吗？', '退出后数据仍保留在本地');
    if (!confirmed) return;

    // Authing 登出
    if (this._guard) {
      try {
        this._guard.logout();
      } catch (e) {}
    }

    // 清除本地状态
    localStorage.removeItem('qt_auth_user');
    this._currentUser = null;
    
    // 显示登录页
    this.showLoginPage();
    this.showToast('已退出登录');
  },

  // ============ 获取当前用户 ============
  getCurrentUser() {
    return this._currentUser;
  },

  isLoggedIn() {
    return this._currentUser !== null;
  },

  getUserId() {
    return this._currentUser ? this._currentUser.id : 'default';
  },

  // ============ 工具方法 ============
  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  showConfirm(title, message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = 
        '<div class="confirm-dialog">' +
          '<h3>' + title + '</h3>' +
          '<p>' + message + '</p>' +
          '<div class="confirm-actions">' +
            '<button class="btn-cancel" onclick="this.closest(\'.modal-overlay\').remove(); document.dispatchEvent(new CustomEvent(\'confirm-result\', {detail: false}))">取消</button>' +
            '<button class="btn-confirm" onclick="this.closest(\'.modal-overlay\').remove(); document.dispatchEvent(new CustomEvent(\'confirm-result\', {detail: true}))">确定</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.addEventListener('confirm-result', function handler(e) {
        document.removeEventListener('confirm-result', handler);
        resolve(e.detail);
      });
    });
  }
};
