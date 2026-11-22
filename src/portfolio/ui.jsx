// Reusable building blocks shared by all five category windows:
//   GameWindow (overlay shell) · ImageSlot · ProjectCard · PreviewWindow · StepNav · Txt · usePreview
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HINTS } from './data'

/* ---------- small helpers ---------- */
export const pad = (n) => String(n).padStart(2, '0')
export const ratioNum = (r = '3/4') => { const [w, h] = String(r).split('/').map(Number); return w / (h || 1) }
export const orient = (r) => { const n = ratioNum(r); return n < 0.95 ? 'PORTRAIT' : n > 1.05 ? 'LANDSCAPE' : 'SQUARE' }
const cssRatio = (r) => String(r).replace('/', ' / ')

// per-category UI memory that survives closing the window and re-entering the island:
// last viewed project, scroll position and (for characters) the selected roster slot
const mem = {}
export const getMem = (id) => (mem[id] ||= { last: null, scroll: 0, sel: 0 })

/* text that falls back to a dim, italic hint when the field has not been filled in yet */
export function Txt({ v, hint, as: T = 'span', className = '' }) {
  return v ? <T className={className}>{v}</T> : <T className={(className + ' ph').trim()}>{hint}</T>
}

/* ---------- image slot: shows item.src, or a labelled placeholder that keeps the intended aspect ratio ---------- */
export function ImageSlot({ item, index = 0, className = '', fill = false, eager = false }) {
  const [bad, setBad] = useState(false)
  const r = item.ratio || '3/4'
  const show = item.src && !bad
  const isVideo = /\.(mp4|webm|ogg)(?:$|\?)/i.test(item.src || '')
  return (
    <span className={'slot ' + className + (fill ? ' fill' : '')} style={{ '--r': ratioNum(r), aspectRatio: fill ? undefined : cssRatio(r) }}>
      {show ? (
        isVideo ? (
          <video src={item.src} aria-label={item.alt || item.title || ''} autoPlay muted loop playsInline preload={eager ? 'auto' : 'metadata'}
            style={{ objectFit: item.fit || 'cover' }} onError={() => setBad(true)} />
        ) : (
          <img src={item.src} alt={item.alt || item.title || ''} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
            style={{ objectFit: item.fit || 'cover' }} onError={() => setBad(true)} />
        )
      ) : (
        <span className="slot-ph" role="img" aria-label={`Image placeholder ${pad(index + 1)}, ${r.replace('/', ':')}`}>
          <span className="slot-n">{pad(index + 1)}</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
          <b>IMAGE SLOT</b>
          <small>{r.replace('/', ':')} · {orient(r)}</small>
        </span>
      )}
    </span>
  )
}

/* ---------- project card: a button holding the image slot + whatever caption the category passes as children ---------- */
export function ProjectCard({ item, index, onOpen, className = '', label, active = false, fill = false, style, children }) {
  return (
    <button type="button" className={'pc ' + className + (active ? ' is-last' : '')} style={style} onClick={(e) => onOpen(index, e)} aria-label={`Open ${label || item.title || 'project ' + pad(index + 1)}`}>
      <ImageSlot item={item} index={index} fill={fill} />
      {children}
    </button>
  )
}

/* ---------- previous / next navigation ---------- */
export function StepNav({ onPrev, onNext, index, total, className = '' }) {
  return (
    <div className={'sn ' + className}>
      <button type="button" onClick={onPrev} disabled={total < 2}><span aria-hidden="true">‹</span> PREV</button>
      <span className="sn-c" aria-live="polite">{pad(index + 1)} <i>/</i> {pad(total)}</span>
      <button type="button" onClick={onNext} disabled={total < 2}>NEXT <span aria-hidden="true">›</span></button>
    </div>
  )
}

/* ---------- preview state: which project is open, with wrap-around prev/next and focus restore ---------- */
export function usePreview(id, total) {
  const [idx, setIdx] = useState(null)
  const trigger = useRef(null)
  const open = useCallback((i, e) => { trigger.current = e?.currentTarget ?? document.activeElement; getMem(id).last = i; setIdx(i) }, [id])
  const go = useCallback((d) => setIdx((i) => { if (i == null) return i; const j = (i + d + total) % total; getMem(id).last = j; return j }), [id, total])
  const close = useCallback(() => { setIdx(null); const t = trigger.current; requestAnimationFrame(() => t?.isConnected && t.focus({ preventScroll: true })) }, [])
  return { idx, open, go, close, last: getMem(id).last }
}

/* ---------- large project preview, layered inside the category window ----------
   meta(item) → { title, titleHint?, sub?, subHint?, desc, rows?: [{ k, v, hint }] }   */
export function PreviewWindow({ items, index, onGo, onClose, meta, kicker, showRatio = false, showInfo = true, note = '' }) {
  const [out, setOut] = useState(false)
  const root = useRef(), closeBtn = useRef(), sx = useRef(null)
  const n = items.length, item = items[index], m = meta(item, index), r = item.ratio || '3/4'

  const close = useCallback(() => { if (out) return; setOut(true); setTimeout(onClose, 200) }, [out, onClose])
  useEffect(() => { closeBtn.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    // capture phase: Esc closes only the preview (not the whole window) and arrows step through projects
    const k = (e) => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close() }
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); if (n > 1) onGo(e.code === 'ArrowLeft' ? -1 : 1) }
      else if (e.code === 'Tab' && root.current) { // keep focus inside the preview
        const f = [...root.current.querySelectorAll('button:not([disabled])')]; if (!f.length) return
        const a = document.activeElement
        if (!root.current.contains(a) || (e.shiftKey && a === f[0])) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus() }
        else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [close, onGo, n])

  const down = (e) => { sx.current = [e.clientX, e.clientY] }
  const up = (e) => { // horizontal swipe = prev / next
    const s = sx.current; sx.current = null
    if (!s || n < 2) return
    const dx = e.clientX - s[0], dy = e.clientY - s[1]
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onGo(dx < 0 ? 1 : -1)
  }

  return (
    <div className={'pv' + (out ? ' out' : '')} ref={root} role="dialog" aria-modal="true" aria-label={m.title || `Project ${pad(index + 1)}`}>
      <div className="pv-bar">
        <span className="pv-tag"><i />{kicker} · {pad(index + 1)} / {pad(n)}</span>
        <button ref={closeBtn} type="button" className="pw-close" onClick={close}>CLOSE <span aria-hidden="true">✕</span><kbd>ESC</kbd></button>
      </div>
      <div className="pv-main">
        <div className="pv-media" onPointerDown={down} onPointerUp={up}>
          {n > 1 && <button type="button" className="pv-arrow l" onClick={() => onGo(-1)} aria-label="Previous project">‹</button>}
          <ImageSlot key={index} item={item} index={index} className="pv-slot" eager />
          {n > 1 && <button type="button" className="pv-arrow r" onClick={() => onGo(1)} aria-label="Next project">›</button>}
        </div>
        <aside className="pv-info">
          {showInfo && <>
            {showRatio && <span className="pv-chip">{r.replace('/', ':')} · {orient(r)}</span>}
            <h3><Txt v={m.title} hint={m.titleHint || HINTS.title} /></h3>
            {(m.sub || m.subHint) && <p className="pv-sub"><Txt v={m.sub} hint={m.subHint} /></p>}
            <p className="pv-desc"><Txt v={m.desc} hint={HINTS.description} /></p>
          </>}
          {note && <p className="pv-note">{note}</p>}
          {showInfo && m.rows?.length > 0 && (
            <dl>{m.rows.map((row) => <div key={row.k}><dt>{row.k}</dt><dd><Txt v={row.v} hint={row.hint} /></dd></div>)}</dl>
          )}
        </aside>
      </div>
      <div className="pv-foot"><StepNav onPrev={() => onGo(-1)} onNext={() => onGo(1)} index={index} total={n} /></div>
    </div>
  )
}

/* ---------- the overlay shell every category uses: header, scrollable body, footer, open/close animation ---------- */
export function GameWindow({ id, cat, icon, kicker, title, subtitle, count, hint, closing, onClose, overlay, className = '', onBodyScroll, children }) {
  const body = useRef(), btn = useRef()
  useLayoutEffect(() => { // restore the scroll position from the last visit
    const m = getMem(id), el = body.current
    if (el) { el.scrollTop = m.scroll || 0; onBodyScroll?.(el) }
    return () => { m.scroll = el?.scrollTop || 0 }
  }, [id, onBodyScroll])
  useEffect(() => { btn.current?.focus({ preventScroll: true }) }, [])
  const tid = `pw-title-${id}`
  return (
    <div className={'pw-scrim' + (closing ? ' out' : '')}>
      <section className={`pw pw-${id} ${className}`} style={{ '--c': cat.color }} role="dialog" aria-modal="true" aria-labelledby={tid}>
        <header className="pw-head">
          <div className="pw-ico">{icon}</div>
          <div className="pw-titles">
            <small>{cat.num} · {kicker}</small>
            <h2 id={tid}>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button ref={btn} type="button" className="pw-close" onClick={onClose}>CLOSE <span aria-hidden="true">✕</span><kbd>ESC</kbd></button>
        </header>
        <div className="pw-body" ref={body} onScroll={onBodyScroll}>{children}</div>
        <footer className="pw-foot">
          <button type="button" className="pw-back" onClick={onClose}><span aria-hidden="true">‹</span> BACK TO ISLANDS</button>
          <span className="pw-count">{count}</span>
          <span className="pw-hint">{hint}</span>
        </footer>
        {overlay}
      </section>
    </div>
  )
}
