// Garden bloom for checkpoints 2-4: when the cube first lands on one, the stone pad around it slowly greens over.
//   flat low-poly grass patches -> leafy ground cover and flowering bushes -> small flowers popping open,
//   plus a few drifting petals and soft glow motes that fade out on their own.
//
// Cost model (see bloomData.js for WHERE things go):
//   - everything is instanced and shared by all three checkpoints: 3 grass-shard meshes, cover, bush, 3 flower colours (all reusing the
//     decor.js models and one vertex-coloured material), plus one petal mesh and one Points object. ~9 draw calls in total.
//   - nothing is created or destroyed at runtime. Instances start at scale 0 and are only grown, never re-allocated.
//   - useFrame does three Set lookups while idle. Matrix/particle updates run ONLY during a checkpoint's first ~3 s (growth) and ~11 s (petals),
//     and each checkpoint blooms once; revisiting it does nothing. Petals/motes are hidden and stop updating when they're done.
//   - prefers-reduced-motion: the garden simply appears fully grown, with no petals.
import { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CELLS, CHECKPOINTS, wp } from './level'
import { decorGeometries } from './decor'
import { makeBloom, BLOOM_IDS, GRASS_COLORS, GRASS_H, WALL_T } from './bloomData'
import { grade } from './grade'
import { soft } from './World' // (only used at render time: World.jsx imports this file, so nothing from it may be read at module load)

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const GROW = 4.2   // seconds for the garden to finish growing (it spreads outward from the checkpoint along the connecting path)
const FX = 12.2    // seconds until the last petal / mote has faded
const SPAN = 0.3   // each item's own grow time, as a fraction of GROW (its start is item.d, set in bloomData.js)
const LOW = matchMedia('(pointer: coarse)').matches || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4 // same test as World.jsx
const NP = LOW ? 8 : 14, NM = LOW ? 4 : 8 // petals / glow motes per checkpoint

const MOSS = GRASS_COLORS.map((c) => grade(c, 'moss')) // palette from bloomData.js with the shared colour grade
const NO_RAY = () => null // decoration only: never hit-tested, so it can't catch pointer / scroll input or be "collided" with
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeOutBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2) // soft overshoot: the "pop" of a blossom opening
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x) }
const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }

// irregular flat shard (unit radius, height 1, scaled paper-thin per instance): each corner pulled in or out, so no two variants read alike
function grassGeo(seed, sides) {
  const g = new THREE.CylinderGeometry(1, 1, 1, sides, 1), p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    if (!x && !z) continue
    const k = ((Math.round(Math.atan2(z, x) / ((Math.PI * 2) / sides)) % sides) + sides) % sides, f = 0.68 + 0.55 * hash(k + seed * 9, 3)
    p.setX(i, x * f); p.setZ(i, z * f)
  }
  g.deleteAttribute('uv')
  return g
}

export default function Bloom({ store }) {
  const camera = useThree((s) => s.camera)
  const root = useRef(), layers = useRef([]), petals = useRef(), motes = useRef()
  const D = useMemo(() => new THREE.Object3D(), [])
  const C = useMemo(() => new THREE.Color(), [])

  const R = useMemo(() => {
    const G = decorGeometries(), data = makeBloom(LOW)
    const veg = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })
    const grass = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95 })
    const own = [grass, grassGeo(0, 5), grassGeo(1, 6), grassGeo(3, 5)] // what this component made (and must dispose); decor.js geometries are shared
    const defs = [
      { kind: 'grass', list: data.grass.filter((i) => i.v === 0), geo: own[1], mat: grass },
      { kind: 'grass', list: data.grass.filter((i) => i.v === 1), geo: own[2], mat: grass },
      { kind: 'grass', list: data.grass.filter((i) => i.v === 2), geo: own[3], mat: grass },
      { kind: 'cover', list: data.cover, geo: G.shrub, mat: veg },
      { kind: 'bush', list: data.bush, geo: G.bush, mat: veg },
      ...['flowerPink', 'flowerYellow', 'flowerWhite'].map((n, h) => ({ kind: 'flower', list: data.flower.filter((i) => i.hue === h), geo: G[n], mat: veg })),
    ].filter((L) => L.list.length)
    // lists are built checkpoint by checkpoint, so each checkpoint owns one contiguous slice
    defs.forEach((L) => { L.range = BLOOM_IDS.map((_, k) => { let a = -1, b = 0; L.list.forEach((it, j) => { if (it.cp === k) { if (a < 0) a = j; b = j + 1 } }); return [Math.max(a, 0), b] }) })

    const centres = BLOOM_IDS.map((id) => { const [x, , z] = wp(CELLS[CHECKPOINTS.find((c) => c.id === id).at]); return { x, z } })
    const pet = Array.from({ length: NP * BLOOM_IDS.length }, (_, i) => {
      const k = (i / NP) | 0, h = (a) => hash(i + a * 13, 5 + k)
      return { k, ang: h(1) * 6.283, r: 0.2 + h(2) * 1.3, y0: 0.55 + h(3) * 0.7, ph: h(4) * 6.283, delay: 0.7 + h(5) * 3.3, life: 5 + h(6) * 2.5, size: 0.05 + h(7) * 0.025 }
    })
    const mot = Array.from({ length: NM * BLOOM_IDS.length }, (_, i) => {
      const k = (i / NM) | 0, h = (a) => hash(i + a * 17, 9 + k)
      return { k, ang: h(1) * 6.283, r: 0.15 + h(2) * 1.1, ph: h(3) * 6.283, delay: 0.9 + h(4) * 3.6, life: 4 + h(5) * 2, gold: h(6) < 0.6 }
    })
    const petalGeo = new THREE.CircleGeometry(1, 5)
    const petalMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, flatShading: true, roughness: 0.8 })
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mot.length * 3), 3))
    moteGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(mot.length * 3), 3))
    const moteMat = new THREE.PointsMaterial({ map: soft(), vertexColors: true, size: 6, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const B = (store.bloom ||= BLOOM_IDS.map(() => ({ on: false, t0: 0, grown: false, fxDone: false }))) // lives in the store, so it survives leaving for the Creative Dimension and coming back
    return { defs, centres, pet, mot, petalGeo, petalMat, moteGeo, moteMat, own, B }
  }, [])
  const { defs, centres, pet, mot, B } = R
  const gold = useMemo(() => new THREE.Color('#ffe9a8'), []), rose = useMemo(() => new THREE.Color('#ffc2e0'), [])

  // write one checkpoint's slice of every layer at time `el` (seconds since it was activated; negative = not yet)
  const write = (k, el) => {
    const p = (el / GROW) * 1.05
    defs.forEach((L, li) => {
      const im = layers.current[li], [a, b] = L.range[k]
      for (let j = a; j < b; j++) {
        const it = L.list[j], [x, , z] = wp(it), u = clamp((p - it.d) / SPAN)
        const e = Math.max(L.kind === 'flower' || L.kind === 'bush' ? easeOutBack(u) : easeOut(u), 1e-4)
        D.rotation.set(0, it.ry || 0, 0)
        if (it.wall) { // vine on a side wall: a flat slab turned to face outward, hanging from its top edge and trailing down as it grows
          const t = Math.max(WALL_T * Math.min(1, e * 3), 1e-4), off = t / 2 - 0.006 + it.layer * 0.0015, vr = it.rv * e, hr = it.rh * e, y = it.top - vr
          if (it.wall === 'x') { D.rotation.set(0, 0, Math.PI / 2); D.position.set(x + off, y, z); D.scale.set(vr, t, hr) }
          else { D.rotation.set(Math.PI / 2, 0, 0); D.position.set(x, y, z + off); D.scale.set(hr, t, vr) }
        }
        else if (L.kind === 'grass') { D.position.set(x, 0.012 + 0.0007 * it.layer + GRASS_H / 2, z); D.scale.set(it.sx * e, Math.max(GRASS_H * Math.min(1, e * 3), 1e-4), it.sz * e) }
        else { D.position.set(x, 0.02, z); if (L.kind === 'cover') D.scale.set(it.s * e, it.s * 0.55 * e, it.s * e); else D.scale.setScalar(it.s * e) }
        D.updateMatrix(); im.setMatrixAt(j, D.matrix)
      }
      im.instanceMatrix.needsUpdate = true
    })
  }

  // petals and motes: closed-form motion from (time - delay), so there is no per-particle state to integrate or reset
  const fx = () => {
    const S = store, pm = petals.current, pos = R.moteGeo.attributes.position, col = R.moteGeo.attributes.color
    pet.forEach((p, i) => {
      const q = B[p.k], el = q.on ? S.t - q.t0 : -1, tp = (el - p.delay) / p.life, c = centres[p.k]
      if (tp <= 0 || tp >= 1) { D.scale.setScalar(1e-4); D.position.set(c.x, -9, c.z) } else {
        const s = p.size * smooth(tp / 0.15) * (1 - smooth((tp - 0.78) / 0.22))
        D.position.set(c.x + Math.cos(p.ang) * p.r + Math.sin(tp * 5 + p.ph) * 0.12 - tp * 0.45, p.y0 * (1 - tp) + 0.07 + Math.sin(tp * 9 + p.ph) * 0.03, c.z + Math.sin(p.ang) * p.r + Math.cos(tp * 4 + p.ph) * 0.12 - tp * 0.3)
        D.rotation.set(tp * 6 + p.ph, tp * 4, tp * 5 + p.ph); D.scale.set(s, s * 0.65, s)
      }
      D.updateMatrix(); pm.setMatrixAt(i, D.matrix)
    })
    pm.instanceMatrix.needsUpdate = true
    mot.forEach((m, i) => {
      const q = B[m.k], el = q.on ? S.t - q.t0 : -1, tp = (el - m.delay) / m.life, c = centres[m.k]
      const f = tp <= 0 || tp >= 1 ? 0 : Math.sin(Math.PI * tp) * 0.9, k = m.gold ? gold : rose
      pos.setXYZ(i, c.x + Math.cos(m.ang + tp * 0.8) * m.r, 0.15 + clamp(tp) * 0.9, c.z + Math.sin(m.ang + tp * 0.8) * m.r)
      col.setXYZ(i, k.r * f, k.g * f, k.b * f)
    })
    pos.needsUpdate = col.needsUpdate = true
    R.moteMat.size = 0.07 * camera.zoom
  }

  useLayoutEffect(() => {
    defs.forEach((L, li) => {
      const im = layers.current[li]
      L.list.forEach((it, j) => im.setColorAt(j, L.kind === 'grass' ? C.set(MOSS[it.col]) : C.setScalar(it.tint)))
      im.instanceColor.needsUpdate = true
    })
    pet.forEach((_, i) => petals.current.setColorAt(i, C.set(['#ffc2d8', '#ffd6e5', '#ffffff'][i % 3])))
    petals.current.instanceColor.needsUpdate = true
    BLOOM_IDS.forEach((_, k) => write(k, B[k].on ? store.t - B[k].t0 : -1)) // fresh mount: lay out whatever state the store is already in
    root.current.visible = B.some((q) => q.on)
    petals.current.visible = motes.current.visible = false
    return () => { R.own.forEach((o) => o.dispose()); R.petalGeo.dispose(); R.petalMat.dispose(); R.moteGeo.dispose(); R.moteMat.dispose() }
  }, [])

  useFrame(() => {
    const S = store
    let live = false
    BLOOM_IDS.forEach((id, k) => {
      const q = B[k]
      if (!q.on) { // first landing on this checkpoint (sim.js adds it to `visited` the moment the cube arrives)
        if (!S.visited.has(id)) return
        q.on = true; q.t0 = REDUCED ? S.t - GROW : S.t; q.fxDone = REDUCED; root.current.visible = true
      }
      const el = S.t - q.t0
      if (!q.grown) { write(k, el); q.grown = el >= GROW }
      if (!q.fxDone) { live = true; q.fxDone = el > FX }
    })
    if (live || petals.current.visible) { // one last pass after the final petal fades, then hide both and go idle
      petals.current.visible = motes.current.visible = live
      fx()
    }
  })

  return (
    <group ref={root} visible={false}>
      {defs.map((L, i) => (
        <instancedMesh key={i} ref={(el) => (layers.current[i] = el)} args={[L.geo, L.mat, L.list.length]} receiveShadow frustumCulled={false} raycast={NO_RAY} />
      ))}
      <instancedMesh ref={petals} args={[R.petalGeo, R.petalMat, NP * BLOOM_IDS.length]} frustumCulled={false} raycast={NO_RAY} />
      <points ref={motes} geometry={R.moteGeo} material={R.moteMat} frustumCulled={false} renderOrder={3} raycast={NO_RAY} />
    </group>
  )
}
