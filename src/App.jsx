import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import World, { LOW, makeStore } from './World'
import Hub from './Hub'
import { LevelComplete, HubHUD, CategoryView } from './Overlays'
import { CATS, DEFAULT_SEL } from './hubData'
import { CHECKPOINTS, PORTAL, PROFILE } from './level'
import { STEP, SCROLL_END, SCROLL_TOTAL, sFromScroll, snapScroll } from './path'

const isTouch = () => matchMedia('(pointer: coarse)').matches || innerWidth < 768

// panel body per checkpoint `kind` (content lives in level.js)
function Body({ cp }) {
  if (cp.kind === 'about') {
    const initials = PROFILE.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    return (
      <>
        <div className="who">
          <div className="avatar"><span>{initials}</span>{PROFILE.photo && <img src={PROFILE.photo} alt={PROFILE.name} onError={(e) => { e.currentTarget.style.display = 'none' }} />}</div>
          <div><div className="name">{PROFILE.name.split(' ').map((part) => <span key={part}>{part}</span>)}</div><div className="role">{PROFILE.role}</div></div>
        </div>
        <p className="body">{cp.text}</p>
      </>
    )
  }
  if (cp.kind === 'roles') return (
    <ul className="roles">
      {cp.roles.map((r) => (
        <li key={r.role + r.company}>
          <div className="r1"><b>{r.role}</b>{r.years && <span>{r.years}</span>}</div>
          <div className="r2">{r.company}</div>
          <p>{r.desc}</p>
        </li>
      ))}
    </ul>
  )
  if (cp.kind === 'groups') return cp.groups.map((g) => (
    <div className="grp" key={g.label}>
      <h3>{g.label}</h3>
      <div className="chips">{g.items.map((t) => <span key={t}>{t}</span>)}</div>
    </div>
  ))
  if (cp.kind === 'links') return (
    <>
      <p className="body">{cp.text}</p>
      <ul className="links">
        {cp.links.map((l) => <li key={l.label}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener"><span>{l.label}</span>{l.text}</a></li>)}
      </ul>
    </>
  )
  return null
}

export default function App() {
  const sc = useRef(), btn = useRef()
  // target = scroll position as a point on the path; limit = furthest scroll allowed right now; release() is installed by the world
  const api = useRef({ target: 0, limit: SCROLL_END[CHECKPOINTS[0].at], release: null })
  const cb = useRef({})
  const snapT = useRef(), touching = useRef(false), moved = useRef(false), openRef = useRef(false)
  const store = useRef(null)
  if (!store.current) store.current = makeStore() // the intro's whole state: kept here so it survives a trip to the Creative Dimension
  const [ready, setReady] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [active, setActive] = useState(null)
  const [last, setLast] = useState(null) // keeps panel content mounted while it slides out
  const [visited, setVisited] = useState(() => new Set())
  const touch = useMemo(isTouch, [])

  // ---- stage machine: intro -> portal (cinematic) -> complete (LEVEL COMPLETE) -> hub (Creative Dimension) <-> intro ----
  const [stage, setStage] = useState('intro')
  const [flash, setFlash] = useState(null) // white flash between worlds: null | 'in' | 'out'
  const [introDone, setIntroDone] = useState(false)
  const stageRef = useRef('intro'); stageRef.current = stage
  const introDoneRef = useRef(false)
  const busy = useRef(false) // one transition at a time

  // ---- hub state ----
  const [sel, setSel] = useState(DEFAULT_SEL)
  const [hover, setHover] = useState(null)
  const [phase, setPhaseState] = useState('select') // select | travel | category | returning
  const [hubReady, setHubReady] = useState(false)
  const phaseRef = useRef('select')
  const setPhase = (p) => { phaseRef.current = p; setPhaseState(p) }
  const V = useRef({ sel, hover }); V.current.sel = sel; V.current.hover = hover
  const hubApi = useRef(null), labels = useRef([]), ui = useRef({ bottom: 0 }), hubCb = useRef({})

  cb.current = {
    onReady: () => setReady(true),
    onActive: (cp) => { setActive(cp); if (cp) setLast(cp) },
    onVisit: (id) => { setVisited((v) => new Set(v).add(id)); if (id === PORTAL.id) setStage('portal') },
    onPortalDone: () => { introDoneRef.current = true; setIntroDone(true); setStage('complete') },
  }
  const open = !!active
  openRef.current = open

  const transition = (mid) => { // white flash in -> swap the world at full white -> flash out
    if (busy.current) return
    busy.current = true; setFlash('in')
    setTimeout(() => { mid(); setFlash('out'); setTimeout(() => { setFlash(null); busy.current = false }, 850) }, 520)
  }
  const enterHub = () => transition(() => { setSel(DEFAULT_SEL); setHover(null); setPhase('select'); setHubReady(false); setStage('hub') })
  const backToIntro = () => {
    if (stageRef.current !== 'hub' || (phaseRef.current !== 'select' && phaseRef.current !== 'category')) return
    transition(() => {
      const S = store.current // the cube reappears on the final tile with the portal still lit
      S.seq = null; S.fx = null; S.trail = null; S.phase = 'move'; S.events.length = 0
      api.current.limit = SCROLL_TOTAL; api.current.target = S.s
      setStage('intro')
    })
  }
  const startTravel = (i) => { if (phaseRef.current !== 'select' || !hubApi.current?.travel(i)) return; setSel(i); setHover(null); setPhase('travel') }
  const backToIslands = () => { if (phaseRef.current === 'category' && hubApi.current?.home()) setPhase('returning') }
  const pick = (i, pt) => { // click / tap on an island or its label: touch selects first, a second tap enters
    if (stageRef.current !== 'hub' || phaseRef.current !== 'select' || busy.current) return
    if ((pt === 'touch' || (!pt && touch)) && V.current.sel !== i) { setSel(i); return }
    startTravel(i)
  }
  hubCb.current = {
    onHover: (i) => { if (phaseRef.current === 'select') { setSel(i); setHover(i) } },
    onHoverEnd: (i) => setHover((h) => (h === i ? null : h)),
    onPick: pick,
    onArrive: () => setPhase('category'),
    onHome: () => setPhase('select'),
    onReady: () => setHubReady(true),
  }
  const step = (d) => { if (phaseRef.current === 'select') { setSel((s) => (s + d + CATS.length) % CATS.length); setHover(null) } }

  const snap = () => {
    if (touching.current || openRef.current || !sc.current) return
    const s = api.current.target
    if (Math.abs(s - Math.round(s)) > 0.001) sc.current.scrollTo({ top: snapScroll(s), behavior: 'smooth' })
  }
  const onScroll = () => {
    const el = sc.current
    if (el.scrollTop > api.current.limit) el.scrollTop = api.current.limit // can't scroll past an uncleared checkpoint
    api.current.target = sFromScroll(el.scrollTop)
    if (!moved.current && api.current.target > 0.3) { moved.current = true; setHinted(true) }
    clearTimeout(snapT.current); snapT.current = setTimeout(snap, 160) // settle on a tile when scrolling stops
  }
  const go = (dir) => sc.current?.scrollBy({ top: dir * STEP, behavior: 'smooth' })

  // close / continue: the world clears the stop (unlocking the next one), then the scroll position is reset to rest on it,
  // so anything scrolled while the panel was open is discarded instead of lurching the cube forward
  const close = () => {
    const stop = api.current.release?.()
    if (!stop || !sc.current) return
    sc.current.scrollTop = SCROLL_END[stop.at]
    api.current.target = sFromScroll(SCROLL_END[stop.at])
  }

  // the scroll surface is mounted only during the intro: first visit starts at the top, a return resumes on the final tile
  useEffect(() => {
    if (stage !== 'intro' || !sc.current) return
    if (introDoneRef.current) { api.current.limit = SCROLL_TOTAL; sc.current.scrollTop = SCROLL_END[PORTAL.at]; api.current.target = sFromScroll(SCROLL_END[PORTAL.at]) }
    else sc.current.scrollTop = 0
  }, [stage])
  useEffect(() => { if (open) btn.current?.focus({ preventScroll: true }) }, [open])
  useEffect(() => {
    const dn = (e) => {
      const st = stageRef.current
      if (st === 'hub') {
        if (busy.current) return
        const ph = phaseRef.current
        if (e.code === 'Escape') { e.preventDefault(); ph === 'category' ? backToIslands() : backToIntro(); return }
        if (ph !== 'select') return
        if (['ArrowLeft', 'ArrowUp', 'KeyA'].includes(e.code)) { e.preventDefault(); step(-1) }
        else if (['ArrowRight', 'ArrowDown', 'KeyD'].includes(e.code)) { e.preventDefault(); step(1) }
        else if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); startTravel(V.current.sel) }
        return
      }
      if (st !== 'intro' || !ready) return
      if (openRef.current) { if (e.code === 'Escape') { e.preventDefault(); close() } return } // movement keys are ignored while a panel is open
      const fwd = ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD', 'PageDown', 'Space'].includes(e.code)
      const back = ['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA', 'PageUp'].includes(e.code)
      if (fwd || back) { e.preventDefault(); go(fwd ? 1 : -1) }
    }
    addEventListener('keydown', dn)
    return () => removeEventListener('keydown', dn)
  }, [ready])

  const total = CHECKPOINTS.length
  const n = CHECKPOINTS.filter((c) => visited.has(c.id)).length
  const done = visited.has(PORTAL.id)
  const inIntro = stage !== 'hub'
  return (
    <div className={'app' + (touch ? ' touch' : '') + (ready ? ' ready' : '')}>
      <Canvas orthographic shadows flat dpr={[1, LOW ? 1.5 : 2]} camera={{ position: [10, 10, 10], zoom: 40, near: 0.1, far: 200 }} gl={{ alpha: true, antialias: !LOW, powerPreference: 'high-performance' }}>
        {inIntro ? <World api={api} cb={cb} panelOpen={open} panelZoom={!!(active && CHECKPOINTS.indexOf(active) >= 0 && CHECKPOINTS.indexOf(active) <= 3)} panelPan={!!(active && CHECKPOINTS.indexOf(active) >= 1 && CHECKPOINTS.indexOf(active) <= 3)} store={store.current} /> : <Hub V={V} cb={hubCb} api={hubApi} labels={labels} ui={ui} />}
      </Canvas>
      <div className="vignette" />

      {stage === 'intro' && (
        <div
          ref={sc} className={'scroller' + (ready && !open ? ' on' : '')} onScroll={onScroll}
          onTouchStart={() => { touching.current = true }}
          onTouchEnd={() => { touching.current = false; clearTimeout(snapT.current); snapT.current = setTimeout(snap, 160) }}
        >
          <div style={{ height: `calc(100% + ${SCROLL_TOTAL}px)` }} />
        </div>
      )}

      {stage === 'intro' && (
        <>
          <div className="hud progress" role="status">
            <div className="count">{n}<span>/{total}</span></div>
            <div className="label">{done ? 'Path complete' : 'Checkpoints'}</div>
            <div className="dots">
              {CHECKPOINTS.map((c) => <i key={c.id} className={visited.has(c.id) ? 'on' : ''} />)}
              <i className={'gate' + (done ? ' on' : '')} />
            </div>
          </div>
          {ready && !hinted && <div className="hud hint">{touch ? 'Swipe up to explore' : 'Scroll to explore'}<b /></div>}
          {introDone && <button className="to-hub" onClick={enterHub}>CREATIVE DIMENSION <span>→</span></button>}
        </>
      )}

      {stage === 'complete' && <LevelComplete onEnter={enterHub} />}

      {stage === 'hub' && (
        <>
          <HubHUD sel={sel} phase={phase} ready={hubReady} labels={labels} ui={ui} touch={touch}
            onPick={pick} onHover={hubCb.current.onHover} onHoverEnd={hubCb.current.onHoverEnd} onStep={step} onEnter={() => startTravel(sel)} onBack={backToIntro} />
          {(phase === 'category' || phase === 'returning') && <CategoryView sel={sel} onBack={backToIslands} closing={phase === 'returning'} />}
        </>
      )}

      <aside className={'panel' + (last?.kind === 'about' ? ' about-panel' : '') + (last && CHECKPOINTS.indexOf(last) >= 1 && CHECKPOINTS.indexOf(last) <= 3 ? ' detail-panel' : '') + (open ? ' open' : '')} role="dialog" aria-labelledby="cp-title" aria-hidden={!open} {...(open ? {} : { inert: '' })}>
        {last && (
          <>
            <button className="x" onClick={close} aria-label="Close">×</button>
            <div className="tag"><i />Checkpoint {String(CHECKPOINTS.indexOf(last) + 1).padStart(2, '0')}</div>
            <h2 id="cp-title">{last.title}</h2>
            <div className="rule" />
            <div className="content"><Body cp={last} /></div>
            <button ref={btn} className="go" onClick={close}>Continue <span>→</span></button>
          </>
        )}
      </aside>

      <div className={'flash' + (flash ? ' ' + flash : '')} aria-hidden="true" />
    </div>
  )
}
