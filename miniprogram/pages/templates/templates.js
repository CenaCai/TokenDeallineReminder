// pages/templates/templates.js
var api = require('../../utils/api.js')
var util = require('../../utils/util.js')

Page({
  data: {
    templates: [],
    groupedTemplates: [],
    search: '',
  },

  onLoad: function () {
    this.loadTemplates()
  },

  loadTemplates: function () {
    var that = this
    api.getTemplates().then(function (templates) {
      var grouped = {}
      templates.forEach(function (t) {
        if (!grouped[t.category]) grouped[t.category] = []
        grouped[t.category].push(t)
      })
      var groupedTemplates = Object.keys(grouped).map(function (cat) {
        return { category: cat, items: grouped[cat] }
      })
      that.setData({ templates: templates, groupedTemplates: groupedTemplates })
    })
  },

  onSearch: function (e) {
    var keyword = e.detail.value.toLowerCase()
    var filtered = this.data.templates.filter(function (t) {
      return t.name.toLowerCase().indexOf(keyword) !== -1
    })
    var grouped = {}
    filtered.forEach(function (t) {
      if (!grouped[t.category]) grouped[t.category] = []
      grouped[t.category].push(t)
    })
    var groupedTemplates = Object.keys(grouped).map(function (cat) {
      return { category: cat, items: grouped[cat] }
    })
    this.setData({ search: keyword, groupedTemplates: groupedTemplates })
  },

  useTemplate: function (e) {
    var t = e.currentTarget.dataset.template
    wx.navigateTo({
      url: '/pages/add/add?template=' + encodeURIComponent(JSON.stringify(t)),
    })
  },

  formatCurrency: util.formatCurrency,
  cycleLabel: util.cycleLabel,
})
