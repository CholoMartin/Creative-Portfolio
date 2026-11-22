// Portal activation cinematic: a pure timeline that writes S.fx (cube pose override, portal boost, camera push-in).
// Started by sim.js when the cube reaches the final tile (S.seq = { t: 0, on: true }); advanced once per frame by <Sim> in World.jsx.
import * as THREE from 'three'
import { CELLS, PORTAL, wp } from './level'

const CUBE = 0.56
// seconds: anticipation -> bounce + 360 spin -> crouch -> jump into the gate -> pulled in -> burst -> done
export const SEQ = { spin: 0.85, land: 2.0, crouch: 2.25, jump: 3.0, pull: 4.05, end: 4.75 }
export const TRAIL_N = 28

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeIn = (x) => x * x
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const [px, , pz] = wp(CELLS[PORTAL.at])
export const PORTAL_CORE = new THREE.Vector3(px, 0.58, pz - 0.97) // centre of the glowing disc (see <Portal> in World.jsx)
const LIFT = 0.1 // the final tile carries a raised plate

export const newFx = () => ({ x: px, y: 0, z: pz, sx: 1, sy: 1, sz: 1, rx: 0, ry: 0, rz: 0, vis: true, shadow: 1, boost: 0, burst: 0, camK: 0, pulseId: 0 })
export const newTrail = () => ({ pos: new Float32Array(TRAIL_N * 3), tt: new Float32Array(TRAIL_N).fill(-99), head: 0 })

export function stepPortalSeq(S, dt, cb) {
  const q = S.seq
  if (!q || !q.on) return
  q.t += dt
  const t = q.t, fx = (S.fx ||= newFx())
  const C = PORTAL_CORE
  let hop = 0, sy = 1, sxz = 1, yaw = 0, x = px, z = pz, vis = true, shadow = 1, rx = 0, rz = 0, yOff = null

  if (t < SEQ.spin) {                                   // idle / anticipation: breathing + a little wobble, deepening crouch
    const f = t / SEQ.spin
    sy = 1 - 0.05 * Math.sin(t * 9) - 0.12 * easeIn(f); sxz = 1 + 0.03 * Math.sin(t * 9) + 0.06 * easeIn(f)
    yaw = 0.12 * Math.sin(t * 7) * (1 - f)
  } else if (t < SEQ.land) {                            // bounce + one smooth 360 spin
    const f = (t - SEQ.spin) / (SEQ.land - SEQ.spin)
    hop = 0.62 * Math.sin(Math.PI * f)
    yaw = Math.PI * 2 * easeIO(f)
    sy = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, f * 1.2)); sxz = 1 - 0.06 * Math.sin(Math.PI * f)
    if (f > 0.9) { sy = 1 - 0.18 * ((f - 0.9) / 0.1); sxz = 1 + 0.08 * ((f - 0.9) / 0.1) }
    if (!q.f1 && f > 0.96) { q.f1 = true; fx.pulseId++; S.events.push({ x: px, y: 0.1, z: pz, n: 14, pw: 1, gold: true }) }
  } else if (t < SEQ.crouch) {                          // crouch before the leap
    const f = (t - SEQ.land) / (SEQ.crouch - SEQ.land)
    sy = 0.82 - 0.1 * easeOut(f); sxz = 1.08 + 0.06 * f
  } else if (t < SEQ.jump) {                            // leap from the tile into the gate
    const f = (t - SEQ.crouch) / (SEQ.jump - SEQ.crouch), e = easeIO(f)
    x = px + (C.x - px) * e; z = pz + (C.z - pz) * e
    yOff = (C.y - (LIFT + CUBE / 2)) * e
    hop = 0.75 * Math.sin(Math.PI * f)
    sy = 1 + 0.2 * Math.sin(Math.PI * f); sxz = 1 - 0.08 * Math.sin(Math.PI * f)
    yaw = 0.8 * f; rx = -0.5 * f
    shadow = 1 - f
  } else if (t < SEQ.pull) {                            // pulled inside: spiral, spin, shrink, fade
    const f = (t - SEQ.jump) / (SEQ.pull - SEQ.jump), r = 0.32 * Math.sin(Math.PI * Math.min(1, f * 1.1)) * (1 - f), a = f * Math.PI * 5
    x = C.x + Math.cos(a) * r; z = C.z - 0.3 * easeIn(f)
    yOff = C.y - (LIFT + CUBE / 2) + Math.sin(a) * r
    const s = Math.pow(1 - easeIn(f), 1.4)
    sy = sxz = Math.max(s, 0.001)
    yaw = 0.8 + f * 14; rx = -0.5 + f * 9; rz = f * 6
    shadow = 0
    if (!q.f2) { q.f2 = true; fx.pulseId++; S.events.push({ x: C.x, y: C.y, z: C.z + 0.2, n: 16, pw: 1.2, gold: true }) }
  } else {
    vis = false; shadow = 0
    if (!q.f3) { q.f3 = true; fx.pulseId++ }
  }

  fx.vis = vis; fx.shadow = shadow
  fx.sx = sxz; fx.sy = sy; fx.sz = sxz
  fx.x = x; fx.z = z
  fx.y = yOff == null ? LIFT + hop + (CUBE / 2) * sy : LIFT + (CUBE / 2) * sy + hop + yOff
  fx.ry = yaw; fx.rx = rx; fx.rz = rz
  // portal brightness ramps all the way up, peaks in a burst as the cube vanishes, then settles bright
  fx.burst = clamp((t - SEQ.pull + 0.1) / 0.7)
  fx.boost = clamp(t / 2.6) * 0.75 + clamp((t - 2.6) / 0.7) * 0.25 + 0.35 * Math.sin(Math.PI * fx.burst) - 0.15 * fx.burst
  fx.camK = easeIO(clamp((t - 0.4) / 3.4))                // slow push toward the cube and gate

  if (vis && t > SEQ.crouch) {                            // glowing trail: ring buffer of recent cube centres
    const tr = S.trail ||= newTrail(), i = tr.head++ % TRAIL_N
    tr.pos[i * 3] = x; tr.pos[i * 3 + 1] = fx.y; tr.pos[i * 3 + 2] = z; tr.tt[i] = S.t
  }
  if (t >= SEQ.end && !q.done) { q.done = true; q.on = false; cb.onPortalDone() }
}
