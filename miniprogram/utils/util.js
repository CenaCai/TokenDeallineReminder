// utils/util.js
function calcStatus(expireDate) {
  if (!expireDate) return 'active'
  var now = new Date()
  var exp = new Date(expireDate)
  var diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 7) return 'expiring_soon'
  return 'active'
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  var now = new Date()
  now.setHours(0, 0, 0, 0)
  var target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCurrency(amount, currency) {
  var symbols = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥' }
  return (symbols[currency] || currency) + ' ' + parseFloat(amount).toFixed(2)
}

function statusLabel(status) {
  var map = { active: '正常', expiring_soon: '即将到期', expired: '已过期', cancelled: '已取消' }
  return map[status] || status
}

function statusClass(status) {
  var map = { active: 'status-active', expiring_soon: 'status-expiring', expired: 'status-expired', cancelled: 'status-cancelled' }
  return map[status] || 'status-active'
}

function cycleLabel(cycle) {
  var map = { monthly: '月', quarterly: '季', yearly: '年', lifetime: '终身', custom: '自定义' }
  return map[cycle] || cycle
}

module.exports = {
  calcStatus: calcStatus,
  daysUntil: daysUntil,
  formatCurrency: formatCurrency,
  statusLabel: statusLabel,
  statusClass: statusClass,
  cycleLabel: cycleLabel,
}
