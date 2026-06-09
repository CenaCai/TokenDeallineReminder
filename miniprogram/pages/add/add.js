// pages/add/add.js
const db = wx.cloud.database()

// API 提供商配置
const API_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    keyHint: 'sk-xxx，在 platform.deepseek.com 获取',
    endpoint: 'https://api.deepseek.com/user/balance',
    parseBalance: (data) => ({
      balance: (data.balance_infos && data.balance_infos[0] && data.balance_infos[0].available_balance) || 0,
      total: (data.balance_infos && data.balance_infos[0] && data.balance_infos[0].total_balance) || 0,
      unit: '元'
    })
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    keyHint: '在 api.minimax.chat 获取 API Key',
    endpoint: '',
    parseBalance: () => null
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyHint: 'sk-xxx，在 platform.openai.com 获取',
    endpoint: '',
    parseBalance: () => null
  },
  {
    id: 'other',
    name: '其他（自定义）',
    keyHint: '输入 API Key',
    endpoint: '',
    parseBalance: () => null
  }
]

const CATEGORIES = [
  { value: 'ai_saas', label: 'AI / SaaS 订阅' },
  { value: 'cloud', label: '云服务' },
  { value: 'finance', label: '金融理财' },
  { value: 'telecom', label: '通信套餐' },
  { value: 'membership', label: '会员服务' },
  { value: 'other', label: '其他' }
]

const RENEW_CYCLES = ['月', '季', '半年', '年', '一次性']

Page({
  data: {
    mode: 'api',           // api | ocr | manual
    editId: '',            // 编辑模式下的产品 ID

    // API 模式
    apiProviders: API_PROVIDERS,
    selectedProvider: null,
    selectedProviderIndex: -1,
    apiKey: '',
    apiProductName: '',
    apiLoading: false,
    apiResult: null,

    // OCR 模式
    imageUrl: '',
    ocrLoading: false,
    ocrResult: null,

    // 表单
    form: {
      emoji: '📦',
      name: '',
      category: 'other',
      quotaUsed: '',
      quotaTotal: '',
      quotaUnit: '',
      expireDate: '',
      renewPrice: '',
      renewCycle: '',
      notes: '',
      apiProvider: '',
      apiKey: '',
      lastSyncTime: ''
    },
    categories: CATEGORIES,
    categoryLabel: '',
    renewCycles: RENEW_CYCLES,
    emojiPickerVisible: false,
    submitting: false
  },

  onLoad(options) {
    // 编辑模式
    if (options.id) {
      this.setData({ editId: options.id })
      this.loadProduct(options.id)
    }
    // 从外部指定模式
    if (options.mode) {
      this.setData({ mode: options.mode })
    }
  },

  // 加载产品数据（编辑模式）
  async loadProduct(id) {
    try {
      const res = await db.collection('products').doc(id).get()
      const p = res.data
      const cat = CATEGORIES.find(c => c.value === p.category)
      this.setData({
        form: {
          emoji: p.emoji || '📦',
          name: p.name || '',
          category: p.category || 'other',
          quotaUsed: p.quotaUsed !== undefined ? String(p.quotaUsed) : '',
          quotaTotal: p.quotaTotal !== undefined ? String(p.quotaTotal) : '',
          quotaUnit: p.quotaUnit || '',
          expireDate: p.expireDate || '',
          renewPrice: p.renewPrice !== undefined ? String(p.renewPrice) : '',
          renewCycle: p.renewCycle || '',
          notes: p.notes || '',
          apiProvider: p.apiProvider || '',
          apiKey: p.apiKey || '',
          lastSyncTime: p.lastSyncTime || ''
        },
        categoryLabel: cat ? cat.label : '',
        mode: p.apiProvider ? 'api' : 'manual'
      })
    } catch (err) {
      console.error('加载产品失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 模式切换
  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  // ========== API 模式 ==========

  onProviderChange(e) {
    const idx = e.detail.value
    this.setData({
      selectedProviderIndex: idx,
      selectedProvider: API_PROVIDERS[idx],
      apiResult: null
    })
  },

  onApiKeyInput(e) {
    this.setData({ apiKey: e.detail.value })
  },

  onApiProductNameInput(e) {
    this.setData({ apiProductName: e.detail.value })
  },

  // 查询 API 额度 — 通过云函数代理请求
  async fetchApiQuota() {
    if (!this.data.apiKey || !this.data.selectedProvider) return

    this.setData({ apiLoading: true, apiResult: null })

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkQuota',
        data: {
          provider: this.data.selectedProvider.id,
          apiKey: this.data.apiKey
        }
      })

      const result = res.result

      if (result.success) {
        const apiResult = result.data
        this.setData({ apiResult })

        // 自动填入表单
        this.setData({
          'form.name': this.data.apiProductName || this.data.selectedProvider.name,
          'form.quotaUsed': String(apiResult.used || 0),
          'form.quotaTotal': String(apiResult.total || apiResult.balance),
          'form.quotaUnit': apiResult.unit || '元',
          'form.apiProvider': this.data.selectedProvider.id,
          'form.apiKey': this.data.apiKey,
          'form.emoji': this.data.selectedProvider.id === 'deepseek' ? '🧠' :
                        this.data.selectedProvider.id === 'minimax' ? '💬' :
                        this.data.selectedProvider.id === 'openai' ? '🤖' : '📦'
        })
      } else {
        wx.showToast({ title: result.message || '查询失败', icon: 'none' })
      }
    } catch (err) {
      console.error('API 查询失败:', err)
      wx.showToast({ title: '查询失败，请检查 Key', icon: 'none' })
    } finally {
      this.setData({ apiLoading: false })
    }
  },

  // ========== OCR 模式 ==========

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ imageUrl: tempFilePath, ocrResult: null })
      }
    })
  },

  previewImage() {
    if (this.data.imageUrl) {
      wx.previewImage({
        urls: [this.data.imageUrl]
      })
    }
  },

  // 使用微信 OCR 插件识别
  async startOcr() {
    if (!this.data.imageUrl) return

    this.setData({ ocrLoading: true })

    try {
      // 方法1：使用微信 OCR 插件
      const ocrPlugin = requirePlugin('ocr-plugin')

      ocrPlugin.ocr({
        type: 'general',
        img: this.data.imageUrl,
        success: (res) => {
          this.processOcrResult(res.result)
        },
        fail: (err) => {
          console.error('OCR 插件失败，回退到云函数:', err)
          // 方法2：回退到云函数 OCR
          this.cloudOcr()
        },
        complete: () => {
          this.setData({ ocrLoading: false })
        }
      })
    } catch (err) {
      console.error('OCR 失败:', err)
      // 回退
      this.cloudOcr()
    }
  },

  // 云函数 OCR（回退方案）
  async cloudOcr() {
    try {
      // 上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `ocr/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.jpg`,
        filePath: this.data.imageUrl
      })

      // 调用云函数做 OCR（服务端调用微信 OCR API）
      const res = await wx.cloud.callFunction({
        name: 'checkQuota',
        data: {
          action: 'ocr',
          fileID: uploadRes.fileID
        }
      })

      if (res.result && res.result.success) {
        this.processOcrResult(res.result.data)
      } else {
        wx.showToast({ title: '识别失败', icon: 'none' })
      }
    } catch (err) {
      console.error('云函数 OCR 失败:', err)
      wx.showToast({ title: '识别失败', icon: 'none' })
    } finally {
      this.setData({ ocrLoading: false })
    }
  },

  // 解析 OCR 结果
  processOcrResult(ocrText) {
    // 简单的文本解析逻辑
    const result = {
      rawText: ocrText,
      productName: '',
      balance: '',
      expireDate: ''
    }

    if (typeof ocrText === 'string') {
      // 尝试提取金额
      const amountMatch = ocrText.match(/(?:余额|可用|剩余|额度)[：:\s]*[¥￥]?\s*(\d+\.?\d*)/)
      if (amountMatch) {
        result.balance = amountMatch[1]
      }

      // 尝试提取日期
      const dateMatch = ocrText.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
      if (dateMatch) {
        result.expireDate = dateMatch[1].replace(/年|月/g, '-').replace(/日/g, '')
      }

      // 尝试提取产品名
      const namePatterns = [
        /(?:产品|服务|套餐)[：:\s]*(.+?)[\n,，]/,
        /^(.{2,20})$/m
      ]
      for (const pattern of namePatterns) {
        const match = ocrText.match(pattern)
        if (match) {
          result.productName = match[1].trim()
          break
        }
      }
    }

    this.setData({
      ocrResult: result,
      'form.name': result.productName || this.data.form.name,
      'form.quotaTotal': result.balance || this.data.form.quotaTotal,
      'form.expireDate': result.expireDate || this.data.form.expireDate
    })
  },

  // ========== 表单操作 ==========

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onCategoryChange(e) {
    const idx = e.detail.value
    const cat = CATEGORIES[idx]
    this.setData({
      'form.category': cat.value,
      categoryLabel: cat.label
    })
  },

  onDateChange(e) {
    this.setData({ 'form.expireDate': e.detail.value })
  },

  onRenewCycleChange(e) {
    this.setData({ 'form.renewCycle': RENEW_CYCLES[e.detail.value] })
  },

  // Emoji Picker
  showEmojiPicker() {
    this.setData({ emojiPickerVisible: true })
  },

  hideEmojiPicker() {
    this.setData({ emojiPickerVisible: false })
  },

  onEmojiSelect(e) {
    this.setData({
      'form.emoji': e.detail.emoji,
      emojiPickerVisible: false
    })
  },

  // 提交表单
  async submitForm() {
    const form = this.data.form

    if (!form.name) {
      wx.showToast({ title: '请输入产品名称', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const productData = {
      name: form.name,
      emoji: form.emoji || '📦',
      category: form.category || 'other',
      quotaUsed: Number(form.quotaUsed) || 0,
      quotaTotal: Number(form.quotaTotal) || 0,
      quotaUnit: form.quotaUnit || '',
      expireDate: form.expireDate || '',
      renewPrice: Number(form.renewPrice) || 0,
      renewCycle: form.renewCycle || '',
      notes: form.notes || '',
      apiProvider: form.apiProvider || '',
      apiKey: form.apiKey || '',
      lastSyncTime: form.apiProvider ? new Date().toLocaleString('zh-CN') : '',
      updatedAt: new Date()
    }

    try {
      if (this.data.editId) {
        // 编辑
        await db.collection('products').doc(this.data.editId).update({ data: productData })
        wx.showToast({ title: '已保存', icon: 'success' })
      } else {
        // 新增
        await db.collection('products').add({
          data: {
            ...productData,
            createdAt: new Date()
          }
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }

      setTimeout(() => wx.navigateBack(), 800)
    } catch (err) {
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})

// 微信 OCR 插件引用
function requirePlugin(name) {
  return wx.requirePlugin(name)
}
