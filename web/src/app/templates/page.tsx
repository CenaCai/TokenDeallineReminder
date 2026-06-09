"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Template } from '@/lib/types'
import { CURRENCY_OPTIONS, BILLING_CYCLE_OPTIONS } from '@/lib/types'
import { Bookmark, Search, Plus } from 'lucide-react'
import Link from 'next/link'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const { data } = await supabase.from('templates').select('*').order('category', { ascending: true })
    if (data) setTemplates(data as Template[])
  }

  const categories = [...new Set(templates.map(t => t.category))]

  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && t.category !== filterCat) return false
    return true
  })

  // Group by category
  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, Template[]>)

  const handleUseTemplate = (t: Template) => {
    // Store in sessionStorage for the new subscription form to pick up
    sessionStorage.setItem('selected_template', JSON.stringify(t))
    window.location.href = '/subscriptions/new'
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">模板中心</h1>
            <p className="text-gray-500 text-sm mt-1">快速创建常用订阅</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">全部分类</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Template Groups */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-sm font-medium text-gray-500 mb-3">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(t => (
                <Card key={t.id} onClick={() => handleUseTemplate(t)} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{t.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t.provider || category}</p>
                      </div>
                      <Bookmark className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(Number(t.amount), t.currency)}
                      </span>
                      <span className="text-xs text-gray-400">
                        /{t.billing_cycle === 'monthly' ? '月' : t.billing_cycle === 'yearly' ? '年' : '季'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无模板</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
