// 02 · DIGITAL ILLUSTRATIONS — art codex: framed artworks with entry plaques (portrait · landscape · portrait).
import { ILLUSTRATION as D, HINTS } from './data'
import { GameWindow, ProjectCard, PreviewWindow, Txt, usePreview, pad, ratioNum } from './ui'

const meta = (it) => ({ title: it.title, sub: it.client, desc: it.description })

export default function ArtCodex({ cat, icon, closing, onClose }) {
  const pv = usePreview('illustration', D.items.length)
  return (
    <GameWindow id="illustration" cat={cat} icon={icon} kicker={D.kicker} title={D.title} subtitle={D.subtitle} closing={closing} onClose={onClose}
      count={`${D.items.length} ENTRIES`} hint="SELECT A FRAME TO VIEW IT LARGER"
      overlay={pv.idx !== null && <PreviewWindow items={D.items} index={pv.idx} onGo={pv.go} onClose={pv.close} meta={meta} kicker="ENTRY" />}>
      <div className="cx-rule"><i /><span>✦ ILLUSTRATED WORKS ✦</span><i /></div>
      <div className="codex">
        {D.items.map((it, i) => (
          <figure key={i} className={'cx' + (ratioNum(it.ratio) > 1.05 ? ' land' : '')}>
            <ProjectCard item={it} index={i} onOpen={pv.open} className="cx-frame" active={pv.last === i} label={it.title || `entry ${pad(i + 1)}`} />
            <figcaption className="cx-plaque">
              <span className="cx-no">ENTRY {pad(i + 1)}</span>
              {it.client && <span className="cx-award">{it.client}</span>}
              <Txt v={it.title} hint={HINTS.title} className="cx-title" />
              <Txt v={it.description} hint={HINTS.description} className="cx-desc" />
            </figcaption>
          </figure>
        ))}
      </div>
    </GameWindow>
  )
}
