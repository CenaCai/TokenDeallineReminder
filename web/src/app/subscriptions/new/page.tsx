"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { Category, Tag, Template } from '@/lib/types'
import { DEFAULT_CATEGORIES, CURRENCY_OPTIONS, BILLING_CYCLE_OPTIONS, DEFAULT_TAGS, REMINDER_DAYS_OPTIONS } from '@/lib/types'
import { ArrowLeft, Save, Sparkles, X } from 'lucide-react'

export default function NewSubscriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [provider, setProvider] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [expireDate, setExpireDate] = useState('')
  const [remark, setRemark] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [reminderDays, setReminderDays] = useState<number[]>([7, 3, 1, 0])
  const [reminderChannels, setReminderChannels] = useState<string[]>(['wechat', 'chrome'])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [catsRes, tagsRes, tmplRes] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('tags').select('*').eq('user_id', user.id),
      supabase.from('templates').select('*').order('name'),
    ])

    if (catsRes.data && catsRes.data.length === 0) {
      // Seed default categories
      const catInserts = DEFAULT_CATEGORIES.map((c, i) => ({
        user_id: user.id, name: c.name, icon: c.icon, sort_order: i + 1, is_system: true,
      }))
      const { data: newCats } = await supabase.from('categories').insert(catInserts).select()
      if (newCats) setCategories(newCats as Category[])
    } else {
      setCategories((catsRes.data || []) as Category[])
    }

    if (tagsRes.data && tagsRes.data.length === 0) {
      const tagInserts = DEFAULT_TAGS.map(t => ({
        user_id: user.id, name: t.name, color: t.color,
      }))
      const { data: newTags } = await supabase.from('tags').insert(tagInserts).select()
      if (newTags) setTags(newTags as Tag[])
    } else {
      setTags((tagsRes.data || []) as Tag[])
    }

    setTemplates((tmplRes.data || []) as Template[])
  }

  const applyTemplate = (t: Template) => {
    setName(t.name)
    setAmount(String(t.amount))
    setCurrency(t.currency)
    setBillingCycle(t.billing_cycle)
    setProvider(t.provider || '')
    setShowTemplates(false)
  }

  const toggleReminderDay = (day: number) => {
    setReminderDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const toggleChannel = (ch: string) => {
    setReminderChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Calculate expire date based on cycle if not set
    let expDate = expireDate || null
    if (!expDate && startDate) {
      const start = new Date(startDate)
      if (billingCycle === 'monthly') start.setMonth(start.getMonth() + 1)
      else if (billingCycle === 'quarterly') start.setMonth(start.getMonth() + 3)
      else if (billingCycle === 'yearly') start.setFullYear(start.getFullYear() + 1)
      if (billingCycle !== 'lifetime') expDate = start.toISOString().split('T')[0]
    }

    const { data: sub, error } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      name,
      category_id: categoryId || null,
      provider: provider || null,
      amount: parseFloat(amount) || 0,
      currency,
      billing_cycle: billingCycle,
      start_date: startDate,
      expire_date: expDate,
      remark: remark || null,
      auto_renew: autoRenew,
      status: 'active',
    }).select().single()

    if (error) {
      alert('保存失败: ' + error.message)
      setSaving(false)
      return
    }

    // Insert tags
    if (selectedTagIds.length > 0 && sub) {
      await supabase.from('subscription_tags').insert(
        selectedTagIds.map(tagId => ({ subscription_id: sub.id, tag_id: tagId }))
      )
    }

    // Insert reminder policy
    if (sub && reminderDays.length > 0) {
      await supabase.from('reminder_policies').insert({
        user_id: user.id,
        subscription_id: sub.id,
        days_before: reminderDays,
        channels: reminderChannels,
        repeat_type: 'none',
        is_enabled: true,
      })
    }

    router.push('/subscriptions')
  }

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">添加订阅</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            从模板创建
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">基本信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <Input label="订阅名称" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="如: ChatGPT Plus" required />
              <div className="grid grid-cols-2 gap-4">
                <Select label="分类" id="category" options={categoryOptions} placeholder="选择分类" value={categoryId} onChange={e => setCategoryId(e.target.value)} />
                <Input label="服务商" id="provider" value={provider} onChange={e => setProvider(e.target.value)} placeholder="如: OpenAI" />
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">费用信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input label="金额" id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                <Select label="币种" id="currency" options={CURRENCY_OPTIONS} value={currency} onChange={e => setCurrency(e.target.value)} />
                <Select label="周期" id="cycle" options={BILLING_CYCLE_OPTIONS} value={billingCycle} onChange={e => setBillingCycle(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">时间信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="开始日期" id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                <Input label="到期日期" id="expire" type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} placeholder="留空则自动计算" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">自动续费</span>
              </label>
            </CardContent>
          </Card>

          {/* Tags */}
          {tags.length > 0 && (
            <Card>
              <CardHeader><h2 className="font-semibold text-gray-900">标签</h2></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                        selectedTagIds.includes(tag.id)
                          ? 'border-transparent text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                      style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reminder */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">提醒设置</h2></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">提醒时机（可多选）</p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_DAYS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleReminderDay(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                        reminderDays.includes(opt.value)
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">通知渠道（可多选）</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'wechat', label: '微信订阅消息' },
                    { value: 'chrome', label: 'Chrome 通知' },
                    { value: 'email', label: '邮件通知' },
                  ].map(ch => (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => toggleChannel(ch.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                        reminderChannels.includes(ch.value)
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remark */}
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">备注</h2></CardHeader>
            <CardContent>
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="添加备注..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()}>取消</Button>
            <Button variant="primary" type="submit" disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存订阅'}
            </Button>
          </div>
        </form>
      </div>

      {/* Template Modal */}
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="从模板创建">
        <div className="space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.category} · {t.provider || '无服务商'}</p>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {t.currency === 'CNY' ? '¥' : '$'}{t.amount}/{t.billing_cycle === 'monthly' ? '月' : '年'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </AppLayout>
  )
}
