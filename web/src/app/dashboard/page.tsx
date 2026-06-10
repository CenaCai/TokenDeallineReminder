"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, daysUntil, statusLabel, calcStatus } from '@/lib/utils'
import type { Subscription, DashboardStats } from '@/lib/types'
import Link from 'next/link'
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Plus,
  Calendar,
} from 'lucide-react'
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#64748b']

export default function DashboardPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadSubscriptions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('expire_date', { ascending: true })

    if (data) {
      // Re-calculate status based on current date
      const updated = data.map(s => ({
        ...s,
        status: s.expire_date ? calcStatus(s.expire_date) : 'active',
      }))
      setSubs(updated as Subscription[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // Stats
  const stats: DashboardStats = {
    total_subscriptions: subs.length,
    monthly_expense: subs
      .filter(s => s.billing_cycle === 'monthly' && s.currency === 'CNY')
      .reduce((sum, s) => sum + Number(s.amount), 0),
    yearly_expense: subs
      .filter(s => s.billing_cycle === 'yearly' && s.currency === 'CNY')
      .reduce((sum, s) => sum + Number(s.amount), 0),
    expiring_soon_count: subs.filter(s => s.status === 'expiring_soon').length,
    expired_count: subs.filter(s => s.status === 'expired').length,
  }

  // Timeline: group by days until expire
  const timelineGroups = {
    today: subs.filter(s => { const d = daysUntil(s.expire_date); return d !== null && d <= 0 && d >= -1; }),
    week: subs.filter(s => { const d = daysUntil(s.expire_date); return d !== null && d > 0 && d <= 7; }),
    month: subs.filter(s => { const d = daysUntil(s.expire_date); return d !== null && d > 7 && d <= 30; }),
    quarter: subs.filter(s => { const d = daysUntil(s.expire_date); return d !== null && d > 30 && d <= 90; }),
  }

  // Expense by category
  const categoryMap = new Map<string, number>()
  subs.forEach(s => {
    const cat = s.category?.name || '其它'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(s.amount))
  })
  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))

  // Expense by currency
  const currencyMap = new Map<string, number>()
  subs.forEach(s => {
    currencyMap.set(s.currency, (currencyMap.get(s.currency) || 0) + Number(s.amount))
  })
  const currencyData = Array.from(currencyMap.entries()).map(([name, value]) => ({ name, value }))

  const statCards = [
    { label: '总订阅数', value: stats.total_subscriptions, icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
    { label: '月支出', value: formatCurrency(stats.monthly_expense, 'CNY'), icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
    { label: '即将到期', value: stats.expiring_soon_count, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
    { label: '已过期', value: stats.expired_count, icon: XCircle, color: 'text-red-600 bg-red-50' },
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
            <h1 className="text-2xl font-bold text-gray-900">概览</h1>
            <p className="text-gray-500 text-sm mt-1">管理你的所有订阅与续费</p>
          </div>
          <Link href="/subscriptions/new">
            <Button variant="primary" className="gap-2">
              <Plus className="w-4 h-4" />
              添加订阅
            </Button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Timeline + Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <Card className="lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                到期时间轴
              </h2>
            </div>
            <CardContent className="p-0">
              {(['today', 'week', 'month', 'quarter'] as const).map((group) => {
                const items = timelineGroups[group]
                const labels = { today: '今天/已过期', week: '7天内', month: '30天内', quarter: '90天内' }
                return (
                  <div key={group} className="border-b border-gray-50 last:border-0">
                    <div className="px-5 py-2 bg-gray-50/50">
                      <span className="text-xs font-medium text-gray-500">{labels[group]} ({items.length})</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="px-5 py-3 text-sm text-gray-400">暂无</div>
                    ) : (
                      items.map((sub) => (
                        <Link key={sub.id} href={`/subscriptions/${sub.id}/edit`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                              <p className="text-xs text-gray-500">{sub.provider || ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{formatCurrency(Number(sub.amount), sub.currency)}</span>
                            <Badge variant={sub.status === 'expired' ? 'danger' : sub.status === 'expiring_soon' ? 'warning' : 'success'}>
                              {statusLabel(sub.status)}
                            </Badge>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="space-y-6">
            {/* By Category */}
            <Card>
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">支出分布</h2>
              </div>
              <CardContent className="p-4">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Currency */}
            <Card>
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">币种分布</h2>
              </div>
              <CardContent className="p-4">
                {currencyData.length > 0 ? (
                  <div className="space-y-3">
                    {currencyData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">暂无数据</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
