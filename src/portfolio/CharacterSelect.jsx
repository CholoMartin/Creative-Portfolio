// 05 · NFT COLLECTION — character select: roster, highlighted selection, large stage and a dedicated info panel.
import { useEffect, useState } from 'react'
import { NFT as D, NFT_DISCLAIMER, HINTS } from './data'
import { GameWindow, ImageSlot, PreviewWindow, Txt, usePreview, getMem, pad } from './ui'

const info = (it) => ({
  company: it.company || D.company,
  desc: it.description || D.description,
})
const meta = (it) => { const f = info(it); return { title: D.characterName || it.title, titleHint: HINTS.character, sub: f.company, subHint: HINTS.company, desc: f.desc, rows: [{ k: 'DISCLAIMER', v: NFT_DISCLAIMER }] } }

function Field({ label, v, hint }) {
  return <div className="cs-f"><dt>{label}</dt><dd><Txt v={v} hint={hint} /></dd></div>
}

export default function CharacterSelect({ cat, icon, closing, onClose }) {
  const n = D.items.length, m = getMem('nft')
  const [sel, setSel] = useState(Math.min(m.sel || 0, n - 1))
  const pv = usePreview('nft', n)
  const pick = (i) => { m.sel = i; setSel(i) }
  const step = (d) => pick((sel + d + n) % n)
  const it = D.items[sel], f = info(it)
  useEffect(() => { // ← → change the selected character (the preview handles its own arrows first)
    const k = (e) => { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); step(e.code === 'ArrowLeft' ? -1 : 1) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const closePv = () => { if (pv.idx != null) pick(pv.idx); pv.close() }

  return (
    <GameWindow id="nft" cat={cat} icon={icon} kicker={D.kicker} title={D.title} subtitle={D.subtitle} closing={closing} onClose={onClose}
      count={`CHARACTER ${pad(sel + 1)} / ${pad(n)}`} hint="← → TO SWITCH · CLICK THE PORTRAIT TO ENLARGE"
      overlay={pv.idx !== null && <PreviewWindow items={D.items} index={pv.idx} onGo={pv.go} onClose={closePv} meta={meta} kicker="CHARACTER" />}>
      <div className="cs">
        <div className="cs-left">
          <div className="cs-stage">
            <button type="button" className="cs-arrow l" onClick={() => step(-1)} aria-label="Previous character">‹</button>
            <button type="button" className="cs-view" onClick={(e) => pv.open(sel, e)} aria-label="View character larger">
              <ImageSlot key={sel} item={it} index={sel} className="cs-slot" eager />
              <span className="cs-badge">▲ SELECTED</span>
            </button>
            <button type="button" className="cs-arrow r" onClick={() => step(1)} aria-label="Next character">›</button>
          </div>
          <div className="cs-plate">
            <small>CHARACTER {pad(sel + 1)} / {pad(n)}</small>
            <Txt as="h3" v={D.characterName || it.title} hint={HINTS.character} />
          </div>
          <div className="cs-roster" role="group" aria-label="Character roster">
            {D.items.map((c, i) => (
              <button key={i} type="button" className={'cs-r' + (i === sel ? ' on' : '')} aria-pressed={i === sel} aria-label={c.title || `Character ${pad(i + 1)}`} onClick={() => pick(i)}>
                <ImageSlot item={c} index={i} className="mini" />
                <span className="cs-rn">{pad(i + 1)}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="cs-info" aria-live="polite">
          <section>
            <h4>PROJECT INFORMATION</h4>
            <dl>
              <Field label="Company / project" v={f.company} hint={HINTS.company} />
              <Field label="Description" v={f.desc} hint={HINTS.description} />
            </dl>
            <div className="cs-inline-disc">
              <h4>NFT DISCLAIMER</h4>
              <p>{NFT_DISCLAIMER}</p>
            </div>
          </section>
        </aside>
      </div>
    </GameWindow>
  )
}
