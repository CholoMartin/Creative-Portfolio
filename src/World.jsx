import { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CELLS, CHECKPOINTS, PORTAL, PAD_AT, PLATFORM, DECOR, wp } from './level'
import { newPose } from './path'
import { newSimState, stepSim, release } from './sim'
import { stepPortalSeq, PORTAL_CORE, TRAIL_N } from './portal'
import { decorGeometries } from './decor'
import Clouds from './Clouds'
import Bloom from './Bloom'
import { LIGHT, gradePalette } from './grade'

export const LOW = matchMedia('(pointer: coarse)').matches || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4

// ---- tweakables ----
export const COL = { white: '#ffffff', cube: '#c5a3ff', gold: '#ffc857', glow: '#ffb347', plate: '#c4574a', petal: '#ffb3cf', magic: '#c8a8ff', pink: '#ff9ad0' }
const T = { tiles: 0.3, tilesEnd: 2.9, drop: 3.0, ready: 4.3, zoom: 4.0 } // intro timeline (seconds)
const CUBE = 0.56

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }

let _soft, _fade
export const soft = () => { // round glow sprite texture
  if (_soft) return _soft
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  return (_soft = new THREE.CanvasTexture(c))
}
const fade = () => { // vertical alpha ramp for light beams: opaque at the bottom, clear at the top
  if (_fade) return _fade
  const c = document.createElement('canvas'); c.width = 2; c.height = 64
  const g = c.getContext('2d'), r = g.createLinearGradient(0, 0, 0, 64)
  r.addColorStop(0, '#000'); r.addColorStop(1, '#fff')
  g.fillStyle = r; g.fillRect(0, 0, 2, 64)
  return (_fade = new THREE.CanvasTexture(c))
}

/* ---- simulation: intro timing, then the checkpoint state machine in sim.js ---- */
function Sim({ store, api, cb }) {
  useEffect(() => { api.current.release = () => release(store, api.current, cb.current) }, [])
  useFrame((_, dtr) => {
    const S = store, dt = Math.min(dtr, 0.05)
    S.t += dt
    if (!S.ready && S.t >= T.ready) { S.ready = true; cb.current.onReady() }
    if (!S.landed && S.t >= T.drop + 0.5) {
      S.landed = true; S.sq = 1
      S.events.push({ x: S.pose.pos.x, y: 0, z: S.pose.pos.z, n: 14, pw: 1 })
    }
    stepSim(S, api.current, dt, cb.current)
    stepPortalSeq(S, dt, cb.current)
  })
  return null
}

/* ---- floating platforms: ONE sandstone for the path and the pads (one instanced mesh) + a few moss patches ---- */
export const STONE = gradePalette({ top: '#d1cbc5', side: '#c4beb5', ledge: '#d4cec2', grass: '#a0c978', moss: '#7f9f58', mossLt: '#98b46a' }, // (colour-graded by grade.js)
  { top: 'stone', side: 'stone', ledge: 'stone', grass: 'green', moss: 'green', mossLt: 'green' })
export const stoneTex = () => { // faint speckle + a couple of hairline cracks, greyscale so it only darkens the stone colour
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 260; i++) { const v = 218 + ((hash(i, 1) * 30) | 0); g.fillStyle = `rgba(${v},${v - 4},${v - 12},${0.35 + hash(i, 2) * 0.4})`; g.fillRect(hash(i, 3) * 128, hash(i, 4) * 128, 1 + hash(i, 5) * 3, 1 + hash(i, 6) * 3) }
  g.strokeStyle = 'rgba(150,135,110,0.28)'; g.lineWidth = 1; g.lineCap = 'round'
  for (const [x, y, dx, dy] of [[14, 96, 22, -18], [36, 78, 14, 6], [88, 30, 20, 24], [108, 54, -10, 16]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 0.5, y + dy * 0.4); g.lineTo(x + dx, y + dy); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
// a slab with a slightly inset top cap: the step reads as a chamfer and as a paving joint between neighbours
export function tileGeo() {
  const col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
  const body = new THREE.BoxGeometry(0.99, 0.85, 0.99); body.translate(0, -0.025, 0); col(body, STONE.side)
  const cap = new THREE.BoxGeometry(0.93, 0.07, 0.93); cap.translate(0, 0.415, 0); col(cap, STONE.top)
  const ledge = new THREE.BoxGeometry(0.97, 0.03, 0.97); ledge.translate(0, 0.385, 0); col(ledge, STONE.ledge)
  return mergeGeometries([body, ledge, cap])
}
// moss: flat low-poly patches on selected tile corners and along a few edges; understated, no collision with the route
const MOSS = []
PLATFORM.forEach((p, i) => {
  const r = hash(p.x * 2.1, p.z * 3.3)
  if (r < (p.pad ? 0.34 : 0.14)) {
    const sx = hash(p.x, p.z + 1) < 0.5 ? -1 : 1, sz = hash(p.x + 5, p.z) < 0.5 ? -1 : 1
    MOSS.push({ i, x: sx * 0.37, z: sz * 0.37, sx: 0.13 + r * 0.12, sz: 0.1 + r * 0.1, ry: r * 6, k: r })
    if (r < 0.1) MOSS.push({ i, x: -sx * 0.1, z: sz * 0.465, sx: 0.2, sz: 0.045, ry: 0, k: r + 0.3 }) // creeping along a joint
  }
})
function Platforms({ store }) {
  const ref = useRef(), mossRef = useRef(), done = useRef(false)
  const d = useMemo(() => new THREE.Object3D(), [])
  const geo = useMemo(() => tileGeo(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: COL.white, vertexColors: true, map: stoneTex(), roughness: 0.96, flatShading: true }), [])
  const mossGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])
  const mossMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COL.white, roughness: 1, flatShading: true }), [])
  const set = (t) => {
    const drop = PLATFORM.map((p) => { const e = easeOut(clamp((t - (T.tiles + p.order * 0.035)) / 1.1)); return -(1 - e) * 7 })
    PLATFORM.forEach((p, i) => {
      const [x, , z] = wp(p)
      d.position.set(x, -0.45 + drop[i], z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
    })
    MOSS.forEach((m, j) => {
      const [x, , z] = wp(PLATFORM[m.i])
      d.position.set(x + m.x, 0.004 + drop[m.i], z + m.z); d.rotation.set(0, m.ry, 0); d.scale.set(m.sx, 0.03, m.sz); d.updateMatrix()
      mossRef.current.setMatrixAt(j, d.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = mossRef.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => {
    const c = new THREE.Color(), m = new THREE.Color()
    // one base colour for every tile: only a +-2% brightness wobble so the slabs don't look stamped
    PLATFORM.forEach((p, i) => ref.current.setColorAt(i, c.set(p.tint).multiplyScalar(0.98 + hash(p.x, p.z) * 0.04)))
    MOSS.forEach((q, j) => mossRef.current.setColorAt(j, m.set(STONE.moss).lerp(c.set(STONE.mossLt), q.k % 1)))
    ref.current.instanceColor.needsUpdate = mossRef.current.instanceColor.needsUpdate = true
    set(store.t)
  }, [])
  useFrame(() => { if (!done.current) { set(store.t); done.current = store.t > T.tilesEnd + 0.3 } })
  return (
    <>
      <instancedMesh ref={ref} args={[geo, mat, PLATFORM.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={mossRef} args={[mossGeo, mossMat, MOSS.length]} receiveShadow frustumCulled={false} />
    </>
  )
}

/* ---- garden decorations: one instanced draw call per piece type (see decor.js) ---- */
function Decor({ store }) {
  const g = useRef()
  const G = useMemo(() => decorGeometries(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }), [])
  const groups = useMemo(() => {
    const m = {}
    for (const d of DECOR) (m[d.type] ||= []).push(d)
    return Object.entries(m)
  }, [])
  useFrame(() => {
    const e = easeOut(clamp((store.t - 1.7) / 1.3))
    g.current.visible = e > 0; g.current.position.y = -(1 - e) * 5
  })
  return (
    <group ref={g} visible={false}>
      {groups.map(([type, items]) => <DecorInst key={type} geo={G[type]} mat={mat} items={items} />)}
    </group>
  )
}

function DecorInst({ geo, mat, items, shadows = true }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const d = new THREE.Object3D(), c = new THREE.Color()
    items.forEach((it, i) => {
      const [x, , z] = wp(it)
      d.position.set(x + (it.ox || 0), it.y || 0, z + (it.oz || 0)); d.rotation.y = it.rot; d.scale.setScalar(it.s); d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix); ref.current.setColorAt(i, c.setScalar(it.tint))
    })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
}

/* ---- floating-island undersides under every pad / some path tiles, plus a few far islands with buildings ---- */
const FAR = [
  { x: -3, z: -7, y: -2.5, r: 1.6, type: 'pagoda' }, { x: 7, z: -6, y: 1, r: 1.3, type: 'sakura' },
  { x: 10, z: -8, y: -2, r: 1.5, type: 'shrine' }, { x: 17, z: -9, y: -3.5, r: 1.3, type: 'sakura' },
  { x: -11, z: -5, y: -8, r: 1.7, type: 'sakura' }, { x: 2, z: -1, y: -6, r: 1.8, type: 'pagoda' },
  { x: 17, z: 3, y: -1, r: 1.4, type: 'shrine' }, { x: 20, z: 2, y: -3, r: 1.2, type: 'sakura' },
]
function Islands({ store }) {
  const g = useRef(), far = useRef(), rocks = useRef(), slabs = useRef()
  const G = useMemo(() => decorGeometries(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), [])
  const slabGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 0.3, 7), [])
  const slabMat = useMemo(() => new THREE.MeshStandardMaterial({ color: STONE.grass, flatShading: true, roughness: 0.9 }), [])
  const R = useMemo(() => {
    const out = PAD_AT.map((at) => ({ x: CELLS[at].x, z: CELLS[at].z, y: -0.9, r: 1.75, h: 2.4 + hash(at, 1) * 1.2 }))
    CELLS.forEach((c, i) => {
      if (i % 3 === 1 && PAD_AT.every((a) => Math.max(Math.abs(c.x - CELLS[a].x), Math.abs(c.z - CELLS[a].z)) > 1)) out.push({ x: c.x, z: c.z, y: -0.9, r: 0.62, h: 1 + hash(i, 2) * 0.6 })
    })
    FAR.forEach((f, i) => out.push({ ...f, y: f.y - 0.28, h: 2.2 + hash(i, 3) * 1.6, far: true, top: f.y }))
    return out
  }, [])
  const farItems = useMemo(() => FAR.map((f, i) => ({ type: f.type, x: f.x, z: f.z, y: f.y, rot: hash(i, 5) * 6.28, s: 1.5, tint: 1 })), [])
  const byType = useMemo(() => { const m = {}; for (const it of farItems) (m[it.type] ||= []).push(it); return Object.entries(m) }, [])
  useLayoutEffect(() => {
    const d = new THREE.Object3D(), c = new THREE.Color()
    R.forEach((it, i) => {
      const [x, , z] = wp(it)
      d.position.set(x, it.y, z); d.rotation.set(0, hash(i, 9) * 6.28, 0); d.scale.set(it.r, it.h, it.r); d.updateMatrix()
      rocks.current.setMatrixAt(i, d.matrix); rocks.current.setColorAt(i, c.setScalar(0.9 + hash(i, 4) * 0.12))
    })
    FAR.forEach((f, i) => {
      const [x, , z] = wp(f)
      d.position.set(x, f.y - 0.15, z); d.rotation.set(0, hash(i, 9) * 6.28, 0); d.scale.set(f.r * 1.04, 1, f.r * 1.04); d.updateMatrix()
      slabs.current.setMatrixAt(i, d.matrix)
    })
    rocks.current.instanceMatrix.needsUpdate = slabs.current.instanceMatrix.needsUpdate = true; rocks.current.instanceColor.needsUpdate = true
  }, [])
  useFrame(() => {
    const e = easeOut(clamp((store.t - T.tiles - 0.4) / 1.8))
    g.current.visible = e > 0; g.current.position.y = -(1 - e) * 7
    far.current.position.y = Math.sin(store.t * 0.5) * 0.12 // far islands drift gently
  })
  return (
    <group ref={g} visible={false}>
      <instancedMesh ref={rocks} args={[G.islandRock, mat, R.length]} frustumCulled={false} />
      <group ref={far}>
        <instancedMesh ref={slabs} args={[slabGeo, slabMat, FAR.length]} frustumCulled={false} />
        {byType.map(([type, items]) => <DecorInst key={type} geo={G[type]} mat={mat} items={items} shadows={false} />)}
      </group>
    </group>
  )
}

/* ---- checkpoint: a stone plate, a floating gold crystal and a soft light pillar that glow up when the cube arrives ----
   The pillar is an edge-lit shell: its alpha is a fresnel term (0 where the surface faces the camera, so the middle of the
   pillar is clear), and it fades out with height. The cube sits inside it and is never washed out.                       */
const BEAM_H = 2.0
export const beamMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uColor: { value: new THREE.Color('#ffd98a') }, uOpacity: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vH = uv.y; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying float vH;
    void main(){
      float edge = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
      float h = pow(1.0 - vH, 1.7) * smoothstep(0.0, 0.07, vH);
      gl_FragColor = vec4(uColor, edge * h * uOpacity);
    }`,
})
const N_SPARK = 14
function Marker({ cp, store }) {
  const camera = useThree((s) => s.camera)
  const g = useRef(), plate = useRef(), gem = useRef(), ring = useRef(), sparks = useRef(), k = useRef({ a: 0, t0: -9, was: false })
  const [x, , z] = wp(CELLS[cp.at])
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COL.plate, roughness: 0.7, emissive: COL.glow, emissiveIntensity: 0 }), [])
  const gemMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd77a', emissive: COL.glow, emissiveIntensity: 0.4, roughness: 0.3, flatShading: true }), [])
  const beamMat = useMemo(beamMaterial, [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: COL.gold, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcf7a', map: soft(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const sparkMat = useMemo(() => new THREE.PointsMaterial({ map: soft(), vertexColors: true, size: 6, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_SPARK * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N_SPARK * 3), 3))
    return geo
  }, [])
  const P = useMemo(() => Array.from({ length: N_SPARK }, (_, i) => ({ ph: hash(i, cp.at), sp: 0.12 + hash(i, 7) * 0.1, r: 0.52 + hash(i, 11) * 0.28, a0: hash(i, 13) * 6.283, w: 0.2 + hash(i, 17) * 0.3 })), [])
  const gold = useMemo(() => new THREE.Color('#ffd98a'), [])
  const delay = T.tiles + cp.at * 0.035 + 0.9
  useFrame((_, dtr) => {
    const S = store, dt = Math.min(dtr, 0.05), q = k.current
    const e = easeOut(clamp((S.t - delay) / 0.5))
    g.current.visible = e > 0; g.current.scale.setScalar(Math.max(e, 0.001))
    if (e <= 0) return
    const on = S.open === cp
    if (on && !q.was) q.t0 = S.t // a new activation starts one expanding ring
    q.was = on
    q.a += ((on ? 1 : S.visited.has(cp.id) ? 0.3 : 0) - q.a) * (1 - Math.exp(-4.5 * dt)) // smooth glow, independent of frame rate
    const prox = Math.max(0, 1 - Math.abs(S.pose.s - cp.at) * 1.5)
    plate.current.position.y = 0.1 - 0.04 * prox
    plateMat.emissiveIntensity = 0.05 + 0.7 * q.a
    gem.current.rotation.y = S.t * (1 + 1.5 * q.a)
    gem.current.position.y = 1.4 + 0.1 * q.a + 0.05 * Math.sin(S.t * 2) // hovers clear of the cube (top at 0.66)
    gem.current.scale.setScalar(1 + 0.15 * q.a)
    gemMat.emissiveIntensity = 0.4 + 0.9 * q.a
    beamMat.uniforms.uOpacity.value = 0.22 + 0.5 * q.a
    poolMat.opacity = 0.1 + 0.28 * q.a
    const p = clamp((S.t - q.t0) / 1.2)
    ring.current.scale.setScalar(0.6 + 1.5 * easeOut(p)); ringMat.opacity = 0.55 * (1 - p)
    // drifting motes: spiral slowly up around the cube, fading in and out so nothing pops
    const pos = sparkGeo.attributes.position, col = sparkGeo.attributes.color, lvl = 0.25 + 0.75 * q.a
    P.forEach((m, i) => {
      const u = (S.t * m.sp + m.ph) % 1, a = m.a0 + S.t * m.w, f = Math.sin(Math.PI * u) * (1 - u) * lvl
      pos.setXYZ(i, Math.cos(a) * m.r, 0.15 + u * (BEAM_H - 0.2), Math.sin(a) * m.r)
      col.setXYZ(i, gold.r * f, gold.g * f, gold.b * f)
    })
    pos.needsUpdate = col.needsUpdate = true
    sparkMat.size = 0.085 * camera.zoom
  })
  return (
    <group ref={g} position={[x, 0, z]} visible={false}>
      <mesh position-y={0.03} castShadow receiveShadow><boxGeometry args={[0.94, 0.06, 0.94]} /><meshStandardMaterial color="#d9cdb3" roughness={0.95} /></mesh>
      {[[0, -0.43, 0.88, 0.03], [0, 0.43, 0.88, 0.03], [-0.43, 0, 0.03, 0.88], [0.43, 0, 0.03, 0.88]].map(([ox, oz, w, d], i) => (
        <mesh key={i} position={[ox, 0.064, oz]}><boxGeometry args={[w, 0.012, d]} /><meshStandardMaterial color={COL.gold} roughness={0.5} emissive={COL.glow} emissiveIntensity={0.15} /></mesh>
      ))}
      <mesh ref={plate} castShadow receiveShadow material={plateMat}><boxGeometry args={[0.5, 0.08, 0.5]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.07} material={poolMat}><planeGeometry args={[1.5, 1.5]} /></mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.12} material={ringMat}><ringGeometry args={[0.4, 0.44, 40]} /></mesh>
      <mesh position-y={BEAM_H / 2 + 0.06} material={beamMat} renderOrder={2}><cylinderGeometry args={[0.3, 0.5, BEAM_H, 20, 1, true]} /></mesh>
      <points ref={sparks} geometry={sparkGeo} material={sparkMat} frustumCulled={false} renderOrder={3} />
      <mesh ref={gem} material={gemMat}><octahedronGeometry args={[0.12, 0]} /></mesh>
    </group>
  )
}

/* ---- final portal: a large torii whose centre wakes up when the cube arrives ---- */
function Portal({ store }) {
  const G = useMemo(() => decorGeometries(), [])
  const g = useRef(), hex = useRef(), outer = useRef(), core = useRef(), halo = useRef(), pulse = useRef(), k = useRef({ a: 0.2, t0: -9, was: false, rot: 0, pid: 0 })
  const [x, , z] = wp(CELLS[PORTAL.at]) // the gate stands one tile beyond the final tile, its opening facing the cube
  const add = (color, map) => useMemo(() => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [])
  const mCore = add('#d9c4ff'), mHalo = add(COL.pink, soft()), mHex = add('#fff1cf'), mOut = add(COL.gold), mPulse = add('#ffd9f0')
  const gateMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }), [])
  const delay = T.tiles + PORTAL.at * 0.035 + 0.9
  useFrame((_, dtr) => {
    const S = store, dt = Math.min(dtr, 0.05), q = k.current, on = S.visited.has(PORTAL.id)
    const e = easeOut(clamp((S.t - delay) / 0.6))
    g.current.visible = e > 0; g.current.scale.setScalar(Math.max(e, 0.001))
    if (on && !q.was) q.t0 = S.t
    q.was = on
    q.a += ((on ? 1 : 0.2) - q.a) * (1 - Math.exp(-2.5 * dt))
    const w = 0.94 + 0.06 * Math.sin(S.t * 3), b = S.fx ? S.fx.boost : 0 // b: cinematic brightness 0..~1.2
    if (S.fx && S.fx.pulseId !== q.pid) { q.pid = S.fx.pulseId; q.t0 = S.t }
    mCore.opacity = Math.min(1, (0.2 + 0.55 * q.a + 0.3 * b) * w); mHalo.opacity = Math.min(1, 0.15 + 0.6 * q.a + 0.3 * b); mHex.opacity = Math.min(1, 0.35 + 0.55 * q.a + 0.1 * b); mOut.opacity = Math.min(1, 0.4 + 0.5 * q.a + 0.1 * b)
    halo.current.scale.setScalar(1 + 0.15 * q.a + 0.03 * Math.sin(S.t * 2) + 0.55 * b)
    q.rot += dt * (0.3 + 1.1 * q.a + 2.6 * b)
    hex.current.rotation.z = q.rot; outer.current.rotation.z = -S.t * 0.25 - 0.4 * q.rot
    const p = clamp((S.t - q.t0) / 1.6)
    pulse.current.scale.setScalar(0.6 + 1.6 * easeOut(p)); mPulse.opacity = 0.7 * (1 - p)
  })
  return (
    <group ref={g} position={[x, 0, z - 1]} visible={false}>
      <mesh geometry={G.portal} material={gateMat} castShadow receiveShadow />
      <group position={[0, 0.58, 0.03]}>
        <mesh ref={halo} material={mHalo}><planeGeometry args={[1.9, 1.9]} /></mesh>
        <mesh ref={core} material={mCore}><circleGeometry args={[0.46, 40]} /></mesh>
        <mesh ref={outer} material={mOut}><ringGeometry args={[0.46, 0.5, 48]} /></mesh>
        <mesh ref={hex} material={mHex}><ringGeometry args={[0.26, 0.31, 6]} /></mesh>
        <mesh ref={pulse} material={mPulse}><ringGeometry args={[0.46, 0.5, 48]} /></mesh>
      </group>
    </group>
  )
}

/* ---- portal cinematic particles: swirling motes around the gate (strength = fx.boost) + a fading glow trail behind the cube ---- */
const FX_N = LOW ? 22 : 40
function PortalFX({ store }) {
  const camera = useThree((s) => s.camera)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), n = FX_N + TRAIL_N
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.PointsMaterial({ map: soft(), vertexColors: true, size: 8, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const P = useMemo(() => Array.from({ length: FX_N }, (_, i) => ({ ph: hash(i, 31), sp: 0.3 + hash(i, 37) * 0.45, a0: hash(i, 41) * 6.283, z: (hash(i, 43) - 0.5) * 0.3, c: new THREE.Color([COL.pink, COL.gold, '#d9c4ff'][i % 3]) })), [])
  const white = useMemo(() => new THREE.Color('#fff4d8'), [])
  useFrame(() => {
    const S = store, fx = S.fx, b = fx ? Math.min(1, fx.boost) : 0, burst = fx ? fx.burst : 0, C = PORTAL_CORE
    const pos = geo.attributes.position, col = geo.attributes.color
    P.forEach((m, i) => {
      const u = (S.t * m.sp + m.ph) % 1, r = ((1 - u) * 1.1 + 0.12) * (1 + 2.6 * burst), a = m.a0 + S.t * (1 + 2.2 * b) + u * 4
      const f = Math.sin(Math.PI * u) * b * (1 - burst)
      pos.setXYZ(i, C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.9, C.z + 0.08 + m.z)
      col.setXYZ(i, m.c.r * f, m.c.g * f, m.c.b * f)
    })
    const tr = S.trail
    for (let k = 0; k < TRAIL_N; k++) {
      const age = tr ? S.t - tr.tt[k] : 9, f = Math.max(0, 1 - age / 0.55) * 0.9, j = FX_N + k
      if (tr) pos.setXYZ(j, tr.pos[k * 3], tr.pos[k * 3 + 1], tr.pos[k * 3 + 2]); else pos.setXYZ(j, 0, -9, 0)
      col.setXYZ(j, white.r * f, white.g * f, white.b * f)
    }
    pos.needsUpdate = col.needsUpdate = true
    mat.size = 0.11 * camera.zoom
  })
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />
}

/* ---- the cube: roll, hop, squash on landing, intro drop ---- */
function Cube({ store }) {
  const g = useRef(), m = useRef(), blob = useRef()
  const E = useMemo(() => new THREE.Euler(), []), Q = useMemo(() => new THREE.Quaternion(), [])
  useFrame((_, dtr) => {
    const S = store, p = S.pose, dt = Math.min(dtr, 0.05), fx = S.fx
    if (fx) { // portal cinematic (portal.js) drives the cube; ry/rx/rz are extra spin on top of the roll orientation
      g.current.visible = fx.vis; g.current.scale.set(fx.sx, fx.sy, fx.sz); g.current.position.set(fx.x, fx.y, fx.z)
      m.current.quaternion.setFromEuler(E.set(fx.rx, fx.ry, fx.rz)).multiply(p.quat)
      blob.current.visible = fx.vis && fx.shadow > 0.01; blob.current.position.set(fx.x, 0.1 + 0.012, fx.z); blob.current.material.opacity = 0.26 * fx.shadow
      return
    }
    const dp = clamp((S.t - T.drop) / 0.5)
    S.sq *= Math.exp(-10 * dt)
    const sy = 1 - 0.22 * S.sq + 0.06 * Math.sin(Math.PI * p.f), sxz = 1 + 0.1 * S.sq
    g.current.visible = S.t >= T.drop
    g.current.scale.set(sxz, sy, sxz)
    g.current.position.set(p.pos.x, p.lift + p.hop + (CUBE / 2) * sy + (1 - dp * dp) * 6, p.pos.z)
    m.current.quaternion.copy(p.quat)
    blob.current.visible = g.current.visible
    blob.current.position.set(p.pos.x, p.lift + 0.012, p.pos.z)
    blob.current.material.opacity = 0.26 * dp * (1 - p.hop * 3)
  })
  return (
    <>
      <group ref={g} visible={false}>
        <mesh ref={m} castShadow>
          <boxGeometry args={[CUBE, CUBE, CUBE]} />
          <meshStandardMaterial color={COL.cube} roughness={0.5} emissive="#7954c8" emissiveIntensity={0.2} />
        </mesh>
      </group>
      <mesh ref={blob} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.1, 1.1]} /><meshBasicMaterial map={soft()} color="#4c3470" transparent depthWrite={false} />
      </mesh>
    </>
  )
}

/* ---- landing dust / petals (pooled) ---- */
export function Dust({ store }) {
  const ref = useRef(), next = useRef(0)
  const P = useMemo(() => Array.from({ length: 40 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0 })), [])
  const d = useMemo(() => new THREE.Object3D(), [])
  const c = useMemo(() => new THREE.Color(), [])
  useFrame((_, dtr) => {
    const dt = Math.min(dtr, 0.05), im = ref.current
    while (store.events.length) {
      const e = store.events.pop()
      for (let n = 0; n < e.n; n++) {
        const i = next.current++ % P.length, a = Math.random() * 6.283, v = 0.4 + Math.random() * 1.1 * e.pw
        Object.assign(P[i], { life: 0.6 + Math.random() * 0.2, x: e.x, y: e.y + 0.05, z: e.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 1 + Math.random() * 1.6 * e.pw, s: 0.05 + Math.random() * 0.05 })
        im.setColorAt(i, c.set(e.gold ? (Math.random() < 0.55 ? COL.petal : COL.gold) : '#fff1e4'))
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true
    }
    P.forEach((p, i) => {
      if (p.life > 0) { p.life -= dt; p.vy -= 6 * dt; p.x += p.vx * dt; p.y = Math.max(0.02, p.y + p.vy * dt); p.z += p.vz * dt }
      d.position.set(p.x, p.y, p.z); d.scale.setScalar(p.life > 0 ? p.s * Math.min(1, p.life / 0.4) : 0.0001)
      d.updateMatrix(); im.setMatrixAt(i, d.matrix)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, 40]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}

/* ---- isometric camera: intro zoom, smooth follow, look-ahead, panel offset ---- */
function Rig({ store }) {
  const { camera, size } = useThree()
  const K = useRef({ look: new THREE.Vector3(), off: new THREE.Vector2(), init: false })
  const V = useMemo(() => { const f = new THREE.Vector3(-1, 0, -1).normalize(); return { f, r: new THREE.Vector3(-f.z, 0, f.x) } }, [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dtr) => {
    const dt = Math.min(dtr, 0.05), S = store, k = K.current
    const base = clamp(Math.min(size.width, size.height) / 8, 44, 92)
    const zi = easeIO(clamp((S.t - 0.2) / T.zoom))
    const zoom = base * (0.42 + 0.58 * zi) * (1 + 0.8 * (S.fx ? S.fx.camK : 0)) * (S.panelZoom ? 1.28 : 1)
    tmp.copy(S.pose.pos).lerp(S.ahead.pos, 0.4).setY(0).multiplyScalar(zi) // from level centre to the cube
    const ck = S.fx ? S.fx.camK : 0
    if (ck > 0) tmp.lerp(PORTAL_CORE, ck * 0.85) // portal cinematic: slide toward the gate
    const a = 1 - Math.exp(-5 * dt), wide = size.width >= 800
    k.off.x += ((S.panelOpen && S.panelPan && wide ? Math.min(720, size.width * 0.48) / 2 / zoom : 0) - k.off.x) * a
    k.off.y += ((S.panelOpen && S.panelPan && !wide ? (size.height * 0.29) / (0.577 * zoom) : 0) - k.off.y) * a
    tmp.addScaledVector(V.r, k.off.x).addScaledVector(V.f, -k.off.y)
    if (!k.init) { k.look.copy(tmp); k.init = true } else k.look.lerp(tmp, a)
    camera.position.set(k.look.x + 10, 10, k.look.z + 10)
    camera.lookAt(k.look)
    const zoomEase = 1 - Math.exp(-3.2 * dt)
    if (Math.abs(camera.zoom - zoom) > 0.01) { camera.zoom += (zoom - camera.zoom) * zoomEase; camera.updateProjectionMatrix() }
  })
  return null
}

// The intro's whole state lives in one store that App owns, so leaving for the Creative Dimension and coming back restores it as it was.
export const makeStore = () => ({
  ...newSimState(), t: matchMedia('(prefers-reduced-motion: reduce)').matches ? 6 : 0, pose: newPose(), ahead: newPose(), panelOpen: false, panelZoom: false, panelPan: false, fx: null, seq: null, trail: null,
})

export default function World({ api, cb, panelOpen, panelZoom, panelPan, store }) {
  store.panelOpen = panelOpen
  store.panelZoom = panelOpen && panelZoom
  store.panelPan = panelOpen && panelPan
  return (
    <>
      {/* golden-hour light (tune in grade.js): soft gold sun, warm cream sky bounce and warm rose-mauve ground bounce that fills the shadows */}
      <hemisphereLight args={[LIGHT.hemi.sky, LIGHT.hemi.ground, LIGHT.hemi.intensity]} />
      <directionalLight position={LIGHT.sun.position} intensity={LIGHT.sun.intensity} color={LIGHT.sun.color} castShadow
        shadow-mapSize={LOW ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={60} />
      <Sim store={store} api={api} cb={cb} />
      <Platforms store={store} />
      <Islands store={store} />
      <Decor store={store} />
      <Bloom store={store} />
      {CHECKPOINTS.map((cp) => <Marker key={cp.id} cp={cp} store={store} />)}
      <Portal store={store} />
      <PortalFX store={store} />
      <Cube store={store} />
      <Dust store={store} />
      <Rig store={store} />
      <Clouds store={store} />
    </>
  )
}
