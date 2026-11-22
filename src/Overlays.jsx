// DOM overlays for the portal ending and the Creative Dimension: LEVEL COMPLETE card, island HUD, category placeholder.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { CATS } from './hubData'
import { Icon } from './icons'
import { CategoryWindow } from './portfolio'

export { Icon }

/* LEVEL COMPLETE: nothing proceeds until the button is pressed */
export function LevelComplete({ onEnter }) {
  const btn = useRef()
  useEffect(() => { const t = setTimeout(() => btn.current?.focus({ preventScroll: true }), 1900); return () => clearTimeout(t) }, [])
  return (
    <div className="lc" role="dialog" aria-modal="true" aria-labelledby="lc-title">
      <div className="lc-card">
        <div className="lc-stars" aria-hidden="true"><i /><i /><i /></div>
        <h1 id="lc-title">LEVEL COMPLETE</h1>
        <div className="lc-sub">PERSONAL PROFILE — 100% COMPLETE</div>
        <div className="lc-bar" aria-hidden="true"><i /></div>
        <p className="lc-quote">“Transmission complete. Entering a new dimension...”</p>
        <button ref={btn} className="lc-btn" onClick={onEnter}>ENTER CREATIVE DIMENSION <span>→</span></button>
      </div>
    </div>
  )
}

/* island selector HUD. Labels are positioned from the 3D scene each frame (see HubRig in Hub.jsx) */
export function HubHUD({ sel, phase, ready, labels, ui, touch, onPick, onHover, onHoverEnd, onStep, onEnter, onBack }) {
  const panel = useRef(), c = CATS[sel], busy = phase !== 'select'
  useLayoutEffect(() => { if (panel.current && phase === 'select') ui.current.bottom = panel.current.offsetHeight + 34 }) // tells the camera how much room the panel takes
  return (
    <div className={'hub' + (ready ? ' ready' : '') + (phase === 'category' ? ' in-cat' : '')}>
      <div className="hbox tl"><Icon name="pad" size={26} /><div><b>CHOLO MARTIN</b><small>CREATIVE DIMENSION</small><div className="dash">{CATS.map((k, i) => <i key={k.id} className={i <= sel ? 'on' : ''} />)}</div></div></div>
      <div className="hbox tc"><b>EXPLORE MY PORTFOLIO</b><small>Choose a destination to discover my work, skills, and creative approach.</small></div>
      <button className="hbox tr" onClick={onBack} disabled={phase === 'travel' || phase === 'returning'}><Icon name="home" size={18} /><span>BACK TO INTRO</span><kbd>ESC</kbd></button>

      {CATS.map((k, i) => (
        <button key={k.id} ref={(el) => (labels.current[i] = el)} className={'isl' + (i === sel ? ' on' : '')} style={{ '--c': k.color }} tabIndex={phase === 'select' ? 0 : -1} aria-label={`${k.num} ${k.label}`}
          onClick={(e) => onPick(i, e.nativeEvent.pointerType)} onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(i)} onPointerLeave={(e) => e.pointerType === 'mouse' && onHoverEnd(i)}>
          <b>{k.num}</b><Icon name={k.icon} size={15} /><span>{k.label}</span>
        </button>
      ))}

      <div ref={panel} className={'hpanel' + (busy ? ' busy' : '')} style={{ '--c': c.color }} aria-live="polite">
        <div className="pn-art"><Icon name={c.icon} size={34} /></div>
        <div className="pn-body">
          <div className="pn-title"><b>{c.num}</b><h2>{c.label}</h2></div>
          <p>{c.blurb}</p>
          <div className="pn-dots" role="tablist" aria-label="Destinations">{CATS.map((k, i) => <button key={k.id} role="tab" aria-selected={i === sel} aria-label={k.label} className={i === sel ? 'on' : ''} onClick={() => onPick(i, 'touch')} disabled={busy} />)}</div>
        </div>
        <div className="pn-go">
          <button className="pn-nav" onClick={() => onStep(-1)} disabled={busy} aria-label="Previous island">‹</button>
          <button className="enter" onClick={onEnter} disabled={busy}>{phase === 'travel' ? 'TRAVELLING…' : 'ENTER DIMENSION'}<span>›</span></button>
          <button className="pn-nav" onClick={() => onStep(1)} disabled={busy} aria-label="Next island">›</button>
        </div>
      </div>

      <div className="hhelp">{touch ? <span>TAP AN ISLAND · TAP AGAIN TO ENTER</span> : <><kbd>←</kbd><kbd>→</kbd><span>NAVIGATE</span><kbd>ENTER</kbd><span>SELECT</span><kbd>ESC</kbd><span>BACK</span></>}</div>
    </div>
  )
}

/* an opened category: a large portfolio window layered over the 3D scene (see src/portfolio). Stays mounted while `closing` so it can animate out. */
export function CategoryView({ sel, onBack, closing }) {
  const c = CATS[sel]
  return <CategoryWindow key={c.id} cat={c} icon={<Icon name={c.icon} size={24} />} closing={closing} onClose={onBack} />
}
