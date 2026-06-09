// cloudfunctions/checkReminders/index.js
// 定时扫描订阅到期，发送提醒
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const axios = require('axios')

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

exports.main = async (event, context) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  try {
    // 1. 查询所有需要提醒的订阅
    const { data: policies } = await axios.get(
      `${SUPABASE_URL}/rest/v1/reminder_policies?is_enabled=eq.true&select=*,subscription:subscriptions(*)`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (!policies || policies.length === 0) {
      return { message: 'No active policies', count: 0 }
    }

    let sentCount = 0

    for (const policy of policies) {
      const sub = policy.subscription
      if (!sub || !sub.expire_date) continue

      // 计算天数差
      const expireDate = new Date(sub.expire_date)
      const diffMs = expireDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      // 检查是否命中提醒天数
      const shouldRemind = policy.days_before.some(days => {
        if (days === 0) return diffDays === 0  // 当天
        if (days === -1) return diffDays < 0   // 过期后
        return diffDays === days              // 提前N天
      })

      if (!shouldRemind) continue

      // 检查今天是否已发送过
      const { data: todayLogs } = await axios.get(
        `${SUPABASE_URL}/rest/v1/reminder_logs?subscription_id=eq.${sub.id}&sent_at=gte.${today}&select=id`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )

      if (todayLogs && todayLogs.length > 0) continue // 今天已发送过

      // 2. 发送各渠道通知
      for (const channel of policy.channels) {
        try {
          if (channel === 'wechat') {
            // 微信订阅消息 - 需要用户已订阅消息模板
            await cloud.openapi.subscribeMessage.send({
              touser: sub.user_id, // 需要映射为 openid
              templateId: process.env.WECHAT_TEMPLATE_ID || '',
              page: 'pages/detail/detail?id=' + sub.id,
              data: {
                thing1: { value: sub.name },
                thing2: { value: sub.expire_date },
                thing3: { value: diffDays > 0 ? diffDays + '天后到期' : '已过期' + Math.abs(diffDays) + '天' },
              },
            })
          }

          // 记录发送日志
          await axios.post(
            `${SUPABASE_URL}/rest/v1/reminder_logs`,
            {
              user_id: sub.user_id,
              subscription_id: sub.id,
              channel: channel,
              status: 'sent',
            },
            {
              headers: {
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
            }
          )

          sentCount++
        } catch (err) {
          console.error(`Failed to send ${channel} reminder for ${sub.name}:`, err.message)
          // 记录失败日志
          await axios.post(
            `${SUPABASE_URL}/rest/v1/reminder_logs`,
            {
              user_id: sub.user_id,
              subscription_id: sub.id,
              channel: channel,
              status: 'failed',
              error_message: err.message,
            },
            {
              headers: {
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
            }
          )
        }
      }
    }

    return { message: 'Scan completed', sent: sentCount }
  } catch (err) {
    console.error('Scan error:', err)
    return { error: err.message }
  }
}
