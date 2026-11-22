// Checkpoint state machine + cube movement. Pure logic (no rendering), driven once per frame by <Sim> in World.jsx.
//
// The cube's position `S.s` (in tiles along the path) is the single source of truth. It only ever moves in stepSim, and:
//   - it can never pass the tile of the next uncleared stop (the "gate"), whatever the scroll position says
//   - arrival is detected on that clamp (previous -> next crossing), so it is independent of scroll speed and frame rate
//   - on arrival the cube snaps to the tile, movement stops (phase 'panel') and nothing moves until release() is called
//     (the panel's close/continue button), which clears the stop and moves the gate on to the next one
import { CELLS, CP_AT, CHECKPOINTS, STOPS, wp } from './level'
import { N, poseAt, SCROLL_END, SCROLL_TOTAL } from './path'

export const MAXV = 8     // max tiles per second the cube may travel
export const EPS = 0.03   // within this many tiles of a stop counts as arrived
export const REST = 0.35  // seconds the cube must rest on a cleared checkpoint before its panel re-opens

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const limitFor = (S) => (STOPS[S.cleared] ? SCROLL_END[STOPS[S.cleared].at] : SCROLL_TOTAL)

export const newSimState = () => ({ s: 0, sq: 0, ready: false, landed: false, events: [], visited: new Set(), cleared: 0, phase: 'move', open: null, armed: {}, rest: 0 })

// Close/continue pressed. Returns the stop that was open (or null when nothing was open, e.g. a repeated click).
export function release(S, A, cb) {
  const stop = S.open
  if (S.phase !== 'panel' || !stop) return null
  if (stop === STOPS[S.cleared]) S.cleared++ // first visit: unlock the next stretch of path
  S.open = null; S.phase = 'move'; S.rest = 0
  A.limit = limitFor(S)
  cb.onActive(null)
  return stop
}

// A = { target, limit } (scroll target as a point on the path, furthest allowed scroll); cb = { onVisit, onActive }
export function stepSim(S, A, dt, cb) {
  const gate = STOPS[S.cleared] // the next stop that hasn't been cleared yet
  A.limit = limitFor(S)         // App clamps the native scroll position to this

  const prev = S.s
  if (S.ready && S.phase === 'move') {
    const step = (A.target - S.s) * (1 - Math.exp(-7 * dt)), m = MAXV * dt
    let next = clamp(S.s + clamp(step, -m, m), 0, N - 1)
    if (gate && next >= gate.at - EPS) { // crossed (or reached) the gate: hard stop on its tile
      next = gate.at
      S.visited.add(gate.id); cb.onVisit(gate.id)
      if (gate.kind === 'portal') { // final destination: no panel; the activation cinematic takes over (see portal.js, World.jsx)
        S.cleared++; S.phase = 'portal'; S.seq = { t: 0, on: true, done: false }
        const [x, , z] = wp(CELLS[gate.at]); S.events.push({ x, y: 0.1, z, n: 16, pw: 1, gold: true })
      } else {
        S.phase = 'panel'; S.open = gate; S.armed[gate.id] = false; S.rest = 0
        cb.onActive(gate)
      }
    }
    S.s = next
  }
  poseAt(S.s, S.pose); poseAt(Math.min(S.s + 2.2, N - 1), S.ahead)

  if (!S.landed) return
  const a = Math.floor(prev), b = Math.floor(S.s)
  if (a !== b) { // crossed a tile centre: that's a landing
    const idx = Math.max(a, b), v = Math.abs(S.s - prev) / Math.max(dt, 1e-3), cp = CP_AT.get(idx)
    S.sq = Math.min(1, 0.3 + v / 6)
    const [x, , z] = wp(CELLS[idx])
    S.events.push({ x, y: cp ? 0.1 : 0, z, n: cp ? 14 : v > 1.5 ? 5 : 2, pw: cp ? 1 : 0.3 + Math.min(0.7, v / 6), gold: !!cp })
  }
  if (S.phase !== 'move') return
  // revisiting: a cleared checkpoint re-opens its panel once the cube has rested on it (and only after the cube has left it once)
  for (const c of CHECKPOINTS) if (Math.abs(S.s - c.at) > 0.6) S.armed[c.id] = true
  const c = CP_AT.get(Math.round(S.s))
  if (c && c.kind !== 'portal' && STOPS.indexOf(c) < S.cleared && S.armed[c.id] && Math.abs(S.s - c.at) < EPS && Math.abs(A.target - c.at) < EPS) {
    if ((S.rest += dt) > REST) { S.s = c.at; S.phase = 'panel'; S.open = c; S.armed[c.id] = false; S.rest = 0; cb.onActive(c) }
  } else S.rest = 0
}
