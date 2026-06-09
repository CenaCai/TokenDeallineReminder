"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, daysUntil, statusColor, statusLabel, calcStatus, cn } from '@/lib/utils'
import type { Subscription, Category, Tag } from '@/lib/types'
import { DEFAULT_CATEGORIES, CURRENCY_OPTIONS, BILLING_CYCLE_OPTIONS, DEFAULT_TAGS } from '@/lib/types'
import Link from 'next/link'
import {
  Plus, Search, Filter, MoreHorizontal, Pencil, Trash2,
  Calendar, DollarSign, Tag as TagIcon, X, CreditCard,
} from 'lucide-react'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [subsRes, catsRes, tagsRes] = await Promise.all([
      supabase.from('subscriptions').select('*, category:categories(*)').eq('user_id', user.id).order('expire_date', { ascending: true }),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('tags').select('*').eq('user_id', user.id),
    ])

    if (subsRes.data) {
      const updated = subsRes.data.map(s => ({
        ...s,
        status: s.expire_date ? calcStatus(s.expire_date) : 'active',
      }))
      setSubs(updated as Subscription[])
    }
    if (catsRes.data) setCategories(catsRes.data as Category[])
    if (tagsRes.data) setTags(tagsRes.data as Tag[])
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('subscriptions').delete().eq('id', deleteId)
    setSubs(prev => prev.filter(s => s.id !== deleteId))
    setDeleteId(null)
  }

  // Filtered
  const filtered = subs.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.provider || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && s.category_id !== filterCategory) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))
  const statusOptions = [
    { value: 'active', label: '正常' },
    { value: 'expiring_soon', label: '即将到期' },
    { value: 'expired', label: '已过期' },
    { value: 'cancelled', label: '已取消' },
  ]

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">订阅管理</h1>
            <p className="text-gray-500 text-sm mt-1">共 {filtered.length} 项订阅</p>
          </div>
          <Link href="/subscriptions/new">
            <Button variant="primary" className="gap-2">
              <Plus className="w-4 h-4" />
              添加订阅
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订阅名称或服务商..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <Select
            options={categoryOptions}
            placeholder="全部分类"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-40"
          />
          <Select
            options={statusOptions}
            placeholder="全部状态"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-36"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无订阅</p>
            <p className="text-gray-400 text-sm mt-1">点击上方按钮添加第一个订阅</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(sub => {
              const d = daysUntil(sub.expire_date)
              const catName = (sub as any).category?.name || '其它'
              return (
                <Card key={sub.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
                          <span className="text-lg">{catName === 'AI工具' ? '🤖' : catName === '域名' ? '🌐' : catName === '服务器' ? '☁️' : catName === '开发工具' ? '💻' : '📦'}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 truncate">{sub.name}</h3>
                            <Badge variant={sub.status === 'expired' ? 'danger' : sub.status === 'expiring_soon' ? 'warning' : 'success'}>
                              {statusLabel(sub.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(Number(sub.amount), sub.currency)}/{sub.billing_cycle === 'monthly' ? '月' : sub.billing_cycle === 'yearly' ? '年' : sub.billing_cycle === 'quarterly' ? '季' : '次'}</span>
                            {sub.expire_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {d !== null && d < 0 ? `已过期 ${Math.abs(d)} 天` : d !== null && d === 0 ? '今天到期' : d !== null ? `${d} 天后到期` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/subscriptions/${sub.id}/edit`}>
                          <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(sub.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Delete Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="确认删除">
          <p className="text-gray-600">确定要删除这个订阅吗？此操作不可撤销。</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>确认删除</Button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}
