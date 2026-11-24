import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Kand ErrorBoundary:', error, info?.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-app text-ink flex items-center justify-center p-6" dir="rtl">
          <div className="card max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/25 text-danger flex items-center justify-center">
              <AlertTriangle size={26} />
            </div>
            <h1 className="font-amiri text-2xl font-bold">حدث خطأ غير متوقع في الواجهة</h1>
            <p className="text-sm text-muted leading-7">
              تم التقاط الخطأ ومنع تجمّد التطبيق. بياناتك محفوظة محلياً ومتزامنة مع السحابة.
            </p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              <RotateCcw size={16} /> إعادة تحميل الواجهة
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
