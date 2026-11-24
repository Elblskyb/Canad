import { JSDOM } from 'jsdom'
import { buildSync } from 'esbuild'
import { createRequire } from 'node:module'

const dom = new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})

const { window } = dom
global.window = window
global.document = window.document
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true })
global.localStorage = window.localStorage
global.HTMLElement = window.HTMLElement
global.Element = window.Element
global.Node = window.Node
global.CustomEvent = window.CustomEvent
global.Event = window.Event
global.MouseEvent = window.MouseEvent
global.KeyboardEvent = window.KeyboardEvent
global.getComputedStyle = window.getComputedStyle.bind(window)
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
global.cancelAnimationFrame = (id) => clearTimeout(id)
window.requestAnimationFrame = global.requestAnimationFrame
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
global.matchMedia = window.matchMedia
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
global.ResizeObserver = window.ResizeObserver
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
global.IntersectionObserver = window.IntersectionObserver
window.HTMLCanvasElement.prototype.getContext = () =>
  new Proxy(
    {},
    {
      get: (t, p) => {
        if (p === 'measureText') return () => ({ width: 10 })
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} })
        if (p === 'getImageData') return () => ({ data: [] })
        return () => {}
      },
      set: () => true,
    },
  )
window.HTMLCanvasElement.prototype.toBlob = function (cb) {
  cb(new window.Blob(['x'], { type: 'image/png' }))
}
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,x'
window.AudioContext = class {
  createOscillator() { return { connect() {}, start() {}, stop() {}, type: '', frequency: { value: 0 } } }
  createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } } }
  get destination() { return {} }
  get currentTime() { return 0 }
  close() {}
}
global.AudioContext = window.AudioContext
global.fetch = () => Promise.reject(new Error('offline in test'))
window.fetch = global.fetch
window.URL.createObjectURL = () => 'blob:x'
window.URL.revokeObjectURL = () => {}

export function loadApp() {
  buildSync({
    entryPoints: ['scripts/render-entry.jsx'],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    outfile: '/tmp/kand-app.cjs',
    loader: { '.css': 'empty', '.woff': 'empty', '.woff2': 'empty' },
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const require = createRequire(import.meta.url)
  require('/tmp/kand-app.cjs')
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const text = () => document.body.textContent
export const clickByText = (t) => {
  const el = [...document.querySelectorAll('button, a, [role="button"]')].find((e) => e.textContent.trim().includes(t))
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}
export const clickByTitle = (t) => {
  const el = [...document.querySelectorAll('button[title]')].find((e) => e.getAttribute('title') === t)
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}
export const setInput = (el, v) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, v)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
  el.dispatchEvent(new window.Event('change', { bubbles: true }))
}
export const db = () => JSON.parse(localStorage.getItem('kand_db_v1'))
