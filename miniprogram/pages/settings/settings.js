// pages/settings/settings.js
const db = wx.cloud.database()

Page({
  data: {
    settings: {
      notificationsEnabled: true,
      quotaThreshold: 20,
      expireWarningDays: 7,
      dailyCheckTime: '09:00'
    },
    userId: ''
  },

  onLoad() {
    this.loadSettings()
  },

  async loadSettings() {
    try {
      const res = await db.collection('users')
        .where({ _openid: '{openid}' })
        .get()

      if (res.data.length > 0) {
        const user = res.data[0]
        this.setData({
          settings: { ...this.data.settings, ...user.settings },
          userId: user._id
        })
      }
    } catch (err) {
      console.error('加载设置失败:', err)
    }
  },

  async saveSettings() {
    try {
      if (this.data.userId) {
        await db.collection('users').doc(this.data.userId).update({
          data: { settings: this.data.settings }
        })
      }
    } catch (err) {
      console.error('保存设置失败:', err)
    }
  },

  onToggleNotification(e) {
    this.setData({ 'settings.notificationsEnabled': e.detail.value })
    this.saveSettings()
  },

  onQuotaThresholdChange(e) {
    this.setData({ 'settings.quotaThreshold': e.detail.value })
    this.saveSettings()
  },

  onExpireWarningChange(e) {
    this.setData({ 'settings.expireWarningDays': e.detail.value })
    this.saveSettings()
  },

  onDailyCheckTimeChange(e) {
    this.setData({ 'settings.dailyCheckTime': e.detail.value })
    this.saveSettings()
  },

  // 授权订阅消息
  requestSubscribeAll() {
    wx.requestSubscribeMessage({
      tmplIds: ['你的模板ID'],  // ← 替换为你的订阅消息模板 ID
      success: (res) => {
        wx.showToast({ title: '授权成功', icon: 'success' })
      },
      fail: (err) => {
        console.error('授权失败:', err)
        wx.showModal({
          title: '授权提醒',
          content: '需要在微信设置中允许通知权限才能接收提醒',
          showCancel: false
        })
      }
    })
  },

  // 全量同步
  async syncAll() {
    wx.showLoading({ title: '同步中...' })
    try {
      const res = await db.collection('products')
        .where({ _openid: '{openid}' })
        .get()

      const syncedProducts = res.data.filter(p => p.apiProvider && p.apiKey)
      if (syncedProducts.length === 0) {
        wx.hideLoading()
        wx.showToast({ title: '没有可同步的产品', icon: 'none' })
        return
      }

      let successCount = 0
      for (const product of syncedProducts) {
        try {
          const quotaRes = await wx.cloud.callFunction({
            name: 'checkQuota',
            data: {
              provider: product.apiProvider,
              apiKey: product.apiKey
            }
          })

          if (quotaRes.result && quotaRes.result.success) {
            const data = quotaRes.result.data
            await db.collection('products').doc(product._id).update({
              data: {
                quotaUsed: data.used || 0,
                quotaTotal: data.total || data.balance || 0,
                lastSyncTime: new Date().toLocaleString('zh-CN'),
                updatedAt: new Date()
              }
            })
            successCount++
          }
        } catch (err) {
          console.error(`同步 ${product.name} 失败:`, err)
        }
      }

      wx.hideLoading()
      wx.showToast({
        title: `同步完成 ${successCount}/${syncedProducts.length}`,
        icon: 'success'
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '同步失败', icon: 'none' })
    }
  },

  // 导出数据
  async exportData() {
    try {
      const res = await db.collection('products')
        .where({ _openid: '{openid}' })
        .get()

      const data = JSON.stringify(res.data, null, 2)
      const fs = wx.getFileSystemManager()
      const filePath = `${wx.env.USER_DATA_PATH}/quota-export-${Date.now()}.json`

      fs.writeFileSync(filePath, data, 'utf8')

      wx.shareFileMessage({
        filePath,
        fileName: '额度追踪导出.json',
        success: () => wx.showToast({ title: '导出成功', icon: 'success' }),
        fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
      })
    } catch (err) {
      console.error('导出失败:', err)
      wx.showToast({ title: '导出失败', icon: 'none' })
    }
  },

  // 清空数据
  clearAllData() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定清空所有产品数据？此操作不可恢复！',
      confirmColor: '#F44336',
      confirmText: '清空',
      success: async (res) => {
        if (res.confirm) {
          try {
            const queryRes = await db.collection('products')
              .where({ _openid: '{openid}' })
              .get()

            const tasks = queryRes.data.map(p =>
              db.collection('products').doc(p._id).remove()
            )

            await Promise.all(tasks)
            wx.showToast({ title: '已清空', icon: 'success' })
          } catch (err) {
            wx.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  },

  copyFeedback() {
    wx.setClipboardData({
      data: '额度追踪用户反馈',
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  }
})
