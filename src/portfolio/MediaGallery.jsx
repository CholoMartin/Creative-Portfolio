// 03 · THUMBNAILS — media archive: large 16:9 frames in a bento grid (first one featured).
import { useCallback, useState } from 'react'
import { THUMBNAILS as D, HINTS } from './data'
import { GameWindow, ProjectCard, PreviewWindow, Txt, usePreview, pad } from './ui'

const meta = (it) => ({ title: it.title, sub: it.client, subHint: HINTS.client, desc: it.description })

export default function MediaGallery({ cat, icon, closing, onClose }) {
  const pv = usePreview('thumbnails', D.items.length)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const onBodyScroll = useCallback((source) => {
    const el = source?.currentTarget ?? source
    if (!el) return
    const hasMore = el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 4
    setShowScrollHint(hasMore)
  }, [])
  return (
    <GameWindow id="thumbnails" cat={cat} icon={icon} kicker={D.kicker} title={D.title} subtitle={D.subtitle} closing={closing} onClose={onClose} className="pw-gallery"
      onBodyScroll={onBodyScroll}
      count={`${D.items.length} FILES`} hint="SELECT A FRAME TO OPEN IT"
      overlay={<>
        {pv.idx !== null && <PreviewWindow items={D.items} index={pv.idx} onGo={pv.go} onClose={pv.close} meta={meta} kicker="FILE" />}
        {showScrollHint && <div className="pw-scroll-hint" aria-hidden="true"><span>SCROLL FOR MORE</span><b>↓</b></div>}
      </>}>
      <div className="mg">
        {D.items.map((it, i) => (
          <ProjectCard key={i} item={it} index={i} onOpen={pv.open} className="mg-tile" fill={i === 0} active={pv.last === i} label={it.title || `file ${pad(i + 1)}`}>
            <span className="mg-id">IMG_{pad(i + 1)}</span>
            <span className="mg-cap">
              <Txt v={it.title} hint={HINTS.title} className="mg-t" />
              <Txt v={it.client} hint={HINTS.client} className="mg-c" />
            </span>
            <span className="mg-open" aria-hidden="true">⤢</span>
          </ProjectCard>
        ))}
      </div>
    </GameWindow>
  )
}
