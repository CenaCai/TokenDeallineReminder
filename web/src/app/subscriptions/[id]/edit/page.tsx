"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Category, Tag, Subscription } from '@/lib/types'
import { DEFAULT_CATEGORIES, CURRENCY_OPTIONS, BILLING_CYCLE_OPTIONS, DEFAULT_TAGS, REMINDER_DAYS_OPTIONS } from '@/lib/types'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditSubscriptionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [provider, setProvider] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [expireDate, setExpireDate] = useState('')
  const [remark, setRemark] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [reminderDays, setReminderDays] = useState<number[]>([7, 3, 1, 0])
  const [reminderChannels, setReminderChannels] = useState<string[]>(['wechat', 'chrome'])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [subRes, catsRes, tagsRes] = await Promise.all([
      supabase.from('subscriptions').select('*, subscription_tags(tag_id)').eq('id', id).single(),
      supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('tags').select('*').eq('user_id', user.id),
    ])

    if (subRes.data) {
      const s = subRes.data as any
      setName(s.name)
      setCategoryId(s.category_id || '')
      setProvider(s.provider || '')
      setAmount(String(s.amount))
      setCurrency(s.currency)
      setBillingCycle(s.billing_cycle)
      setStartDate(s.start_date)
      setExpireDate(s.expire_date || '')
      setRemark(s.remark || '')
      setAutoRenew(s.auto_renew)
      if (s.subscription_tags) {
        setSelectedTagIds(s.subscription_tags.map((st: any) => st.tag_id))
      }
    }

    setCategories((catsRes.data || []) as Category[])
    setTags((tagsRes.data || []) as Tag[])
    setLoading(false)
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

    const { error } = await supabase.from('subscriptions').update({
      name,
      category_id: categoryId || null,
      provider: provider || null,
      amount: parseFloat(amount) || 0,
      currency,
      billing_cycle: billingCycle,
      start_date: startDate,
      expire_date: expireDate || null,
      remark: remark || null,
      auto_renew: autoRenew,
    }).eq('id', id)

    if (error) {
      alert('更新失败: ' + error.message)
      setSaving(false)
      return
    }

    // Update tags
    await supabase.from('subscription_tags').delete().eq('subscription_id', id)
    if (selectedTagIds.length > 0) {
      await supabase.from('subscription_tags').insert(
        selectedTagIds.map(tagId => ({ subscription_id: id, tag_id: tagId }))
      )
    }

    router.push('/subscriptions')
  }

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">编辑订阅</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">基本信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <Input label="订阅名称" id="name" value={name} onChange={e => setName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <Select label="分类" id="category" options={categoryOptions} placeholder="选择分类" value={categoryId} onChange={e => setCategoryId(e.target.value)} />
                <Input label="服务商" id="provider" value={provider} onChange={e => setProvider(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">费用信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input label="金额" id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                <Select label="币种" id="currency" options={CURRENCY_OPTIONS} value={currency} onChange={e => setCurrency(e.target.value)} />
                <Select label="周期" id="cycle" options={BILLING_CYCLE_OPTIONS} value={billingCycle} onChange={e => setBillingCycle(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">时间信息</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="开始日期" id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                <Input label="到期日期" id="expire" type="date" value={expireDate} onChange={e => setExpireDate(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">自动续费</span>
              </label>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">提醒设置</h2></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">提醒时机</p>
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
                          : 'border-gray-200 text-gray-600'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">通知渠道</p>
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
                          : 'border-gray-200 text-gray-600'
                      )}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-gray-900">备注</h2></CardHeader>
            <CardContent>
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()}>取消</Button>
            <Button variant="primary" type="submit" disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
