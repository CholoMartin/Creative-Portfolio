// Blocky low-poly background clouds: a handful of cube clusters, one instanced mesh, no particles.
// They live "behind" the scene: positioned in camera space, far down the view axis, so they can never
// sit in front of the cube, platforms, path or decorations. They only drift a little, side to side.
import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)

// fixed isometric camera basis (matches Rig in World.jsx: camera sits at +10,+10,+10 of its target)
const R = new THREE.Vector3(1, 0, -1).normalize()   // screen right
const U = new THREE.Vector3(-1, 2, -1).normalize()  // screen up
const F = new THREE.Vector3(-1, -1, -1).normalize() // view direction
const CAM_OFFSET = 10

// [u, v] = position on screen (-1..1 spans the view at full zoom; >1 is off the edge), layer 0 far .. 2 near.
// Kept to the top, bottom and side edges; the middle of the screen stays clear.
const SPOTS = [
  [-0.55, 0.9, 0], [0.2, 0.97, 0], [0.9, 0.82, 0], [-1.05, 0.35, 0], [1.08, 0.5, 0],
  [-1.1, -0.3, 1], [1.05, -0.2, 1], [-0.15, -1.02, 1], [0.95, -0.88, 1],
  [-0.8, -0.9, 2], [0.62, -1.0, 2], [1.2, 0.1, 2],
]
const LOW_SPOTS = [0, 2, 3, 5, 6, 8, 9, 11]
const LAYER = [
  { scale: [0.55, 0.7], depth: [95, 110], par: 0.05, fade: 0.38, amp: [0.5, 0.9], w: [0.03, 0.05] },
  { scale: [0.85, 1.05], depth: [70, 85], par: 0.12, fade: 0.16, amp: [0.7, 1.2], w: [0.04, 0.07] },
  { scale: [1.25, 1.55], depth: [48, 60], par: 0.22, fade: 0, amp: [0.9, 1.5], w: [0.05, 0.08] },
]
const WHITE = ['#fff3f6', '#ffe6ef', '#ffeadf'] // soft pink / blush / peach
const SKY = new THREE.Color('#c9b6e6')

function rng(seed) { // tiny deterministic PRNG so the layout is stable
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const between = (r, [a, b]) => a + (b - a) * r()

// a staircase of cubes running along the screen's horizontal, a thicker lump or two, then a few cubes stacked on top
function makeCloud(r, fade) {
  const pairs = 2 + Math.floor(r() * 3)
  let cells = [[0, 0]], i = 0, j = 0
  for (let k = 0; k < pairs; k++) { i += 1; cells.push([i, j]); j -= 1; cells.push([i, j]) }
  for (const [ci, cj] of cells.slice()) if (r() < 0.35 && !cells.some(([a, b]) => a === ci && b === cj + 1)) cells.push([ci, cj + 1])
  const mi = cells.reduce((s, c) => s + c[0], 0) / cells.length, mj = cells.reduce((s, c) => s + c[1], 0) / cells.length
  const cubes = [], tall = []
  const tint = (hex, blue) => new THREE.Color(hex).lerp(SKY, clamp(blue + fade))
  for (const [ci, cj] of cells) {
    const h = [0.7, 0.85, 1][Math.floor(r() * 3)]
    cubes.push({ x: ci - mi, y: h / 2, z: cj - mj, sx: 1, sy: h, sz: 1, c: tint(WHITE[Math.floor(r() * 3)], 0.22) })
    tall.push({ x: ci - mi, z: cj - mj, h })
  }
  const tops = 1 + Math.floor(r() * 3)
  for (let k = 0; k < tops; k++) {
    const t = tall[1 + Math.floor(r() * (tall.length - 2))] || tall[0]
    const s = 0.62 + r() * 0.16
    cubes.push({ x: t.x + (r() - 0.5) * 0.2, y: t.h + s / 2 - 0.01, z: t.z + (r() - 0.5) * 0.2, sx: s, sy: s, sz: s, c: tint(WHITE[Math.floor(r() * 3)], 0) })
    if (k === 0 && r() < 0.6) cubes.push({ x: t.x, y: t.h + s + 0.17, z: t.z, sx: 0.4, sy: 0.4, sz: 0.4, c: tint(WHITE[0], 0) })
  }
  return cubes
}

export default function Clouds({ store }) {
  const ref = useRef()
  const { camera, size } = useThree()
  const d = useMemo(() => new THREE.Object3D(), [])
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const A = useMemo(() => new THREE.Vector3(), [])

  const { clouds, total } = useMemo(() => {
    const LOW = matchMedia('(pointer: coarse)').matches || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4
    const r = rng(20261114)
    const picks = LOW ? LOW_SPOTS.map((k) => SPOTS[k]) : SPOTS
    const clouds = picks.map(([u, v, layer], n) => {
      const L = LAYER[layer]
      return { u, v, layer, n, par: L.par, scale: between(r, L.scale), depth: between(r, L.depth), amp: between(r, L.amp), w: between(r, L.w), ph: r() * 6.283, cubes: makeCloud(r, L.fade) }
    })
    return { clouds, total: clouds.reduce((s, c) => s + c.cubes.length, 0) }
  }, [])

  useLayoutEffect(() => {
    let i = 0
    for (const c of clouds) for (const q of c.cubes) ref.current.setColorAt(i++, q.c)
    ref.current.instanceColor.needsUpdate = true
  }, [clouds])

  useFrame(() => {
    const base = clamp(Math.min(size.width, size.height) / 8, 44, 92) // the camera's full-zoom scale (see Rig)
    const hw = size.width / 2 / base, hh = size.height / 2 / base
    const ks = clamp(size.width / (base * 18), 0.5, 1)               // keep clouds modest on narrow screens
    look.copy(camera.position).addScalar(-CAM_OFFSET)
    const lr = look.dot(R), lu = look.dot(U)
    let i = 0
    for (const c of clouds) {
      const grow = easeOut(clamp((store.t - 0.8 - c.n * 0.12) / 1.6))
      const sc = c.scale * ks * 0.9
      const lx = c.u * hw + (REDUCED ? 0 : Math.sin(store.t * c.w + c.ph) * c.amp * ks) - lr * c.par
      const ly = c.v * hh - lu * c.par * 0.6
      A.copy(camera.position).addScaledVector(F, c.depth).addScaledVector(R, lx).addScaledVector(U, ly)
      for (const q of c.cubes) {
        d.position.set(A.x + q.x * sc * grow, A.y + q.y * sc * grow, A.z + q.z * sc * grow)
        d.scale.set(q.sx * sc * grow + 1e-4, q.sy * sc * grow + 1e-4, q.sz * sc * grow + 1e-4)
        d.updateMatrix(); ref.current.setMatrixAt(i++, d.matrix)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, total]} frustumCulled={false} renderOrder={-1} />
}
