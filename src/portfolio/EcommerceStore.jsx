// 01 · E-COMMERCE — RPG item shop: portrait items on shelves, inspect to open a larger preview.
import { ECOMMERCE as D, HINTS } from './data'
import { GameWindow, ProjectCard, PreviewWindow, usePreview, pad } from './ui'

const meta = (it) => ({ title: it.title, sub: it.brand, subHint: HINTS.brand, desc: it.description })

export default function EcommerceStore({ cat, icon, closing, onClose }) {
  const pv = usePreview('ecommerce', D.items.length)
  return (
    <GameWindow id="ecommerce" cat={cat} icon={icon} kicker={D.kicker} title={D.title} subtitle={D.subtitle} closing={closing} onClose={onClose}
      count={`${D.items.length} ITEMS`} hint="SELECT AN ITEM TO INSPECT"
      overlay={pv.idx !== null && <PreviewWindow items={D.items} index={pv.idx} onGo={pv.go} onClose={pv.close} meta={meta} kicker="ITEM" showRatio={false} showInfo={false} note="Product designs shown are fictional and for sample purposes only." />}>
      <div className="shop-strip"><span>◆ FEATURED LOOT</span><i /><span className="shop-wallet"><span aria-hidden="true">◉</span> 99,999</span><span>{D.items.length} ITEMS</span></div>
      <div className="shop-layout">
        <div className="shop-featured-column">
          {D.items.slice(0, 1).map((it, i) => (
            <ProjectCard key={i} item={it} index={i} onOpen={pv.open} className="shop-card shop-featured" active={pv.last === i} label={it.title || `item ${pad(i + 1)}`} fill>
              <span className="shop-no">★ FEATURED</span>
            </ProjectCard>
          ))}
          <p className="shop-disclaimer">Product designs shown are fictional and for sample purposes only.</p>
        </div>
        <div className="shop-items-grid">
          {D.items.slice(1).map((it, offset) => {
            const i = offset + 1
            return (
              <ProjectCard key={i} item={it} index={i} onOpen={pv.open} className="shop-card shop-item" active={pv.last === i} label={it.title || `item ${pad(i + 1)}`}>
                <span className="shop-no is-rare">RARE ITEM</span>
              </ProjectCard>
            )
          })}
        </div>
      </div>
    </GameWindow>
  )
}
