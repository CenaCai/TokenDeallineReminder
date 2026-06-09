// pages/edit/edit.js
var api = require('../../utils/api.js')

Page({
  data: {
    id: '',
    name: '',
    provider: '',
    expireDate: '',
    remark: '',
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadProduct(options.id)
    }
  },

  loadProduct(id) {
    const db = wx.cloud.database()
    db.collection('products').doc(id).get().then(res => {
      const product = res.data
      this.setData({
        name: product.name || '',
        provider: product.provider || '',
        expireDate: product.expireDate || '',
        remark: product.remark || '',
      })
    }).catch(err => {
      console.error('加载失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onProviderInput(e) { this.setData({ provider: e.detail.value }) },
  onExpireDateChange(e) { this.setData({ expireDate: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },

  onSave() {
    if (!this.data.name) {
      wx.showToast({ title: '请输入订阅名称', icon: 'none' })
      return
    }
    const db = wx.cloud.database()
    db.collection('products').doc(this.data.id).update({
      data: {
        name: this.data.name,
        provider: this.data.provider,
        expireDate: this.data.expireDate,
        remark: this.data.remark,
        updatedAt: new Date(),
      }
    }).then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认删除？',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('products').doc(this.data.id).remove().then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1500)
          }).catch(err => {
            console.error('删除失败:', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },
})
