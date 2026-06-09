// pages/detail/detail.js
const db = wx.cloud.database()

const CATEGORY_MAP = {
  ai_saas: 'AI / SaaS 订阅',
  cloud: '云服务',
  finance: '金融理财',
  telecom: '通信套餐',
  membership: '会员服务',
  other: '其他'
}

Page({
  data: {
    productId: '',
    product: null,
    loading: true,
    categoryLabel: '',
    statusType: 'success',
    statusText: '正常',
    remainingPercent: 100,
    daysLeft: 999,
    maskedKey: '',
    syncing: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProduct(options.id)
    }
  },

  async loadProduct(id) {
    try {
      const res = await db.collection('products').doc(id).get()
      const product = res.data
      this.updateComputed(product)
      this.setData({ product, loading: false })
    } catch (err) {
      console.error('加载产品失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  updateComputed(product) {
    const now = new Date()

    // 额度
    let remainingPercent = 100
    if (product.quotaTotal > 0) {
      remainingPercent = Math.max(0, Math.round((product.quotaTotal - product.quotaUsed) / product.quotaTotal * 100))
    }

    // 到期天数
    let daysLeft = 999
    if (product.expireDate) {
      daysLeft = Math.ceil((new Date(product.expireDate) - now) / 86400000)
    }

    // 状态
    let statusType = 'success', statusText = '正常'
    if (remainingPercent <= 10 || daysLeft <= 0) {
      statusType = 'danger'
      statusText = daysLeft <= 0 ? '已过期' : '告急'
    } else if (remainingPercent <= 30 || daysLeft <= 7) {
      statusType = 'warning'
      statusText = daysLeft <= 7 ? '即将到期' : '额度偏低'
    }

    // API Key 遮蔽
    let maskedKey = ''
    if (product.apiKey) {
      const k = product.apiKey
      maskedKey = k.length > 8 ? k.substring(0, 4) + '****' + k.substring(k.length - 4) : '****'
    }

    this.setData({
      categoryLabel: CATEGORY_MAP[product.category] || product.category,
      remainingPercent,
      daysLeft,
      statusType,
      statusText,
      maskedKey
    })
  },

  // 编辑
  editProduct() {
    wx.navigateTo({ url: `/pages/add/add?id=${this.data.productId}` })
  },

  // 请求订阅消息
  requestSubscribe() {
    wx.requestSubscribeMessage({
      tmplIds: ['你的模板ID'],  // ← 替换为你的订阅消息模板 ID
      success: (res) => {
        if (res['你的模板ID'] === 'accept') {
          wx.showToast({ title: '提醒已开启', icon: 'success' })
          // 保存订阅状态
          db.collection('products').doc(this.data.productId).update({
            data: { subscribedReminder: true }
          })
        } else {
          wx.showToast({ title: '需要授权才能提醒', icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('订阅消息授权失败:', err)
        wx.showToast({ title: '授权失败', icon: 'none' })
      }
    })
  },

  // 同步
  async syncNow() {
    const product = this.data.product
    if (!product || !product.apiProvider || !product.apiKey) {
      wx.showToast({ title: '未配置 API', icon: 'none' })
      return
    }

    this.setData({ syncing: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkQuota',
        data: {
          provider: product.apiProvider,
          apiKey: product.apiKey
        }
      })

      if (res.result && res.result.success) {
        const data = res.result.data
        await db.collection('products').doc(this.data.productId).update({
          data: {
            quotaUsed: data.used || 0,
            quotaTotal: data.total || data.balance || 0,
            lastSyncTime: new Date().toLocaleString('zh-CN'),
            updatedAt: new Date()
          }
        })
        // 刷新页面
        this.loadProduct(this.data.productId)
        wx.showToast({ title: '同步成功', icon: 'success' })
      } else {
        wx.showToast({ title: '同步失败', icon: 'none' })
      }
    } catch (err) {
      console.error('同步失败:', err)
      wx.showToast({ title: '同步失败', icon: 'none' })
    } finally {
      this.setData({ syncing: false })
    }
  },

  // 删除
  deleteProduct() {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${this.data.product.name}」吗？此操作不可恢复。`,
      confirmColor: '#F44336',
      confirmText: '删除',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('products').doc(this.data.productId).remove()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 800)
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
