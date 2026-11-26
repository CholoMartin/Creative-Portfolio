// Garden bloom: WHERE the greenery that grows around checkpoints 2-4 goes. Pure data, no three.js, no rendering (see Bloom.jsx).
// Generated once, deterministically (hash-seeded, so the garden is identical on every visit), from the same level data the
// platforms and decorations use. Edit BLOOM_IDS / REACH / the density numbers in makeBloom / the palette below to tune it.
//
// The garden is a "zone": the 3x3 pad around each bloom checkpoint PLUS the path tiles that connect them (REACH tiles either side of a
// checkpoint, so the stretches between checkpoints turn green too). Every zone tile belongs to its nearest checkpoint and grows when
// that checkpoint is first landed on, spreading outward from it. Per tile the generator scatters, with random density so some tiles are
// lush and others bare (no neat corner clusters):
//   - flat irregular grass patches on the tile top (they may creep a little onto the path, never onto the checkpoint tile)
//   - clustered + single flowers, leafy ground cover, flowering bushes
//   - vine / moss patches stuck to the exposed SIDE walls of the tiles (the +x / +z faces the isometric camera sees)
// Rules enforced here, so tweaking numbers can't break the route:
//   - solid things (flowers, bushes, cover) stay out of the cube's swept route (every path tile and the strip between neighbours, plus
//     margin); flat grass may only creep in at its edge
//   - the checkpoint tiles (markers) are never touched
//   - everything's footprint stays on the platform; nothing grows through existing decorations, foliage hugs them instead
import { CELLS, INDEX, PLATFORM, DECOR, CHECKPOINTS } from './level'

export const BLOOM_IDS = ['work', 'skills', 'contact'] // checkpoints 2, 3, 4 ('about' = checkpoint 1 and the portal stay as they are)
export const GRASS_COLORS = ['#5a9a37', '#6aa83b', '#82bf49', '#9ccf5a'] // fresh spring greens, ordered deep moss -> young leaf (a formation picks a base and blends one step either way)
export const GRASS_H = 0.008  // shard thickness: a paper-thin slab hugging the stone
export const WALL_T = 0.025   // how far a vine patch stands off the side wall
const CORRIDOR = 0.12        // half-width of the clear strip along the cube's route (plates keep their centres at least this far out, plus half their size)
export const SIDE_VINES = false // vine / moss patches on the tiles' visible side walls: off (top-surface moss only). Set true to bring them back.
const REACH = 3               // path tiles on each side of a checkpoint that join its garden

const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }
const key = (x, z) => Math.round(x) + ',' + Math.round(z)
const plat = new Set(PLATFORM.map((p) => p.x + ',' + p.z))
const pathIdx = new Map(CELLS.map((c, i) => [c.x + ',' + c.z, i])) // tile -> position along the route
const ATS = BLOOM_IDS.map((id) => CHECKPOINTS.find((c) => c.id === id).at) // index k = position in BLOOM_IDS (Bloom.jsx relies on it)

// ---- the zone: tile -> { k: owning checkpoint, kind: 'pad' | 'path' | 'cp' } ----
const zone = new Map()
ATS.forEach((at, k) => {
  const c = CELLS[at]
  PLATFORM.forEach((p) => { const kk = p.x + ',' + p.z; if (Math.abs(p.x - c.x) <= 1 && Math.abs(p.z - c.z) <= 1 && !zone.has(kk)) zone.set(kk, { k, kind: INDEX.has(kk) ? 'path' : 'pad' }) })
})
for (let i = Math.max(0, ATS[0] - REACH); i <= Math.min(CELLS.length - 1, ATS[ATS.length - 1] + REACH); i++) {
  const c = CELLS[i], kk = key(c.x, c.z)
  if (zone.has(kk)) continue
  let k = 0
  ATS.forEach((at, j) => { if (Math.abs(i - at) <= Math.abs(i - ATS[k])) k = j }) // nearest checkpoint; a tie goes to the later one
  zone.set(kk, { k, kind: 'path' })
}
ATS.forEach((at, k) => zone.set(key(CELLS[at].x, CELLS[at].z), { k, kind: 'cp' })) // the marker tiles stay clear

// the cube's swept route: a rectangle per step (covers both tiles and the slide between them)
const ROUTE = CELLS.slice(0, -1).map((a, i) => { const b = CELLS[i + 1]; return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) } })
const onRoute = (x, z, m) => ROUTE.some((r) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m)

// footprint radius (grid units) that existing decor keeps clear; tiny ground pieces don't block anything
const BLOCK = { sakura: 0.3, cubeTree: 0.28, pine: 0.3, bamboo: 0.33, shrub: 0.22, mossRock: 0.27, stoneLantern: 0.22, gardenLantern: 0.34, woodLantern: 0.18,
  torii: 0.32, hokora: 0.36, shrine: 0.5, pagoda: 0.4 }
const ANCHORS = ['stoneLantern', 'gardenLantern', 'woodLantern', 'bamboo', 'pine', 'sakura', 'hokora', 'torii', 'pagoda'] // foliage likes growing around these
const blockers = DECOR.filter((d) => BLOCK[d.type] && zone.has(key(d.x, d.z))).map((d) => ({ x: d.x + (d.ox || 0), z: d.z + (d.oz || 0), r: BLOCK[d.type], type: d.type }))
const anchors = blockers.filter((b) => ANCHORS.includes(b.type))

// does a circle lie fully on zone tiles (centre + 8 rim points), clear of the marker tiles?
const inZone = (x, z) => { const q = zone.get(key(x, z)); return !!q && q.kind !== 'cp' }
const fits = (x, z, r) => { if (!inZone(x, z)) return false; for (let i = 0; i < 8; i++) { const a = i * 0.7854; if (!inZone(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false } return true }

export function makeBloom(low = false) {
  const out = { grass: [], bush: [], cover: [], flower: [] }
  const placed = [] // bushes / cover, so nothing sits on them
  const flowers = []
  let layer = 0 // staggers patch heights by a hair so overlapping patches never z-fight

  const tiles = [...zone.entries()].map(([k, q]) => { const [x, z] = k.split(',').map(Number); return { x, z, ...q } }).sort((a, b) => a.k - b.k || a.x - b.x || a.z - b.z)
  const delay = (o, x, z, base, jit) => Math.min(0.72, base + Math.hypot(x - CELLS[ATS[o.k]].x, z - CELLS[ATS[o.k]].z) * 0.075 + jit) // grows outward from the checkpoint, category by category

  for (const t of tiles) {
    let s = 0
    const rnd = () => hash(t.x * 12.9 + s++ * 1.7, t.z * 7.3 + t.k * 3.1)
    const lush = 0.25 + rnd() * 0.75 // some tiles lush, some nearly bare: this is what keeps it from looking like a pattern
    const near = anchors.filter((a) => Math.hypot(a.x - t.x, a.z - t.z) < 1.1)
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([nx, nz]) => !plat.has(t.x + nx + ',' + (t.z + nz))) // sides with no platform beyond: railings, and the drop

    // a free spot on this tile: near a lantern / bamboo / tree, against an open platform edge, or anywhere
    const valid = (x, z, r) => fits(x, z, r) && !onRoute(x, z, 0.31 + r) && blockers.every((b) => Math.hypot(x - b.x, z - b.z) >= b.r + r) && placed.every((p) => Math.hypot(x - p.x, z - p.z) >= (p.r + r) * 0.85)
    const spot = (r, anchorP, edgeP) => {
      for (let n = 0; n < 30; n++) {
        const q = rnd(); let x, z
        if (q < anchorP && near.length) { const a = near[(rnd() * near.length) | 0], ang = rnd() * 6.283, d = a.r + r + 0.02 + rnd() * 0.14; x = a.x + Math.cos(ang) * d; z = a.z + Math.sin(ang) * d }
        else {
          x = t.x + (rnd() - 0.5) * 0.96; z = t.z + (rnd() - 0.5) * 0.96
          if (q < anchorP + edgeP && open.length) { const [nx, nz] = open[(rnd() * open.length) | 0], e = 0.5 - r - 0.04 - rnd() * 0.12; if (nx) x = t.x + nx * e; else z = t.z + nz * e }
        }
        if (valid(x, z, r)) return { x, z }
      }
      return null
    }
    const push = (kind, base, jit, it) => { const o = zone.get(key(it.x, it.z)); if (o) out[kind].push({ cp: o.k, ...it, d: delay(o, it.x, it.z, base, jit) }) }

    if (t.kind !== 'cp') {
      const pad = t.kind === 'pad'
      // 1) moss formations: few, large and connected. Each one walks a meandering spine whose width swells and narrows; along it we lay wide,
      //    thin, overlapping irregular plates (so the outline is uneven and continuous), now and then skipping one for a small gap, and
      //    sometimes growing a side lobe. On path tiles a formation either runs along a side of the route or crosses it, but plates
      //    are kept out of the central corridor (CORRIDOR) so the cube's line stays clean. Flat and thin: nothing here can touch the cube.
      const nF = pad ? (rnd() < 0.7 + lush * 0.25 ? 1 : 0) + (rnd() < lush * (low ? 0.2 : 0.4) ? 1 : 0) : (rnd() < 0.45 + lush * 0.4 ? 1 : 0)
      const ri = pathIdx.get(key(t.x, t.z)) // position along the route, undefined on pad tiles
      const ra = CELLS[ri], rb = CELLS[ri + 1] || ra, rc = CELLS[ri - 1] || ra
      const rdx = ra ? (rb !== ra ? rb.x - ra.x : ra.x - rc.x) : 0, rdz = ra ? (rb !== ra ? rb.z - ra.z : ra.z - rc.z) : 0 // route direction through this tile
      const moss = (x, z, h, L, w0, depth, col0) => {
        const ph = rnd() * 6.283, fr = 1.5 + rnd() * 2, step0 = depth ? 0.8 : 1
        let travelled = 0, miss = 0, i = 0, branched = false
        while (travelled < L && i < 40) {
          const f = travelled / L
          const w = w0 * Math.min(1, 0.3 + Math.sin(Math.PI * Math.min(1, f)) * 0.9) * (0.65 + 0.7 * Math.abs(Math.sin(f * fr * 3.14 + ph))) // narrow at the ends, uneven between
          const sx = w * (1 + rnd() * 0.6), sz = w * (0.85 + rnd() * 0.5), r = Math.max(sx, sz)
          const plate = (px, pz, sxx, szz, rr) => {
            if (onRoute(px, pz, CORRIDOR + 0.7 * rr)) return true // inside the clear corridor: leave a gap, keep walking
            if (!fits(px, pz, rr * 0.85)) return false
            const c = Math.max(0, Math.min(GRASS_COLORS.length - 1, col0 + (rnd() < 0.4 ? (rnd() < 0.5 ? -1 : 1) : 0)))
            push('grass', i * 0.014, rnd() * 0.05, { x: px, z: pz, sx: sxx, sz: szz, ry: h + (rnd() - 0.5) * 1.4, col: c, v: (rnd() * 3) | 0, layer: layer++ % 12 })
            return true
          }
          if (rnd() > 0.09) { // 1 in ~11 plates is skipped: a small gap where stone shows through
            const lat = (rnd() - 0.5) * w * 0.9
            if (plate(x - Math.sin(h) * lat, z + Math.cos(h) * lat, sx, sz, r)) miss = 0
            else { if (++miss >= 6) break; h = Math.atan2(t.z - z, t.x - x) + (rnd() - 0.5) * 0.9 } // ran off the platform: turn back toward this tile instead of stopping
            if (!low && rnd() < 0.3) { // a second plate beside it widens the formation and roughens its edge
              const side = rnd() < 0.5 ? -1 : 1, off = side * w * (0.7 + rnd() * 0.5), s2 = 0.55 + rnd() * 0.35
              plate(x - Math.sin(h) * off, z + Math.cos(h) * off, sx * s2, sz * s2, r * s2)
            }
          }
          if (!branched && depth < 1 && f > 0.3 && f < 0.7 && rnd() < 0.12) { branched = true; moss(x, z, h + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.6), L * (0.3 + rnd() * 0.25), w0 * 0.75, depth + 1, col0) }
          const st = Math.max(0.07, sx * 0.8 * step0); travelled += st; x += Math.cos(h) * st; z += Math.sin(h) * st; h += (rnd() - 0.5) * 0.55; i++
        }
      }
      for (let f = 0; f < nF; f++) {
        let x, z, h, L
        const w0 = (pad ? 0.17 + rnd() * 0.1 : 0.11 + rnd() * 0.07), col0 = (rnd() * GRASS_COLORS.length) | 0
        if (!pad && (rdx || rdz)) {
          if (rnd() < 0.55) { // run along one side of the route
            const lat = (rnd() < 0.5 ? -1 : 1) * (0.3 + rnd() * 0.1)
            x = t.x - rdx * 0.45 - rdz * lat; z = t.z - rdz * 0.45 + rdx * lat; h = Math.atan2(rdz, rdx) + (rnd() - 0.5) * 0.3; L = 1.2 + rnd() * 1
          } else { // cross the route (the middle is left clear by CORRIDOR)
            const al = (rnd() - 0.5) * 0.5
            x = t.x + rdz * 0.5 + rdx * al; z = t.z - rdx * 0.5 + rdz * al; h = Math.atan2(-rdx, rdz) + (rnd() - 0.5) * 0.4; L = 1.0 + rnd() * 0.3
          }
        } else if (rnd() < 0.5) { // start on a tile edge / joint and run along it, linking neighbouring tiles
          const sd = (rnd() * 4) | 0, sg = sd % 2 ? -1 : 1, al = (rnd() - 0.5) * 0.8
          if (sd < 2) { x = t.x + sg * (0.5 - rnd() * 0.08); z = t.z + al; h = Math.PI / 2 + (rnd() - 0.5) * 0.6 } else { x = t.x + al; z = t.z + sg * (0.5 - rnd() * 0.08); h = (rnd() - 0.5) * 0.6 }
          if (rnd() < 0.5) h += Math.PI
          L = 1.3 + rnd() * 1.1
        } else { x = t.x + (rnd() - 0.5) * 0.7; z = t.z + (rnd() - 0.5) * 0.7; h = rnd() * 6.283; L = 1.1 + rnd() * 1.1 }
        moss(x, z, h, L, w0, 0, col0)
      }
      // 2) bushes (existing `bush` model), on pad tiles only: a path tile has no room for one beside the route
      if (pad && rnd() < (low ? 0.4 : 0.58) * (0.6 + lush)) {
        const sc = 0.72 + rnd() * 0.16, sp = spot(0.2 * sc + 0.04, 0.3, 0.5)
        if (sp) { placed.push({ ...sp, r: 0.2 * sc }); push('bush', 0.2, rnd() * 0.15, { ...sp, s: sc, ry: rnd() * 6.283, tint: 0.94 + rnd() * 0.08 }) }
      }
      // 3) leafy ground cover (squashed `shrub` model)
      if (rnd() < (pad ? 0.5 + lush * 0.4 : 0.18 + lush * 0.15) * (low ? 0.7 : 1)) {
        const sc = 0.5 + rnd() * 0.3, sp = spot(0.17 * sc + 0.03, 0.45, 0.3)
        if (sp) { placed.push({ ...sp, r: 0.14 * sc }); push('cover', 0.12, rnd() * 0.15, { ...sp, s: sc, ry: rnd() * 6.283, tint: 0.92 + rnd() * 0.1 }) }
      }
      // 4) flowers: loose clusters of varying size, plus the odd single, anywhere they fit (path tiles only get the borders beside the route)
      const nc = (pad ? (rnd() < 0.5 + lush * 0.4 ? 1 : 0) + (rnd() < lush * 0.45 ? 1 : 0) : rnd() < 0.3 + lush * 0.35 ? 1 : 0) * (low && rnd() < 0.35 ? 0 : 1)
      const bloomAt = (x, z) => {
        if (!fits(x, z, 0.05) || onRoute(x, z, 0.36) || !blockers.every((b) => Math.hypot(x - b.x, z - b.z) >= b.r + 0.04) || !placed.every((p) => Math.hypot(x - p.x, z - p.z) >= p.r + 0.04) || flowers.some((f) => Math.hypot(x - f.x, z - f.z) < 0.09)) return
        const q = rnd(); flowers.push({ x, z })
        push('flower', 0.3, rnd() * 0.18, { x, z, s: 1.2 + rnd() * 0.5, ry: rnd() * 6.283, tint: 0.95 + rnd() * 0.08, hue: q < 0.45 ? 0 : q < 0.75 ? 1 : 2 })
      }
      for (let c = 0; c < nc; c++) {
        const cc = spot(0.1, 0.25, 0.3); if (!cc) continue
        const size = (low ? 2 : 3) + ((rnd() * 4) | 0), rad = 0.1 + rnd() * 0.2
        for (let n = 0; n < size; n++) { const ang = rnd() * 6.283, d = rad * Math.sqrt(rnd()); bloomAt(cc.x + Math.cos(ang) * d, cc.z + Math.sin(ang) * d) }
      }
      for (let n = pad ? 1 + (rnd() < 0.5 ? 1 : 0) : rnd() < 0.5 ? 1 : 0; n > 0; n--) { const sp = spot(0.05, 0.15, 0.25); if (sp) bloomAt(sp.x, sp.z) }
    }

    // 5) vines / moss on the exposed side walls the camera sees (+x and +z faces): they hang from near the top edge and trail down
    for (const [nx, nz, wall] of [[1, 0, 'x'], [0, 1, 'z']]) {
      if (plat.has(t.x + nx + ',' + (t.z + nz))) continue
      const n = low ? (rnd() < 0.5 + lush * 0.2 ? 1 + (rnd() < 0.3 ? 1 : 0) : 0) : rnd() < 0.55 + lush * 0.3 ? 1 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.2 ? 1 : 0) : 0
      for (let j = 0; j < n; j++) {
        const off = (rnd() - 0.5) * 0.8, top = -0.03 - rnd() * 0.22, long = rnd() < 0.4
        const rv = Math.min(long ? 0.2 + rnd() * 0.22 : 0.09 + rnd() * 0.12, (0.85 + top) / 2), rh = 0.07 + rnd() * 0.14
        const x = wall === 'x' ? t.x + 0.495 : t.x + off, z = wall === 'x' ? t.z + off : t.z + 0.495
        const jit = rnd() * 0.1, col = (rnd() * GRASS_COLORS.length) | 0, v = rnd() < 0.5 ? 0 : 1, lay = layer++ % 8 // (drawn / counted even when off, so the top-surface moss is generated exactly as before)
        if (SIDE_VINES) push('grass', 0.1, jit, { x, z, wall, top, rv, rh, col, v, layer: lay })
      }
    }
  }
  // Bloom.jsx animates one contiguous slice per checkpoint
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.cp - b.cp)
  return out
}
