// components/product-card/product-card.js
const CATEGORY_MAP = {
  ai_saas: 'AI / SaaS 订阅',
  cloud: '云服务',
  finance: '金融理财',
  telecom: '通信套餐',
  membership: '会员服务',
  other: '其他'
}

Component({
  properties: {
    product: { type: Object, value: {} },
    id: { type: String, value: '' },
    name: { type: String, value: '' },
    emoji: { type: String, value: '📦' },
    category: { type: String, value: 'other' },
    quotaUsed: { type: Number, value: 0 },
    quotaTotal: { type: Number, value: 0 },
    quotaUnit: { type: String, value: '' },
    expireDate: { type: String, value: '' },
    renewPrice: { type: Number, value: 0 },
    renewCycle: { type: String, value: '' },
    apiProvider: { type: String, value: '' },
    lastSyncTime: { type: String, value: '' }
  },

  data: {
    statusType: 'success',
    statusText: '正常',
    statusClass: 'success',
    remainingPercent: 100,
    daysLeft: 999,
    showQuota: false,
    categoryLabel: ''
  },

  observers: {
    'quotaUsed, quotaTotal, expireDate, category': function(used, total, expire, cat) {
      this.updateStatus()
    }
  },

  lifetimes: {
    attached() {
      this.updateStatus()
    }
  },

  methods: {
    updateStatus() {
      const d = this.data
      const used = d.quotaUsed || this.data.product.quotaUsed || 0
      const total = d.quotaTotal || this.data.product.quotaTotal || 0
      const expire = d.expireDate || this.data.product.expireDate || ''
      const cat = d.category || this.data.product.category || 'other'

      // 类别
      this.setData({ categoryLabel: CATEGORY_MAP[cat] || cat })

      // 额度计算
      const showQuota = total > 0
      let remainingPercent = 100
      if (showQuota) {
        remainingPercent = Math.max(0, Math.round((total - used) / total * 100))
      }

      // 到期天数
      let daysLeft = 999
      if (expire) {
        const now = new Date()
        const exp = new Date(expire)
        daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
      }

      // 综合状态
      let statusType = 'success'
      let statusText = '正常'
      if (remainingPercent <= 10 || daysLeft <= 0) {
        statusType = 'danger'
        statusText = daysLeft <= 0 ? '已过期' : '告急'
      } else if (remainingPercent <= 30 || daysLeft <= 7) {
        statusType = 'warning'
        statusText = daysLeft <= 7 ? '即将到期' : '额度偏低'
      }

      this.setData({
        showQuota,
        remainingPercent,
        daysLeft,
        statusType,
        statusText,
        statusClass: statusType
      })
    },

    onTap() {
      const id = this.data.id || (this.data.product && this.data.product._id)
      if (id) {
        this.triggerEvent('tap', { id })
      }
    }
  }
})
