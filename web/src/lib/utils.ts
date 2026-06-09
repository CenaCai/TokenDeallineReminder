import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  }
  return `${symbols[currency] || currency} ${amount.toFixed(2)}`
}

export function calcStatus(expireDate: string | null): 'active' | 'expiring_soon' | 'expired' {
  if (!expireDate) return 'active'
  const now = new Date()
  const exp = new Date(expireDate)
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 7) return 'expiring_soon'
  return 'active'
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-emerald-600 bg-emerald-50'
    case 'expiring_soon': return 'text-amber-600 bg-amber-50'
    case 'expired': return 'text-red-600 bg-red-50'
    case 'cancelled': return 'text-gray-500 bg-gray-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active': return '正常'
    case 'expiring_soon': return '即将到期'
    case 'expired': return '已过期'
    case 'cancelled': return '已取消'
    default: return status
  }
}
