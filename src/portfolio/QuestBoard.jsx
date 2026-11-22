// 04 · GRAPHIC LAYOUTS — quest board: mixed-size mission cards pinned at slight angles (masonry columns).
import { useCallback, useState } from 'react'
import { LAYOUTS as D, HINTS } from './data'
import { GameWindow, ProjectCard, PreviewWindow, Txt, usePreview, pad } from './ui'

const TILT = [-1.4, 1, -0.6, 1.5, -1, 0.7]
const meta = (it) => ({ title: it.title, sub: it.client, subHint: HINTS.client, desc: it.description })

export default function QuestBoard({ cat, icon, closing, onClose }) {
  const pv = usePreview('layouts', D.items.length)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const onBodyScroll = useCallback((source) => {
    const el = source?.currentTarget ?? source
    if (!el) return
    const hasMore = el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 4
    setShowScrollHint(hasMore)
  }, [])
  return (
    <GameWindow id="layouts" cat={cat} icon={icon} kicker={D.kicker} title={D.title} subtitle={D.subtitle} closing={closing} onClose={onClose} className="pw-quest-board"
      onBodyScroll={onBodyScroll}
      count={`${D.items.length} QUESTS`} hint="SELECT A QUEST TO OPEN IT"
      overlay={<>
        {pv.idx !== null && <PreviewWindow items={D.items} index={pv.idx} onGo={pv.go} onClose={pv.close} meta={meta} kicker="QUEST" />}
        {showScrollHint && <div className="pw-scroll-hint" aria-hidden="true"><span>SCROLL FOR MORE</span><b>↓</b></div>}
      </>}>
      <div className="qb">
        {D.items.map((it, i) => (
          <div className="qc-wrap" key={i}>
            <ProjectCard item={it} index={i} onOpen={pv.open} className="qc" style={{ '--tilt': `${TILT[i % TILT.length]}deg` }} active={pv.last === i} label={it.title || `quest ${pad(i + 1)}`}>
              <span className="qc-pin" aria-hidden="true" />
              <span className="qc-tag"><b>QUEST {pad(i + 1)}</b><em>{it.tag}</em></span>
              <Txt v={it.title} hint={HINTS.title} className="qc-title" />
              <Txt v={it.description} hint={HINTS.description} className="qc-desc" />
              <span className="qc-cta">VIEW MISSION <b>›</b></span>
            </ProjectCard>
          </div>
        ))}
      </div>
    </GameWindow>
  )
}
