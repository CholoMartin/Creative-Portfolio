// Creative Dimension: a floating hub with the cube on a central platform and five themed destination islands.
// Everything animated here reads/writes one mutable store (K) inside <Hub>; React state only carries selection (V) and callbacks (cb).
import { useRef, useMemo, useLayoutEffect, useEffect, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { decorGeometries } from './decor'
import Clouds from './Clouds'
import { LOW, Dust, soft, clamp, easeOut, hash, STONE, stoneTex, tileGeo, beamMaterial } from './World'
import { CATS } from './hubData'

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const lerp = (a, b, t) => a + (b - a) * t
const PAD_TOP = 0.19   // top of every island pad (local to the island)
const CENTER_TOP = 0.2 // top of the central platform
const CUBE_S = 0.7     // the hub cube is a touch bigger than the intro's so it reads as the hero
const GROUND_R = 3.25  // radius of the main stone ground
const R_ = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2), F_ = new THREE.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2) // screen right / screen-up (ground) for the iso camera
const uv = (u, v, out = new THREE.Vector3()) => out.set((u - v) * Math.SQRT1_2, 0, -(u + v) * Math.SQRT1_2)
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d }

// ---- travel timeline (seconds) ----
const GO = { anti: 0.16, h1: 0.5, land: 0.58, h2: 1.1, arrive: 1.6 }
const BACK = { anti: 0.14, h1: 0.56, land: 0.64, h2: 1.04 }

/* ---------- tiny shared helpers (geometries / materials / textures are created once) ---------- */
const GEO = {}
const geo = (k, f) => (GEO[k] ||= f())
const boxG = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1))
const cylG = (seg = 14) => geo('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg))
const MATS = {}
const mat = (c, o = {}) => (MATS[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, flatShading: true, ...o }))
const basic = (c, o = {}) => (MATS['b' + c + JSON.stringify(o)] ||= new THREE.MeshBasicMaterial({ color: c, ...o }))
const TEX = {}
function tex(key, w, h, draw) {
  if (TEX[key]) return TEX[key]
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return (TEX[key] = t)
}
const grad = (g, w, h, stops, vertical = true) => { const l = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, h); stops.forEach(([o, c]) => l.addColorStop(o, c)); g.fillStyle = l; g.fillRect(0, 0, w, h) }
const tri = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill() }
const playTri = (g, cx, cy, s, col = '#fff') => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - s * 0.7, cy - s); g.lineTo(cx + s * 1.1, cy); g.lineTo(cx - s * 0.7, cy + s); g.closePath(); g.fill() }

const TEXTURES = {
  art1: () => tex('art1', 170, 124, (g, w, h) => { grad(g, w, h, [[0, '#7ee8e0'], [0.6, '#ffd0e8'], [1, '#ffe9c0']]); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(120, 38, 16, 0, 7); g.fill(); tri(g, [[0, 104], [50, 48], [100, 104]], '#7a63d6'); tri(g, [[60, 108], [112, 62], [170, 108]], '#9a85ea'); g.fillStyle = '#59c27a'; g.fillRect(0, 100, w, 24); g.fillStyle = '#fff'; g.fillRect(18, 22, 30, 7); g.fillRect(28, 15, 20, 7) }),
  art2: () => tex('art2', 100, 124, (g, w, h) => { grad(g, w, h, [[0, '#ffb3cf'], [1, '#c8a8ff']]); [['#fff3d9', 36, 40, 24], ['#7fd3ff', 66, 78, 20], ['#ffd27a', 34, 92, 12]].forEach(([c, x, y, r]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() }) }),
  art3: () => tex('art3', 100, 124, (g, w, h) => { grad(g, w, h, [[0, '#2b2540'], [1, '#6a4ea8']]); tri(g, [[10, 110], [50, 30], [90, 110]], '#ff9ad0'); tri(g, [[30, 110], [50, 62], [70, 110]], '#ffe08a'); g.fillStyle = '#67e8d9'; g.fillRect(0, 108, w, 16) }),
  screen: () => tex('screen', 224, 140, (g, w, h) => { grad(g, w, h, [[0, '#5b7cff'], [0.55, '#b36bff'], [1, '#ff8fbd']], false); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 108, w, 32); g.fillStyle = '#ffd98a'; g.fillRect(14, 120, 120, 6); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(112, 62, 34, 0, 7); g.fill(); playTri(g, 112, 62, 17) }),
  screen2: () => tex('screen2', 160, 110, (g, w, h) => { grad(g, w, h, [[0, '#ffb347'], [1, '#ff5d8f']], false); g.fillStyle = '#fff3d9'; g.beginPath(); g.arc(50, 56, 26, 0, 7); g.fill(); g.fillStyle = '#2b2540'; g.fillRect(92, 30, 52, 12); g.fillRect(92, 50, 40, 8); g.fillStyle = '#ff4b4b'; g.fillRect(104, 76, 44, 22); playTri(g, 126, 87, 6) }),
  screen3: () => tex('screen3', 160, 110, (g, w, h) => { grad(g, w, h, [[0, '#2b2540'], [1, '#4b3a7a']]); g.fillStyle = '#7fd3ff'; g.fillRect(12, 14, 136, 52); g.fillStyle = '#ffd98a'; g.fillRect(12, 76, 80, 8); g.fillStyle = '#ff9ad0'; g.fillRect(12, 90, 52, 8); playTri(g, 80, 40, 12) }),
  poster1: () => tex('poster1', 112, 152, (g, w, h) => { g.fillStyle = '#fff3d9'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a9a'; g.fillRect(0, 0, w, 62); g.fillStyle = '#fff'; g.fillRect(12, 14, 70, 12); g.fillRect(12, 32, 48, 9); g.fillStyle = '#7a63d6'; g.beginPath(); g.arc(78, 100, 22, 0, 7); g.fill(); g.fillStyle = '#2b2540'; for (let i = 0; i < 4; i++) g.fillRect(12, 84 + i * 12, 44, 5); g.fillStyle = '#ffc857'; g.fillRect(12, 136, 88, 8) }),
  poster2: () => tex('poster2', 112, 152, (g, w, h) => { grad(g, w, h, [[0, '#7fd3ff'], [1, '#c8a8ff']]); g.fillStyle = '#fff'; g.fillRect(10, 14, 92, 10); g.fillRect(10, 30, 60, 10); g.fillStyle = '#ffd98a'; g.fillRect(10, 56, 92, 62); g.fillStyle = '#2b2540'; g.fillRect(18, 66, 50, 6); g.fillRect(18, 78, 70, 6); g.fillRect(18, 90, 40, 6) }),
  type: () => tex('type', 112, 152, (g, w, h) => { g.fillStyle = '#2b2540'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffc857'; g.font = '800 78px Georgia, serif'; g.textBaseline = 'middle'; g.fillText('Aa', 8, 60); g.fillStyle = '#ff9ad0'; g.fillRect(10, 112, 60, 6); g.fillStyle = '#fff'; g.fillRect(10, 124, 90, 5); g.fillRect(10, 134, 70, 5) }),
  holo: () => tex('holo', 64, 88, (g, w, h) => { grad(g, w, h, [[0, '#7df3ff'], [0.35, '#b79cff'], [0.7, '#ff9ad0'], [1, '#ffe08a']], false); g.fillStyle = 'rgba(255,255,255,.35)'; tri(g, [[32, 14], [52, 44], [32, 74], [12, 44]], 'rgba(255,255,255,.4)'); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8) }),
}
const useTex = (k) => useMemo(TEXTURES[k], [])
const shot = (k) => useMemo(() => new THREE.MeshBasicMaterial({ map: TEXTURES[k]() }), [])

const Bx = ({ p = [0, 0, 0], s = [1, 1, 1], c = '#fff', o, r = [0, 0, 0], cast }) => <mesh geometry={boxG()} material={mat(c, o)} position={p} scale={s} rotation={r} castShadow={cast} />
const Cy = ({ p = [0, 0, 0], r = 0.5, h = 1, c = '#fff', o, rot = [0, 0, 0], seg = 14, cast }) => <mesh geometry={cylG(seg)} material={mat(c, o)} position={p} scale={[r, h, r]} rotation={rot} castShadow={cast} />
function Float({ p = [0, 0, 0], amp = 0.06, sp = 1, ph = 0, spin = 0, rotY = 0, children }) {
  const g = useRef()
  useFrame(({ clock }) => { const t = clock.elapsedTime; g.current.position.y = p[1] + Math.sin(t * sp + ph) * amp; g.current.rotation.y = rotY + (spin ? t * spin + ph : Math.sin(t * 0.6 + ph) * 0.12) })
  return <group ref={g} position={p} rotation-y={rotY}>{children}</group>
}
function Orbit({ r = 0.9, sp = 0.5, ph = 0, y = 0, children }) {
  const g = useRef()
  useFrame(({ clock }) => { const t = clock.elapsedTime; g.current.rotation.y = t * sp + ph; g.current.position.y = y + Math.sin(t * 1.3 + ph * 2) * 0.05 })
  return <group ref={g} position-y={y}><group position={[r, 0, 0]} rotation-y={Math.PI / 2}>{children}</group></group>
}
const Frame = ({ w = 0.5, h = 0.62, tk, edge = '#ffd27a' }) => {
  const m = shot(tk)
  return <group><Bx s={[w, h, 0.05]} c={edge} cast /><mesh position={[0, 0, 0.03]} material={m}><planeGeometry args={[w - 0.08, h - 0.08]} /></mesh></group>
}

/* ---------- the five destination props (local origin = centre of the pad top) ---------- */
function EcomProps() {
  const bag = useMemo(() => new THREE.TorusGeometry(0.15, 0.028, 6, 12, Math.PI), [])
  return (
    <group>
      <group position={[-0.78, 0, -0.74]} rotation-y={Math.PI / 4}>
        <Bx p={[0, 0.58, 0]} s={[1.4, 1.1, 0.06]} c="#efe3ff" cast />
        {[0.34, 0.74].map((y) => <Bx key={y} p={[0, y, 0.1]} s={[1.28, 0.04, 0.2]} c="#dba76d" />)}
        <Bx p={[-0.42, 0.42, 0.1]} s={[0.18, 0.16, 0.12]} c="#ff9ad0" /><Cy p={[-0.1, 0.46, 0.1]} r={0.07} h={0.24} c="#7dd3ff" /><Bx p={[0.26, 0.42, 0.1]} s={[0.2, 0.16, 0.12]} c="#ffd27a" />
        <Bx p={[-0.38, 0.83, 0.1]} s={[0.18, 0.18, 0.12]} c="#c8a8ff" /><Cy p={[0, 0.86, 0.1]} r={0.08} h={0.22} c="#ffd98a" /><Bx p={[0.38, 0.82, 0.1]} s={[0.2, 0.16, 0.12]} c="#5ab0ff" />
      </group>
      <Cy p={[0.66, 0.12, 0.5]} r={0.4} h={0.24} c="#fff3ec" seg={10} cast />
      <Float p={[0.66, 0.5, 0.5]} amp={0.04} spin={0.5}><Bx s={[0.3, 0.3, 0.3]} c="#ff7a9a" cast /><Bx s={[0.07, 0.31, 0.31]} c="#ffd27a" /><Bx s={[0.31, 0.31, 0.07]} c="#ffd27a" /></Float>
      <Float p={[-0.1, 0.62, 0.14]} amp={0.05} spin={0.55}>
        <Bx s={[0.64, 0.74, 0.34]} c="#3d8bff" cast /><Bx p={[0, -0.2, 0]} s={[0.645, 0.12, 0.345]} c="#7fb8ff" />
        <mesh geometry={bag} material={mat('#2f6fe0')} position={[0, 0.36, 0.1]} /><mesh geometry={bag} material={mat('#2f6fe0')} position={[0, 0.36, -0.1]} />
        <Bx p={[0.34, 0.12, 0.19]} s={[0.17, 0.24, 0.03]} c="#ffd27a" r={[0, 0, 0.3]} o={{ emissive: '#ffb347', emissiveIntensity: 0.4 }} />
      </Float>
      <group position={[0.88, 0, -0.5]}>
        <Bx p={[0, 0.19, 0]} s={[0.52, 0.38, 0.46]} c="#e9b98a" r={[0, 0.3, 0]} cast /><Bx p={[0, 0.2, 0]} s={[0.12, 0.39, 0.47]} c="#fff1d0" r={[0, 0.3, 0]} />
        <Bx p={[0.06, 0.53, 0]} s={[0.34, 0.3, 0.34]} c="#f7d8ff" r={[0, 0.7, 0]} cast />
      </group>
    </group>
  )
}
function IllusProps({ G }) {
  const dab = ['#ff7a9a', '#ffd27a', '#7fd3ff', '#8be07a']
  return (
    <group>
      <group position={[-0.12, 0, -0.28]} rotation-y={Math.PI / 4}>
        <Bx p={[-0.44, 0.56, -0.02]} s={[0.05, 1.15, 0.05]} c="#bb7c4c" r={[0, 0, 0.1]} /><Bx p={[0.44, 0.56, -0.02]} s={[0.05, 1.15, 0.05]} c="#bb7c4c" r={[0, 0, -0.1]} /><Bx p={[0, 0.56, -0.36]} s={[0.05, 1.15, 0.05]} c="#8e5a34" r={[0.3, 0, 0]} />
        <Bx p={[0, 0.34, 0.06]} s={[1.05, 0.05, 0.14]} c="#dba76d" />
        <group position={[0, 0.88, 0.04]}><Frame w={1.0} h={0.76} tk="art1" edge="#c98b57" /></group>
      </group>
      <Float p={[0.9, 1.15, 0.28]} amp={0.08} ph={1} rotY={Math.PI / 4}><Frame w={0.48} h={0.6} tk="art2" /></Float>
      <Float p={[-0.92, 0.98, 0.58]} amp={0.07} ph={2.4} rotY={Math.PI / 4}><Frame w={0.4} h={0.5} tk="art3" edge="#ff9ad0" /></Float>
      <group position={[0.72, 0, 0.62]} rotation-y={0.5}>
        <Cy p={[0, 0.03, 0]} r={0.3} h={0.06} c="#fff3d9" seg={10} />
        {dab.map((c, i) => <Cy key={c} p={[Math.cos(i * 1.6) * 0.15, 0.08, Math.sin(i * 1.6) * 0.15]} r={0.07} h={0.05} c={c} o={{ emissive: c, emissiveIntensity: 0.25 }} seg={8} />)}
      </group>
      <mesh geometry={G.shrub} material={useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }), [])} position={[-0.95, 0, 0.5]} scale={1.2} />
    </group>
  )
}
function ThumbProps() {
  const screen = shot('screen'), s2 = shot('screen2'), s3 = shot('screen3')
  return (
    <group>
      <Bx p={[0.5, 0.5, -0.78]} s={[0.55, 0.4, 0.08]} c="#ffb347" r={[0, Math.PI / 4 + 0.2, 0]} cast /><Bx p={[0.78, 0.46, -0.52]} s={[0.46, 0.34, 0.08]} c="#ff9a4a" r={[0, Math.PI / 4 - 0.1, 0]} />
      <group position={[0, 0, -0.1]} rotation-y={Math.PI / 4}>
        <Cy p={[0, 0.05, 0]} r={0.34} h={0.1} c="#4a4066" seg={12} cast /><Bx p={[0, 0.32, -0.04]} s={[0.12, 0.52, 0.08]} c="#4a4066" />
        <Bx p={[0, 0.95, 0]} s={[1.3, 0.84, 0.1]} c="#2b2540" cast />
        <mesh position={[0, 0.95, 0.056]} material={screen}><planeGeometry args={[1.16, 0.72]} /></mesh>
        <mesh position={[-0.55, 1.3, 0.07]} material={basic('#ff4b4b')}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
      </group>
      <Float p={[-0.92, 0.82, 0.5]} amp={0.07} ph={0.5} rotY={Math.PI / 4}><Bx s={[0.58, 0.4, 0.05]} c="#2b2540" /><mesh position={[0, 0, 0.03]} material={s2}><planeGeometry args={[0.5, 0.33]} /></mesh></Float>
      <Float p={[0.95, 1.08, 0.42]} amp={0.08} ph={2} rotY={Math.PI / 4}><Bx s={[0.5, 0.36, 0.05]} c="#2b2540" /><mesh position={[0, 0, 0.03]} material={s3}><planeGeometry args={[0.43, 0.3]} /></mesh></Float>
      <group position={[-0.95, 0, -0.42]}>
        <Cy p={[0, 0.5, 0]} r={0.03} h={1} c="#4a4066" seg={6} /><Cy p={[0, 0.03, 0]} r={0.2} h={0.06} c="#4a4066" seg={8} />
        <Bx p={[0, 1.06, 0]} s={[0.42, 0.42, 0.1]} c="#fff6d8" o={{ emissive: '#ffe9a8', emissiveIntensity: 0.9 }} r={[0, Math.PI / 4, 0]} />
      </group>
      <group position={[0.62, 0.12, 0.66]} rotation-y={0.5}>
        <Bx s={[0.52, 0.22, 0.36]} c="#2b2540" cast /><Bx p={[0, 0.17, 0]} s={[0.52, 0.07, 0.36]} c="#fff" r={[0, 0, 0.22]} />
        {[-0.18, 0, 0.18].map((x) => <Bx key={x} p={[x, 0.17, 0]} s={[0.07, 0.075, 0.37]} c="#2b2540" r={[0, 0, 0.22]} />)}
      </group>
    </group>
  )
}
const Poster = ({ m, w, h }) => <group><Bx s={[w + 0.04, h + 0.04, 0.03]} c="#fff" cast /><mesh position={[0, 0, 0.02]} material={m}><planeGeometry args={[w, h]} /></mesh></group>
function LayoutProps() {
  const p1 = shot('poster1'), p2 = shot('poster2'), tp = shot('type')
  return (
    <group>
      <group position={[-0.52, 0, 0.5]} rotation-y={0.5}>
        {[['#fff3d9', 0.03, 0], ['#ffb3cf', 0.075, 0.12], ['#c8a8ff', 0.12, -0.1]].map(([c, y, r]) => <Bx key={c} p={[0, y, 0]} s={[0.72, 0.045, 0.96]} c={c} r={[0, r, 0]} cast />)}
        <Bx p={[-0.12, 0.15, -0.14]} s={[0.3, 0.012, 0.2]} c="#ffb25a" /><Bx p={[0.17, 0.15, 0.14]} s={[0.2, 0.012, 0.3]} c="#7fb8ff" />
        {[0, 1, 2].map((i) => <Bx key={i} p={[-0.1, 0.15, 0.1 + i * 0.07]} s={[0.3, 0.012, 0.03]} c="#2b2540" />)}
      </group>
      <Float p={[0.12, 1.0, -0.2]} amp={0.07} ph={0.3} rotY={Math.PI / 4}><Poster m={p1} w={0.72} h={0.98} /></Float>
      <Float p={[0.92, 0.82, 0.28]} amp={0.06} ph={1.6} rotY={Math.PI / 4 - 0.1}><Poster m={p2} w={0.52} h={0.72} /></Float>
      <Float p={[-0.95, 1.05, -0.28]} amp={0.08} ph={3} rotY={Math.PI / 4 + 0.15}><Poster m={tp} w={0.55} h={0.75} /></Float>
      <group position={[0.5, 0.06, 0.78]} rotation-y={0.4}>
        {['#ff7a9a', '#ffc857', '#67e8d9', '#7fb8ff', '#c58cff'].map((c, i) => <Bx key={c} p={[i * 0.13 - 0.26, 0, 0]} s={[0.12, 0.1, 0.34]} c={c} />)}
      </group>
    </group>
  )
}
function NftProps() {
  const holo = shot('holo')
  const ring = useMemo(() => new THREE.TorusGeometry(0.78, 0.016, 6, 40), [])
  const octa = useMemo(() => new THREE.OctahedronGeometry(1, 0), [])
  return (
    <group>
      <Cy p={[0, 0.11, 0]} r={0.56} h={0.22} c="#4d4470" seg={6} cast />
      <mesh rotation-x={-Math.PI / 2} position-y={0.235} material={basic('#7df3ff')}><ringGeometry args={[0.36, 0.42, 6]} /></mesh>
      <Float p={[0, 1.08, 0]} amp={0.09} spin={0.9}>
        <mesh geometry={octa} scale={[0.4, 0.78, 0.4]} material={mat('#a78bff', { emissive: '#7b5cff', emissiveIntensity: 0.75, roughness: 0.15 })} castShadow />
        <mesh geometry={octa} scale={[0.2, 0.42, 0.2]} material={mat('#efe6ff', { emissive: '#d9c8ff', emissiveIntensity: 1 })} />
      </Float>
      <sprite position={[0, 1.08, 0]} scale={[2.0, 2.0, 1]}><spriteMaterial map={soft()} color="#a78bff" transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
      {[0, 2.1, 4.2].map((ph, i) => <Orbit key={i} r={0.98} sp={0.5} ph={ph} y={0.9 + i * 0.12}><Bx s={[0.4, 0.56, 0.02]} c="#fff" /><mesh position={[0, 0, 0.013]} material={holo}><planeGeometry args={[0.36, 0.52]} /></mesh></Orbit>)}
      {[0.4, 1.7, 3.0, 4.6].map((ph, i) => <Orbit key={'s' + i} r={0.62 + (i % 2) * 0.22} sp={-0.8} ph={ph} y={0.5 + i * 0.28}><mesh geometry={octa} scale={0.07} material={mat('#7df3ff', { emissive: '#7df3ff', emissiveIntensity: 0.9 })} /></Orbit>)}
      <Float p={[0, 1.05, 0]} amp={0.03} spin={0.35}><mesh geometry={ring} rotation-x={Math.PI / 2.4} material={basic('#7df3ff', { transparent: true, opacity: 0.7 })} /></Float>
    </group>
  )
}
const PROPS = { ecommerce: EcomProps, illustration: IllusProps, thumbnails: ThumbProps, layouts: LayoutProps, nft: NftProps }
const TREES = { ecommerce: ['sakura', [-1.0, 0, 0.55], 1.25], illustration: ['sakura', [0.85, 0, -0.9], 1.1], thumbnails: ['pine', [-1.0, 0, 0.55], 1.2], layouts: ['sakura', [0.95, 0, -0.7], 1.15], nft: ['stoneLantern', [-0.95, 0, 0.6], 1.3] }

/* ---------- a destination island: rock, pad, glow ring, beam, hit area, props ---------- */
const decorMat = () => (MATS.decor ||= new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }))
function Island({ i, K, V, cb, labels }) {
  const cat = CATS[i], Props = PROPS[cat.id], G = decorGeometries()
  const g = useRef(), ring = useRef(), glow = useRef(), beam = useRef(), pulse = useRef(), lift = useRef()
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: cat.color, transparent: true, opacity: 0.95 }), [])
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: cat.color, map: soft(), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const pulseMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [])
  const beamMat = useMemo(() => { const m = beamMaterial(); m.uniforms.uColor.value.set(cat.color); return m }, [])
  const col = useMemo(() => new THREE.Color(), [])
  const h = hash(i, 77)
  const [tree, tp, ts] = TREES[cat.id]
  useFrame(({ clock }, dtr) => {
    const dt = Math.min(dtr, 0.05), t = clock.elapsedTime
    const v = V.current, target = v.hover === i ? 1 : v.sel === i ? 0.8 : 0
    K.hl[i] += (target - K.hl[i]) * (1 - Math.exp(-9 * dt))
    const hl = K.hl[i], rise = K.rise[i]
    const off = Math.sin(t * 0.8 + i * 1.3) * 0.06 + 0.1 * hl - (1 - rise) * 6
    K.off[i] = off
    g.current.position.set(K.pos[i].x, off, K.pos[i].z); g.current.visible = rise > 0.001
    lift.current.scale.setScalar(1 + 0.04 * hl)
    ringMat.color.set(cat.color).lerp(col.set('#ffffff'), 0.1 + 0.4 * hl).multiplyScalar(0.8 + 0.5 * hl + 0.25 * K.flash[i])
    glowMat.opacity = 0.18 + 0.4 * hl + 0.35 * K.flash[i]
    beamMat.uniforms.uOpacity.value = 0.06 + 0.5 * hl + 0.4 * K.flash[i]
    ring.current.rotation.z = t * (0.2 + 0.3 * hl)
    K.flash[i] = Math.max(0, K.flash[i] - dt * 1.8)
    const p = 1 - K.flash[i]; pulse.current.scale.setScalar(0.8 + 1.4 * easeOut(p)); pulseMat.opacity = 0.7 * K.flash[i]
  })
  return (
    <group ref={g} visible={false}>
      <group ref={lift}>
        <mesh geometry={G.islandRock} position={[0, 0, 0]} scale={[1.44, 2.1 + h * 1.3, 1.44]} material={decorMat()} rotation-y={h * 6} />
        <Cy p={[0, 0.07, 0]} r={1.42} h={0.14} c={STONE.side} seg={7} cast />
        <Cy p={[0, 0.165, 0]} r={1.32} h={0.05} c={STONE.top} seg={7} />
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.2} material={ringMat}><ringGeometry args={[0.92, 1.0, 40]} /></mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.201} material={glowMat} ref={glow}><planeGeometry args={[2.6, 2.6]} /></mesh>
        <mesh ref={pulse} rotation-x={-Math.PI / 2} position-y={0.22} material={pulseMat}><ringGeometry args={[0.9, 0.97, 40]} /></mesh>
        <mesh ref={beam} position-y={1.35} material={beamMat} renderOrder={2}><cylinderGeometry args={[0.75, 1.0, 2.3, 20, 1, true]} /></mesh>
        <mesh geometry={G[tree]} material={decorMat()} position={[tp[0], PAD_TOP, tp[2]]} scale={ts} castShadow />
        <group position-y={PAD_TOP}><Props G={G} /></group>
      </group>
      {/* generous invisible hit area: hover / click / tap */}
      <mesh position-y={1.1}
        onPointerOver={(e) => { e.stopPropagation(); if (e.nativeEvent?.pointerType !== 'touch') { document.body.style.cursor = 'pointer'; cb.current.onHover(i) } }}
        onPointerOut={() => { document.body.style.cursor = ''; cb.current.onHoverEnd(i) }}
        onClick={(e) => { e.stopPropagation(); cb.current.onPick(i, e.nativeEvent?.pointerType) }}>
        <cylinderGeometry args={[1.7, 1.7, 2.6, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ---------- ground: stone tiles, central platform, trees ---------- */
const GROUND_DECOR = [ // [type, u, v, scale] in screen-aligned ground coordinates (u = right, v = away from camera)
  ['sakura', -2.5, -1.7, 1.5], ['sakura', 2.4, -1.8, 1.5], ['pine', -2.9, 1.3, 1.3], ['stoneLantern', -1.9, -0.9, 1.6], ['stoneLantern', 1.9, -1.0, 1.6],
  ['shrub', 2.7, 1.2, 1.3], ['bamboo', 1.4, 2.7, 1.3], ['mossRock', -1.2, 2.6, 1.4], ['tuft', 0.9, -2.5, 1.3], ['tuft', -0.7, -2.7, 1.3], ['tuft', 2.9, -0.2, 1.2], ['tuft', -3.0, -0.2, 1.2],
]
function Ground({ K, V }) {
  const g = useRef(), tiles = useRef(), plat = useRef(), runes = useRef()
  const G = decorGeometries()
  const cells = useMemo(() => { const out = []; for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= GROUND_R * GROUND_R * (0.9 + hash(x, z) * 0.18)) out.push([x, z]); return out }, [])
  const tg = useMemo(() => tileGeo(), [])
  const tm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map: stoneTex(), roughness: 0.96, flatShading: true }), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffc857', transparent: true, opacity: 0.95 }), [])
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcf7a', map: soft(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  useLayoutEffect(() => {
    const d = new THREE.Object3D(), c = new THREE.Color()
    cells.forEach(([x, z], i) => { d.position.set(x, -0.45, z); d.updateMatrix(); tiles.current.setMatrixAt(i, d.matrix); tiles.current.setColorAt(i, c.setScalar(0.98 + hash(x, z) * 0.04)) })
    tiles.current.instanceMatrix.needsUpdate = tiles.current.instanceColor.needsUpdate = true
  }, [])
  useFrame(({ clock }) => {
    const e = easeOut(clamp(K.t / 0.9)), t = clock.elapsedTime
    g.current.position.y = -(1 - e) * 5; g.current.visible = e > 0.001
    ringMat.opacity = 0.7 + 0.25 * Math.sin(t * 2); poolMat.opacity = 0.28 + 0.1 * Math.sin(t * 2)
    runes.current.rotation.z = t * 0.15
  })
  const dm = decorMat()
  return (
    <group ref={g}>
      <instancedMesh ref={tiles} args={[tg, tm, cells.length]} castShadow receiveShadow frustumCulled={false} />
      <mesh geometry={G.islandRock} position={[0, -0.9, 0]} scale={[3.45, 4.4, 3.45]} material={dm} />
      {/* central platform: two stone steps, a glowing gold ring and a slow rune ring */}
      <group ref={plat}>
        <Cy p={[0, 0.07, 0]} r={1.7} h={0.14} c="#c4b595" seg={14} cast /><Cy p={[0, 0.16, 0]} r={1.38} h={0.08} c="#d6c9ae" seg={14} cast />
        <mesh rotation-x={-Math.PI / 2} position-y={0.205} material={ringMat}><ringGeometry args={[0.96, 1.04, 48]} /></mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.203} material={poolMat}><planeGeometry args={[3.4, 3.4]} /></mesh>
        <group ref={runes} rotation-x={-Math.PI / 2} position-y={0.207}>{Array.from({ length: 10 }, (_, k) => <mesh key={k} position={[Math.cos(k * 0.628) * 1.22, Math.sin(k * 0.628) * 1.22, 0]} material={basic('#ffe08a')}><circleGeometry args={[0.035, 6]} /></mesh>)}</group>
      </group>
      {GROUND_DECOR.map(([type, u, v, s], k) => { const p = uv(u, v); return <mesh key={k} geometry={G[type]} material={dm} position={[p.x, 0, p.z]} rotation-y={hash(k, 3) * 6.28} scale={s} castShadow receiveShadow /> })}
    </group>
  )
}
/* ---------- far-off decorative islands (reference: pagoda, sakura, a glowing torii) ---------- */
const FAR_UV = [[-10.5, 3.5, 'pagoda', 1.5], [-9, -3.2, 'sakura', 1.2], [10, 4.4, 'shrine', 1.4], [9.6, -2.2, 'torii', 1.3], [-4.5, 11, 'sakura', 1.4], [5, 10.5, 'pagoda', 1.5], [-13, 8, 'sakura', 1.2], [13.5, 9.5, 'sakura', 1.3], [0, 14, 'shrine', 1.4]]
function FarIslands({ K }) {
  const g = useRef(), G = decorGeometries(), dm = decorMat()
  const portalMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9ad0', map: soft(), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const items = useMemo(() => (LOW ? FAR_UV.slice(0, 6) : FAR_UV).map(([u, v, type, r], i) => ({ p: uv(u, v), type, r, y: -2 - hash(i, 4) * 2.5, i })), [])
  useFrame(({ clock }) => { const e = easeOut(clamp((K.t - 0.3) / 1.6)); g.current.visible = e > 0.001; g.current.position.y = -(1 - e) * 7 + Math.sin(clock.elapsedTime * 0.5) * 0.12 })
  return (
    <group ref={g}>
      {items.map((o) => (
        <group key={o.i} position={[o.p.x, o.y, o.p.z]}>
          <mesh geometry={G.islandRock} position-y={-0.15} scale={[o.r, 2.2 + hash(o.i, 3) * 1.6, o.r]} material={dm} rotation-y={hash(o.i, 9) * 6} />
          <Cy p={[0, -0.07, 0]} r={o.r * 1.04} h={0.3} c="#cfe0bd" seg={7} />
          <mesh geometry={G[o.type === 'torii' ? 'portal' : o.type]} material={dm} position-y={0.08} scale={o.type === 'torii' ? 0.9 : 1.5} rotation-y={o.type === 'torii' ? -0.6 : hash(o.i, 5) * 6.28} />
          {o.type === 'torii' && <mesh position={[0.1, 0.62, 0.05]} rotation-y={-0.6} material={portalMat}><planeGeometry args={[1.5, 1.5]} /></mesh>}
        </group>
      ))}
    </group>
  )
}

/* ---------- drifting gold motes ---------- */
function Motes({ K }) {
  const camera = useThree((s) => s.camera), N = LOW ? 16 : 34
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); return g }, [])
  const mat = useMemo(() => new THREE.PointsMaterial({ map: soft(), vertexColors: true, size: 6, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const P = useMemo(() => Array.from({ length: N }, (_, i) => ({ x: (hash(i, 1) - 0.5) * 14, z: (hash(i, 2) - 0.5) * 12, ph: hash(i, 3), sp: 0.04 + hash(i, 4) * 0.05, w: hash(i, 5) * 6 })), [])
  const gold = useMemo(() => new THREE.Color('#ffe08a'), [])
  useFrame(() => {
    const pos = geo.attributes.position, col = geo.attributes.color, t = K.t
    P.forEach((m, i) => { const u = (t * m.sp + m.ph) % 1, f = Math.sin(Math.PI * u) * 0.8; pos.setXYZ(i, m.x + Math.sin(t * 0.4 + m.w) * 0.4, 0.3 + u * 4.5, m.z); col.setXYZ(i, gold.r * f, gold.g * f, gold.b * f) })
    pos.needsUpdate = col.needsUpdate = true; mat.size = 0.07 * camera.zoom
  })
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />
}

/* ---------- the cube: idle float, looks at the hovered island, hops to an island, spins on arrival ---------- */
const FACE = true // two small eyes so the cube's facing direction reads (hub only; remove to keep the plain cube)
function HubCube({ K, V, cb }) {
  const g = useRef(), m = useRef(), eyes = useRef(), blob = useRef()
  const dir = useMemo(() => new THREE.Vector3(), []), M = useMemo(() => new THREE.Vector3(), []), I = useMemo(() => new THREE.Vector3(), []), ZERO = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dtr) => {
    const dt = Math.min(dtr, 0.05), c = K.cube, v = V.current, t = clock.elapsedTime
    let x = 0, z = 0, base = CENTER_TOP, hop = 0, sy = 1, sxz = 1, yawT = c.yaw, spin = 0, floatK = 0, offBlend = 0
    const idx = K.idx, P = K.pos[idx]
    if (K.mode === 'idle') {
      floatK = 1
      const face = v.hover ?? v.sel, p = K.pos[face]
      yawT = Math.atan2(p.x, p.z) + 0.08 * Math.sin(t * 0.9)
    } else if (K.mode === 'island') {
      x = P.x; z = P.z; base = PAD_TOP; offBlend = 1; floatK = 1; yawT = Math.PI / 4
    } else if (K.mode === 'out' || K.mode === 'back') {
      const out = K.mode === 'out', T = out ? GO : BACK
      K.mt += dt
      const mt = K.mt, D = Math.hypot(P.x, P.z); dir.set(P.x, 0, P.z).normalize(); M.copy(dir).multiplyScalar(Math.min(D * 0.5, GROUND_R - 0.3))
      yawT = Math.atan2(out ? dir.x : -dir.x, out ? dir.z : -dir.z)
      const A = out ? ZERO : I.set(P.x, 0, P.z), B = out ? I.set(P.x, 0, P.z) : ZERO
      const baseA = out ? CENTER_TOP : PAD_TOP, baseB = out ? PAD_TOP : CENTER_TOP
      if (mt < T.anti) { const f = mt / T.anti; sy = 1 - 0.22 * easeOut(f); sxz = 1 + 0.12 * f; x = A.x; z = A.z; base = baseA; offBlend = out ? 0 : 1 }
      else if (mt < T.h1) { const f = (mt - T.anti) / (T.h1 - T.anti), e = easeIO(f); x = lerp(A.x, M.x, e); z = lerp(A.z, M.z, e); base = lerp(baseA, 0, e); hop = 0.38 * Math.sin(Math.PI * f); sy = 1 + 0.12 * Math.sin(Math.PI * f); offBlend = out ? 0 : 1 - f }
      else if (mt < T.land) { const f = (mt - T.h1) / (T.land - T.h1); x = M.x; z = M.z; base = 0; sy = 1 - 0.2 * (1 - f); sxz = 1 + 0.1 * (1 - f) }
      else if (mt < T.h2) { const f = (mt - T.land) / (T.h2 - T.land), e = easeIO(f), D2 = Math.hypot(B.x - M.x, B.z - M.z); x = lerp(M.x, B.x, e); z = lerp(M.z, B.z, e); base = lerp(0, baseB, e); hop = (0.5 + 0.17 * D2) * Math.sin(Math.PI * f); sy = 1 + 0.14 * Math.sin(Math.PI * f); offBlend = out ? f : 0 }
      else { x = B.x; z = B.z; base = baseB; offBlend = out ? 1 : 0 }
      if (out && mt >= T.h2) {
        const f = (mt - T.h2) / (T.arrive - T.h2)
        if (!K.landed) { K.landed = true; K.sq = 1; K.flash[idx] = 1; K.events.push({ x: P.x, y: PAD_TOP + 0.1, z: P.z, n: 14, pw: 1, gold: true }) }
        spin = Math.PI * 2 * easeIO(clamp(f)); floatK = clamp(f)
        if (mt >= T.arrive) { K.mode = 'island'; cb.current.onArrive(idx) }
      }
      if (!out && mt >= T.h2) { K.mode = 'idle'; K.sq = 0.8; K.events.push({ x: 0, y: CENTER_TOP, z: 0, n: 8, pw: 0.7, gold: true }); cb.current.onHome() }
    }
    // intro drop
    const dp = clamp((K.t - 0.9) / 0.5)
    if (!K.dropped && dp >= 1) { K.dropped = true; K.sq = 1; K.events.push({ x: 0, y: CENTER_TOP, z: 0, n: 14, pw: 1, gold: true }) }
    K.sq *= Math.exp(-9 * dt)
    const fl = floatK * (0.07 + 0.04 * Math.sin(t * 2)) * (K.mode === 'island' || K.mode === 'idle' ? 1 : 0.6)
    const offY = offBlend * K.off[idx]
    sy *= 1 - 0.22 * K.sq; sxz *= 1 + 0.1 * K.sq
    c.yaw += angDiff(c.yaw, yawT) * (1 - Math.exp(-(K.mode === 'idle' ? 6 : 12) * dt))
    const half = (CUBE_S / 2) * sy
    g.current.visible = K.t >= 0.9
    g.current.scale.set(sxz, sy, sxz)
    g.current.position.set(x, base + offY + hop + fl + half + (1 - dp * dp) * 6, z)
    m.current.rotation.y = c.yaw + spin
    if (eyes.current) { const b = (t % 3.6) > 3.5 ? 0.15 : 1; eyes.current.scale.y += (b - eyes.current.scale.y) * 0.5 }
    blob.current.visible = g.current.visible
    blob.current.position.set(x, base + offY + 0.012, z)
    blob.current.material.opacity = 0.28 * dp * clamp(1 - (hop + fl) * 1.2, 0.15, 1)
  })
  const e = useMemo(() => basic('#3a2350'), [])
  return (
    <>
      <group ref={g} visible={false}>
        <mesh ref={m} castShadow>
          <boxGeometry args={[CUBE_S, CUBE_S, CUBE_S]} />
          <meshStandardMaterial color="#fff4ea" roughness={0.5} emissive="#ffd9c0" emissiveIntensity={0.12} />
          {FACE && <group ref={eyes} position={[0, 0.04, CUBE_S / 2 + 0.004]}>{[-0.15, 0.15].map((x) => <mesh key={x} material={e} position={[x, 0, 0]}><planeGeometry args={[0.07, 0.12]} /></mesh>)}</group>}
        </mesh>
      </group>
      <mesh ref={blob} rotation-x={-Math.PI / 2}><planeGeometry args={[1.3, 1.3]} /><meshBasicMaterial map={soft()} color="#4c3470" transparent depthWrite={false} /></mesh>
    </>
  )
}

/* ---------- camera rig + DOM label projection ---------- */
function HubRig({ K, labels, ui }) {
  const { camera, size } = useThree()
  const S = useRef({ look: new THREE.Vector3(), zoom: 0, init: false }), tmp = useMemo(() => new THREE.Vector3(), []), tgt = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dtr) => {
    const dt = Math.min(dtr, 0.05), k = S.current, w = size.width, h = size.height, wide = w >= 800
    const top = wide ? 96 : 124, bot = ui.current.bottom || (wide ? 210 : 250)
    const sq = K.sq2, halfU = lerp(7.8, 5.5, sq), vSpan = lerp(8.9, 9.8, sq)
    let zoom = clamp(Math.min((w * 0.97) / (2 * halfU), (h - top - bot) / vSpan), 18, 105)
    zoom *= (0.88 + 0.12 * easeOut(clamp(K.t / 1.4))) * (1 + 0.26 * K.focus)
    uv(0, lerp(1.7, 2.1, sq), tgt)
    if (K.focus > 0.001) tgt.lerp(tmp.copy(K.pos[K.idx]), 0.8 * K.focus)
    tgt.addScaledVector(F_, -((bot - top) / 2) / (0.577 * zoom)) // keep the scene centred between the top bar and the bottom panel
    const a = 1 - Math.exp(-6 * dt)
    if (!k.init) { k.look.copy(tgt); k.zoom = zoom; k.init = true } else { k.look.lerp(tgt, a); k.zoom += (zoom - k.zoom) * a }
    camera.position.set(k.look.x + 10, 10, k.look.z + 10); camera.lookAt(k.look)
    if (Math.abs(camera.zoom - k.zoom) > 0.01) { camera.zoom = k.zoom; camera.updateProjectionMatrix() }
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    // island labels follow their island on screen (no React state per frame)
    CATS.forEach((_, i) => {
      const el = labels.current[i]; if (!el) return
      tmp.set(K.pos[i].x, K.off[i] + 2.5, K.pos[i].z).project(camera)
      const half = el.offsetWidth / 2, px = clamp((tmp.x * 0.5 + 0.5) * w, half + 6, w - half - 6)
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * h).toFixed(1)}px, 0) translate(-50%, -100%)`
      el.style.opacity = K.rise[i] > 0.6 && K.focus < 0.4 ? 1 : 0
    })
  })
  return null
}

function Hub({ V, cb, api, labels, ui }) {
  const size = useThree((s) => s.size)
  const K = useMemo(() => ({
    t: REDUCED ? 3 : 0, mode: 'idle', mt: 0, idx: 2, landed: false, dropped: false, sq: 0, sq2: 0, focus: 0,
    pos: CATS.map(() => new THREE.Vector3()), off: CATS.map(() => 0), hl: CATS.map(() => 0), flash: CATS.map(() => 0), rise: CATS.map(() => 0),
    cube: { yaw: Math.PI / 4 }, events: [],
  }), [])
  useEffect(() => {
    api.current = {
      travel: (i) => { if (K.mode !== 'idle') return false; K.idx = i; K.mode = 'out'; K.mt = 0; K.landed = false; return true },
      home: () => { if (K.mode !== 'island') return false; K.mode = 'back'; K.mt = 0; return true },
    }
    return () => { api.current = null }
  }, [])
  useFrame((_, dtr) => {
    const dt = Math.min(dtr, 0.05)
    K.t += dt
    const portrait = size.width / size.height < 0.85
    K.sq2 += ((portrait ? 1 : 0) - K.sq2) * (1 - Math.exp(-6 * dt))
    CATS.forEach((c, i) => {
      const th = (c.angle * Math.PI) / 180
      uv(lerp(6.2, 3.9, K.sq2) * Math.cos(th), lerp(5.0, 5.4, K.sq2) * Math.sin(th), K.pos[i])
      K.rise[i] = easeOut(clamp((K.t - 0.2 - i * 0.12) / 0.75))
    })
    K.focus += ((K.mode === 'island' ? 1 : 0) - K.focus) * (1 - Math.exp(-4.5 * dt))
    if (K.t > 1.2 && !K.ready) { K.ready = true; cb.current.onReady() }
  })
  return (
    <>
      <hemisphereLight args={['#ffe6ef', '#b4a2d6', 0.85]} />
      <directionalLight position={[14, 13, 5]} intensity={1.2} color="#ffc99a" castShadow
        shadow-mapSize={LOW ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={60} />
      <Ground K={K} V={V} />
      {CATS.map((c, i) => <Island key={c.id} i={i} K={K} V={V} cb={cb} />)}
      <FarIslands K={K} />
      <HubCube K={K} V={V} cb={cb} />
      <Motes K={K} />
      <Dust store={K} />
      <HubRig K={K} labels={labels} ui={ui} />
      <Clouds store={K} />
    </>
  )
}

// every prop is a stable ref, so React never re-renders the scene when the HUD state changes
export default memo(Hub)
