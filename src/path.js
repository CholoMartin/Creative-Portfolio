// Scroll <-> path mapping and cube pose along the path.
import * as THREE from 'three'
import { CELLS, CP_AT, wp } from './level'

export const N = CELLS.length
export const STEP = 100   // scroll pixels per tile (lower = more sensitive)
export const DWELL = 140  // extra scroll pixels spent resting on each stop (slack so the cube can settle on its tile)

export const SCROLL_START = [], SCROLL_END = []
let y = 0
for (let i = 0; i < N; i++) {
  SCROLL_START[i] = y
  if (CP_AT.has(i)) y += DWELL
  SCROLL_END[i] = y
  if (i < N - 1) y += STEP
}
export const SCROLL_TOTAL = y

// scrollTop -> fractional position along the path (0 .. N-1); flat while dwelling on a checkpoint
export function sFromScroll(t) {
  t = Math.max(0, t)
  for (let i = 0; i < N; i++)
    if (t <= SCROLL_END[i]) return t < SCROLL_START[i] ? i - (SCROLL_START[i] - t) / STEP : i
  return N - 1
}
// nearest resting scroll position for a fractional s
export const snapScroll = (s) => { const i = Math.round(s); return s > i ? SCROLL_END[i] : SCROLL_START[i] }

// checkpoint tiles carry a raised plate, so the cube rides slightly higher there
const LIFT = CELLS.map((_, i) => (CP_AT.has(i) ? 0.1 : 0))

// orientation of the cube after each roll, so scrubbing forward/back is always consistent
const QUATS = [new THREE.Quaternion()]
for (let i = 0; i < N - 1; i++) {
  const dx = CELLS[i + 1].x - CELLS[i].x, dz = CELLS[i + 1].z - CELLS[i].z
  QUATS.push(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dz, 0, -dx), Math.PI / 2).multiply(QUATS[i]))
}

export const newPose = () => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), lift: 0, hop: 0, f: 0, s: 0 })

export function poseAt(s, out) {
  s = Math.min(N - 1, Math.max(0, s))
  const i = Math.min(Math.floor(s), N - 2), f = s - i, e = f * f * (3 - 2 * f)
  const a = wp(CELLS[i]), b = wp(CELLS[i + 1])
  out.pos.set(a[0] + (b[0] - a[0]) * e, 0, a[2] + (b[2] - a[2]) * e)
  out.lift = LIFT[i] + (LIFT[i + 1] - LIFT[i]) * e
  out.hop = Math.sin(Math.PI * f) * 0.14
  out.quat.slerpQuaternions(QUATS[i], QUATS[i + 1], e)
  out.f = f; out.s = s
  return out
}
