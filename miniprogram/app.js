// app.js
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
        env: '你的云环境ID'  // ← 替换为你的云开发环境 ID
      })
    }

    this.globalData = {}

    // 检查登录态
    this.checkLogin()

    // 检查提醒
    this.checkReminders()
  },

  onShow() {
    // 每次展示时检查提醒
    this.checkReminders()
  },

  // 检查登录
  checkLogin() {
    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: '{openid}'  // 云开发会自动替换
    }).count().then(res => {
      if (res.total === 0) {
        // 首次使用，创建用户记录
        db.collection('users').add({
          data: {
            createdAt: new Date(),
            settings: {
              quotaThreshold: 20,      // 额度低于 20% 提醒
              expireWarningDays: 7,    // 到期前 7 天提醒
              dailyCheckTime: '09:00', // 每日检查时间
              notificationsEnabled: true
            }
          }
        })
      }
    }).catch(err => {
      console.error('用户检查失败:', err)
    })
  },

  // 检查提醒
  checkReminders() {
    const db = wx.cloud.database()
    db.collection('products').where({
      _openid: '{openid}'
    }).get().then(res => {
      const now = new Date()
      const reminders = []

      res.data.forEach(product => {
        // 检查额度告急
        if (product.quotaUsed !== undefined && product.quotaTotal !== undefined) {
          const remaining = ((product.quotaTotal - product.quotaUsed) / product.quotaTotal * 100)
          if (remaining <= (product.quotaThreshold || 20)) {
            reminders.push({
              type: 'quota_low',
              product: product.name,
              message: `${product.name} 额度仅剩 ${remaining.toFixed(1)}%，请及时续费`
            })
          }
        }

        // 检查到期提醒
        if (product.expireDate) {
          const expireDate = new Date(product.expireDate)
          const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
          if (daysLeft <= (product.expireWarningDays || 7) && daysLeft >= 0) {
            reminders.push({
              type: 'expiring',
              product: product.name,
              message: `${product.name} 将在 ${daysLeft} 天后到期`
            })
          }
        }
      })

      // 如果有提醒，弹窗通知
      if (reminders.length > 0) {
        this.showReminderModal(reminders)
      }
    }).catch(err => {
      console.error('提醒检查失败:', err)
    })
  },

  // 显示提醒弹窗
  showReminderModal(reminders) {
    const title = reminders.length === 1 ? '额度提醒' : `${reminders.length} 条提醒`
    const content = reminders.map(r => r.message).join('\n')

    wx.showModal({
      title,
      content,
      confirmText: '去查看',
      cancelText: '知道了',
      confirmColor: '#E8703A',
      success(res) {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/index/index' })
        }
      }
    })
  },

  globalData: {
    userInfo: null
  }
})
