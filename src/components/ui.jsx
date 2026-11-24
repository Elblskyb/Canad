import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { X, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { cx } from '../lib/helpers'

/* ---------- Toast system ---------- */
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const push = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  const icons = {
    success: <CheckCircle2 size={18} className="text-accent shrink-0" />,
    error: <AlertTriangle size={18} className="text-danger shrink-0" />,
    info: <Info size={18} className="text-bronze shrink-0" />,
  }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center w-[min(92vw,420px)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast pointer-events-auto flex items-center gap-2.5 bg-card border border-line shadow-lift rounded-xl px-4 py-3 text-sm font-medium w-full"
          >
            {icons[t.type] || icons.info}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast within ToastProvider')
  return ctx
}

/* ---------- Primitives ---------- */
export const Card = ({ className, children, ...rest }) => (
  <div className={cx('card p-5', className)} {...rest}>
    {children}
  </div>
)

export const CardTitle = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
          <Icon size={19} strokeWidth={1.8} />
        </div>
      )}
      <div>
        <h3 className="font-bold text-[15px] leading-7">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
)

export const Badge = ({ tone = 'neutral', children }) => {
  const tones = {
    neutral: 'bg-card2 text-muted border-line',
    accent: 'bg-accent/10 text-accent border-accent/25',
    bronze: 'bg-bronze/10 text-bronze border-bronze/30',
    danger: 'bg-danger/10 text-danger border-danger/25',
    teal: 'bg-teal2/10 text-teal2 border-teal2/25',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', tones[tone])}>
      {children}
    </span>
  )
}

export const Spinner = ({ label = 'جارٍ التحميل...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
    <Loader2 size={28} className="animate-spin text-accent" />
    <span className="text-sm">{label}</span>
  </div>
)

export const Empty = ({ icon: Icon, title, hint, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
    {Icon && <Icon size={36} strokeWidth={1.4} className="text-muted opacity-60" />}
    <p className="font-semibold text-sm">{title}</p>
    {hint && <p className="text-xs text-muted max-w-xs">{hint}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
)

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, subtitle, icon: Icon, children, wide = false, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-pop" onClick={onClose} />
      <div
        className={cx(
          'relative w-full bg-card border border-line shadow-lift animate-fadeUp flex flex-col max-h-[92vh]',
          'rounded-t-3xl sm:rounded-2xl',
          wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Icon size={17} strokeWidth={1.8} />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-[15px] truncate">{title}</h2>
              {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label="إغلاق">
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line shrink-0 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Confirm dialog (double confirm for destructive ops) ---------- */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد', danger = true, requireDouble = false }) {
  const [armed, setArmed] = useState(false)
  React.useEffect(() => {
    if (open) setArmed(false)
  }, [open])
  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={AlertTriangle}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              if (requireDouble && !armed) {
                setArmed(true)
                return
              }
              onConfirm()
              onClose()
            }}
          >
            {requireDouble && !armed ? 'اضغط مرة أخرى للتأكيد النهائي' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-7 text-muted">{message}</p>
      {requireDouble && (
        <p className="mt-3 text-xs leading-6 rounded-xl bg-bronze/10 border border-bronze/25 text-bronze px-3 py-2">
          تنبيه: لا يُحذف أي سجل نهائياً — يتم نقله إلى "الأرشيف المؤقت" في الإعدادات ويمكن استعادته من هناك في أي وقت.
        </p>
      )}
    </Modal>
  )
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-card border border-line rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
            active === t.key ? 'bg-accent text-[#04110c]' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Stat card ---------- */
export function Stat({ icon: Icon, label, value, hint, tone = 'accent' }) {
  const tones = {
    accent: 'text-accent bg-accent/10 border-accent/20',
    bronze: 'text-bronze bg-bronze/10 border-bronze/25',
    teal: 'text-teal2 bg-teal2/10 border-teal2/25',
    danger: 'text-danger bg-danger/10 border-danger/25',
    neutral: 'text-muted bg-card2 border-line',
  }
  return (
    <Card className="card-hover">
      <div className="flex items-center gap-3">
        <div className={cx('w-11 h-11 rounded-xl border flex items-center justify-center shrink-0', tones[tone])}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-8 tabular-nums">{value}</div>
          <div className="text-xs text-muted truncate">{label}</div>
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-muted leading-6">{hint}</p>}
    </Card>
  )
}

export const Field = ({ label, children, required }) => (
  <div>
    <label className="label">
      {label} {required && <span className="text-danger">*</span>}
    </label>
    {children}
  </div>
)

export const Table = ({ columns, children }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full border-collapse min-w-[560px]">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} className="th">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
)
