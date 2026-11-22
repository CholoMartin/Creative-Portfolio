// Procedural miniature Japanese-garden pieces.
// Every type is ONE merged, vertex-coloured geometry (origin = centre of the tile, y = 0 is the platform top),
// so each type renders as a single instanced draw call. No textures, no extra dependencies.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const C = {
  leaf: '#5cb868', leafDk: '#3d9456', leafLt: '#8ccf7a', grass: '#86c36f', pine: '#3a7d50', pineLt: '#4f9a62',
  pink: '#ffb3cf', pinkLt: '#ffd6e5', pinkDk: '#ff93bb',
  wood: '#bb7c4c', woodDk: '#8e5a34', woodLt: '#dba76d',
  cream: '#fff3d9', glow: '#ffeaa8',
  stone: '#cdbfa6', stoneDk: '#a89a82', stoneLt: '#e0d5bf',
  red: '#cf4b3e', black: '#2e2b36', slate: '#5b4f73', slateDk: '#3f3656', plaster: '#fbefdc', gold: '#ffd27a', terra: '#d98860', soil: '#6b4a35',
  water: '#6cc3f0', waterLt: '#a4defa', bamboo: '#8bc851', bambooDk: '#639c3a', moss: '#7f9f58', mossLt: '#98b46a', koi: '#ff8f4d',
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color()
const BOX = new THREE.BoxGeometry(1, 1, 1)
const ICO0 = new THREE.IcosahedronGeometry(1, 0) // rocks: crisp facets
const ICO1 = new THREE.IcosahedronGeometry(1, 1) // foliage: puffier low-poly blobs

// one coloured, positioned piece
function piece(geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  g.deleteAttribute('uv')
  _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]))
  g.applyMatrix4(_m)
  _c.set(color)
  const n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}
// helpers: (size, colour, centre position, rotation)
const box = (w, h, d, col, x, y, z, ry = 0, rz = 0) => piece(BOX, col, [x, y, z], [w, h, d], [0, ry, rz])
const cyl = (rt, rb, h, seg, col, x, y, z, rx = 0, rz = 0) => piece(new THREE.CylinderGeometry(rt, rb, h, seg), col, [x, y, z], [1, 1, 1], [rx, 0, rz])
const blob = (r, col, x, y, z, sy = 0.82, detail = 1) => piece(detail ? ICO1 : ICO0, col, [x, y, z], [r, r * sy, r])
const build = (parts) => mergeGeometries(parts)

// little round lawn patch under a tree
const lawn = (r = 0.27) => cyl(r * 0.92, r, 0.05, 8, C.grass, 0, 0.025, 0)

/* ---------- trees ---------- */
function sakura() {
  const P = [lawn(0.3)]
  P.push(cyl(0.034, 0.06, 0.42, 6, C.woodDk, 0, 0.26, 0, 0, 0.07))
  P.push(cyl(0.02, 0.034, 0.26, 5, C.wood, 0.09, 0.44, 0, 0, -0.8))
  P.push(blob(0.23, C.pink, 0, 0.62, 0, 0.8))
  P.push(blob(0.17, C.pinkLt, -0.2, 0.54, 0.06, 0.8))
  P.push(blob(0.17, C.pinkDk, 0.2, 0.58, -0.05, 0.8))
  P.push(blob(0.14, C.pinkLt, 0.03, 0.8, 0.02, 0.8))
  P.push(blob(0.11, C.pink, -0.04, 0.55, 0.2, 0.8))
  // a few fallen petals
  for (const [x, z, r] of [[0.32, -0.1, 0.5], [-0.3, 0.2, 1.2], [0.12, 0.33, 2.1], [-0.12, -0.34, 0.2]])
    P.push(box(0.045, 0.01, 0.03, C.pinkLt, x, 0.055, z, r))
  return build(P)
}

function cubeTree() {
  return build([
    box(0.44, 0.05, 0.44, C.grass, 0, 0.025, 0, 0.2),
    box(0.1, 0.36, 0.1, C.wood, 0, 0.23, 0, 0.3),
    box(0.45, 0.32, 0.45, C.leaf, 0, 0.53, 0, 0.45, 0.04),
    box(0.3, 0.2, 0.3, C.leafLt, 0.02, 0.77, -0.01, -0.3, -0.05),
    box(0.13, 0.08, 0.13, C.pinkLt, 0.12, 0.9, 0.05, 0.7), // a single blossom cube on top
  ])
}

function bonsai() {
  return build([
    box(0.46, 0.12, 0.3, C.terra, 0, 0.06, 0),
    box(0.5, 0.035, 0.34, '#c7744b', 0, 0.13, 0),
    box(0.4, 0.03, 0.24, C.soil, 0, 0.14, 0),
    box(0.07, 0.22, 0.07, C.woodDk, -0.03, 0.27, 0, 0, 0.18),
    box(0.06, 0.18, 0.06, C.wood, 0.04, 0.4, 0, 0, -0.4),
    blob(0.17, C.leafDk, -0.12, 0.34, 0.02, 0.6),
    blob(0.2, C.leaf, 0.06, 0.52, 0, 0.6),
    blob(0.11, C.leafLt, 0.2, 0.41, 0.04, 0.6),
  ])
}

function bamboo() {
  const P = [lawn(0.34), piece(ICO0, C.moss, [0.2, 0.06, -0.18], [0.1, 0.035, 0.08])]
  const stalks = [[0, 0, 1.0], [0.12, 0.07, 0.82], [-0.11, 0.08, 0.92], [0.05, -0.12, 0.7], [-0.1, -0.1, 0.78], [0.2, -0.08, 0.6], [-0.2, 0.0, 0.64], [0.0, 0.17, 0.56]]
  stalks.forEach(([x, z, h], i) => {
    const lean = (i % 3 - 1) * 0.03
    P.push(cyl(0.03, 0.036, h, 6, i % 2 ? C.bamboo : '#9ccd5e', x, 0.05 + h / 2, z, lean, -lean))
    for (let y = 0.2; y < h - 0.05; y += 0.2) P.push(cyl(0.04, 0.04, 0.018, 6, C.bambooDk, x, 0.05 + y, z, lean, -lean))
    if (h > 0.55) { // leaf blades near the tip
      const top = 0.05 + h
      P.push(box(0.2, 0.012, 0.05, C.leaf, x + 0.08, top - 0.02, z, 0.4 * (i + 1), 0.55))
      P.push(box(0.17, 0.012, 0.045, C.leafLt, x - 0.07, top - 0.08, z + 0.02, 1.2 + i, -0.5))
      P.push(box(0.15, 0.012, 0.04, C.leafDk, x + 0.01, top - 0.14, z - 0.06, 2.3 + i, 0.45))
    }
  })
  return build(P)
}

// clipped azalea-style shrub with a few blossoms
function shrub() {
  return build([
    blob(0.2, C.leaf, 0, 0.13, 0, 0.7),
    blob(0.15, C.leafDk, 0.17, 0.1, 0.06, 0.7),
    blob(0.14, C.leafLt, -0.15, 0.1, -0.07, 0.7),
    blob(0.11, C.leaf, 0.02, 0.1, 0.17, 0.7),
    piece(ICO0, C.pinkDk, [0.07, 0.25, 0.05], [0.03, 0.03, 0.03]),
    piece(ICO0, C.pinkLt, [-0.08, 0.23, -0.02], [0.03, 0.03, 0.03]),
    piece(ICO0, C.pinkDk, [0.2, 0.17, 0.08], [0.026, 0.026, 0.026]),
    piece(ICO0, C.pinkLt, [-0.02, 0.2, 0.18], [0.026, 0.026, 0.026]),
  ])
}

// cloud-pruned pine (matsu): leaning trunk, flat foliage pads
function pine() {
  const flat = (r, col, x, y, z) => blob(r, col, x, y, z, 0.4)
  return build([
    lawn(0.3),
    cyl(0.04, 0.065, 0.5, 6, C.woodDk, 0, 0.3, 0, 0, 0.12),
    cyl(0.025, 0.04, 0.34, 5, C.wood, 0.07, 0.62, 0, 0, -0.35),
    cyl(0.02, 0.03, 0.22, 5, C.wood, -0.1, 0.45, 0.02, 0, 0.9),
    flat(0.26, C.pine, 0.08, 0.84, 0),
    flat(0.2, C.pineLt, -0.2, 0.62, 0.03),
    flat(0.17, C.pine, 0.2, 0.56, -0.08),
    flat(0.12, C.pineLt, 0.04, 0.98, -0.02),
  ])
}

// cluster of boulders with moss caps
function mossRock() {
  return build([
    piece(ICO0, C.stone, [0, 0.11, 0], [0.22, 0.15, 0.19], [0, 0.5, 0]),
    piece(ICO0, C.stoneDk, [0.24, 0.07, 0.08], [0.13, 0.09, 0.12], [0, 1.1, 0]),
    piece(ICO0, C.stoneLt, [-0.2, 0.06, 0.12], [0.1, 0.07, 0.09], [0, 2, 0]),
    piece(ICO0, C.moss, [-0.02, 0.22, 0.01], [0.15, 0.055, 0.13], [0, 0.3, 0]),
    piece(ICO0, C.mossLt, [0.22, 0.13, 0.08], [0.08, 0.03, 0.08], [0, 0.9, 0]),
    piece(ICO0, C.moss, [-0.2, 0.11, 0.12], [0.07, 0.025, 0.07]),
  ])
}

// low wooden railing segment, runs along local X (1 tile long, ~half a cube tall)
function rail() {
  const P = [
    box(0.98, 0.032, 0.045, C.woodDk, 0, 0.25, 0),
    box(0.98, 0.026, 0.035, C.wood, 0, 0.14, 0),
  ]
  for (const x of [-0.46, 0, 0.46]) {
    P.push(box(0.06, 0.3, 0.06, C.wood, x, 0.15, 0))
    P.push(box(0.075, 0.025, 0.075, C.stoneLt, x, 0.31, 0))
  }
  return build(P)
}

// modest wayside shrine (hokora): stone plinth, wooden cabinet, little hip roof
function hokora() {
  const P = [
    box(0.6, 0.06, 0.5, C.stoneDk, 0, 0.03, 0),
    box(0.2, 0.04, 0.1, C.stone, 0, 0.02, 0.3),
    box(0.4, 0.3, 0.32, C.wood, 0, 0.21, 0),
    box(0.16, 0.22, 0.02, C.woodDk, 0, 0.2, 0.165),   // doors
    box(0.012, 0.22, 0.022, C.gold, 0, 0.2, 0.17),
    box(0.46, 0.03, 0.38, C.slateDk, 0, 0.375, 0),
    roof(0.4, 0.2, C.slate, 0.49),
    piece(ICO0, C.gold, [0, 0.61, 0], [0.03, 0.04, 0.03]),
    piece(ICO0, C.moss, [0.22, 0.065, -0.14], [0.1, 0.03, 0.08]),
  ]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(0.04, 0.3, 0.04, C.red, sx * 0.19, 0.21, sz * 0.15))
  return build(P)
}

/* ---------- lanterns ---------- */
function stoneLantern() {
  const P = [
    cyl(0.17, 0.2, 0.06, 6, C.stoneDk, 0, 0.03, 0),            // wide base
    cyl(0.07, 0.085, 0.26, 6, C.stone, 0, 0.19, 0),             // shaft
    cyl(0.12, 0.09, 0.05, 6, C.stoneLt, 0, 0.345, 0),           // seat
    cyl(0.15, 0.15, 0.04, 6, C.stoneLt, 0, 0.385, 0),           // lamp deck
    cyl(0.1, 0.1, 0.15, 6, C.stone, 0, 0.485, 0),               // fire box
    cyl(0, 0.24, 0.15, 6, C.stoneDk, 0, 0.64, 0),               // roof
    piece(ICO0, C.stoneLt, [0, 0.74, 0], [0.04, 0.045, 0.04]),  // finial
    piece(ICO0, C.moss, [0.04, 0.06, 0.15], [0.07, 0.03, 0.06], [0, 0.6, 0]),
  ]
  for (let k = 0; k < 6; k++) { // glowing windows on every face, so one is always visible
    const a = Math.PI / 6 + (k * Math.PI) / 3
    P.push(box(0.07, 0.085, 0.03, C.glow, Math.sin(a) * 0.088, 0.485, Math.cos(a) * 0.088, a))
  }
  return build(P)
}

// compact square stone garden lantern inspired by a traditional tōrō
function gardenLantern() {
  const P = [
    box(0.56, 0.12, 0.56, C.stoneDk, 0, 0.06, 0),
    box(0.38, 0.43, 0.38, C.stone, 0, 0.335, 0),
    box(0.5, 0.08, 0.5, C.stoneLt, 0, 0.59, 0),
    box(0.46, 0.3, 0.46, C.stone, 0, 0.78, 0),
    box(0.72, 0.13, 0.72, C.stoneLt, 0, 0.995, 0),
    box(0.26, 0.1, 0.26, C.stone, 0, 1.11, 0),
  ]
  // dark inset windows with stone mullions on the front and sides
  for (const z of [-1, 1]) {
    const face = z * 0.232
    P.push(box(0.22, 0.18, 0.012, C.stoneDk, 0, 0.78, face))
    for (const x of [-0.055, 0.055]) for (const y of [0.735, 0.825]) P.push(box(0.022, 0.035, 0.02, C.stoneLt, x, y, face + z * 0.008))
  }
  for (const x of [-1, 1]) {
    const face = x * 0.232
    P.push(box(0.012, 0.18, 0.22, C.stoneDk, face, 0.78, 0))
    for (const z of [-0.055, 0.055]) for (const y of [0.735, 0.825]) P.push(box(0.02, 0.035, 0.022, C.stoneLt, face + x * 0.008, y, z))
  }
  return build(P)
}

function woodLantern() {
  const P = [
    box(0.2, 0.04, 0.2, C.stone, 0, 0.02, 0),
    box(0.06, 0.34, 0.06, C.woodDk, 0, 0.21, 0),
    box(0.15, 0.14, 0.21, C.glow, 0, 0.48, 0), // paper panels
    box(0.21, 0.14, 0.15, C.glow, 0, 0.48, 0),
    box(0.23, 0.025, 0.23, C.woodDk, 0, 0.385, 0),
    box(0.23, 0.025, 0.23, C.woodDk, 0, 0.585, 0),
    cyl(0, 0.19, 0.11, 4, C.red, 0, 0.65, 0, 0, 0),
  ]
  P[P.length - 1] = piece(new THREE.CylinderGeometry(0, 0.19, 0.11, 4), C.red, [0, 0.65, 0], [1, 1, 1], [0, Math.PI / 4, 0])
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(0.035, 0.2, 0.035, C.wood, sx * 0.1, 0.485, sz * 0.1))
  return build(P)
}

/* ---------- gate ---------- */
// beams run along local X, the opening faces local +Z (level.js turns it toward the checkpoint)
function torii() {
  const P = [
    cyl(0.032, 0.04, 0.52, 8, C.red, -0.22, 0.3, 0), cyl(0.032, 0.04, 0.52, 8, C.red, 0.22, 0.3, 0),
    box(0.11, 0.04, 0.11, C.stoneDk, -0.22, 0.02, 0), box(0.11, 0.04, 0.11, C.stoneDk, 0.22, 0.02, 0),
    box(0.56, 0.035, 0.045, C.red, 0, 0.42, 0),
    box(0.05, 0.1, 0.04, C.cream, 0, 0.49, 0),
    box(0.6, 0.03, 0.06, C.red, 0, 0.565, 0),
    box(0.7, 0.04, 0.08, C.black, 0, 0.6, 0),
  ]
  for (const sx of [-1, 1]) P.push(box(0.13, 0.04, 0.08, C.black, sx * 0.37, 0.622, 0, 0, sx * 0.3))
  return build(P)
}

/* ---------- ground pieces ---------- */
function rock() {
  return build([
    piece(ICO0, C.stone, [0, 0.1, 0], [0.17, 0.12, 0.15], [0, 0.5, 0]),
    piece(ICO0, C.stoneDk, [0.2, 0.06, 0.07], [0.11, 0.08, 0.1], [0, 1.1, 0]),
    piece(ICO0, C.stoneLt, [-0.17, 0.05, 0.1], [0.08, 0.06, 0.08], [0, 2, 0]),
    piece(ICO0, C.moss, [-0.02, 0.19, 0], [0.1, 0.04, 0.09], [0, 0.3, 0]),
  ])
}

function tuft() {
  const P = []
  const blades = [[0, 0, 0.24, 0, 0], [0.06, 0.03, 0.2, 0.3, -0.25], [-0.06, 0.02, 0.22, -0.3, 0.2], [0.02, -0.07, 0.18, -0.35, -0.1], [-0.04, 0.07, 0.17, 0.2, 0.35], [0.1, -0.04, 0.14, 0.4, 0.3]]
  blades.forEach(([x, z, h, rx, rz], i) =>
    P.push(piece(new THREE.CylinderGeometry(0, 0.032, h, 4), i % 2 ? C.leafLt : C.leaf, [x, h / 2, z], [1, 1, 1], [rx, i, rz])))
  P.push(piece(ICO0, C.pinkDk, [0.1, 0.2, 0.04], [0.026, 0.026, 0.026]))
  P.push(piece(ICO0, C.cream, [-0.09, 0.17, 0.02], [0.024, 0.024, 0.024]))
  return build(P)
}

function bush() {
  return build([
    blob(0.17, C.leaf, 0, 0.14, 0, 0.8),
    blob(0.12, C.leafDk, 0.15, 0.1, 0.05, 0.8),
    blob(0.1, C.leafLt, -0.14, 0.1, -0.06, 0.8),
    piece(ICO0, C.pinkDk, [0.09, 0.27, 0.05], [0.035, 0.035, 0.035]),
    piece(ICO0, C.pinkLt, [-0.05, 0.28, 0.09], [0.032, 0.032, 0.032]),
    piece(ICO0, C.cream, [0.0, 0.22, 0.16], [0.03, 0.03, 0.03]),
  ])
}

/* ---------- buildings ---------- */
// a square hip roof: 4-sided cone turned to sit flat on the walls
const roof = (r, h, col, y) => piece(new THREE.CylinderGeometry(0.02, r, h, 4), col, [0, y, 0], [1, 1, 1], [0, Math.PI / 4, 0])

// small two-tier shrine hall: stone plinth, plaster walls with glowing lattice, red posts, slate hip roofs
function shrine() {
  const P = [
    box(0.92, 0.1, 0.82, C.stoneDk, 0, 0.05, 0),
    box(0.7, 0.34, 0.6, C.plaster, 0, 0.27, 0),
    box(0.5, 0.15, 0.02, C.glow, 0, 0.3, 0.31), box(0.02, 0.15, 0.4, C.glow, 0.36, 0.3, 0), // windows face the camera
    box(0.96, 0.035, 0.84, C.slateDk, 0, 0.47, 0),
    roof(0.6, 0.24, C.slate, 0.6),
    box(0.36, 0.17, 0.3, C.plaster, 0, 0.8, 0),
    box(0.2, 0.08, 0.02, C.glow, 0, 0.8, 0.16), box(0.02, 0.08, 0.2, C.glow, 0.185, 0.8, 0),
    box(0.5, 0.03, 0.44, C.slateDk, 0, 0.9, 0),
    roof(0.33, 0.2, C.slate, 1.0),
    piece(ICO0, C.gold, [0, 1.13, 0], [0.04, 0.05, 0.04]),
  ]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(0.05, 0.34, 0.05, C.red, sx * 0.35, 0.27, sz * 0.3))
  return build(P)
}

// three-tier pagoda with a golden spire
function pagoda() {
  const P = [box(0.62, 0.08, 0.62, C.stoneDk, 0, 0.04, 0)]
  let y = 0.08
  for (let k = 0; k < 3; k++) {
    const s = 0.46 - k * 0.1, h = 0.2 - k * 0.012
    P.push(box(s * 0.8, h, s * 0.8, k % 2 ? C.cream : C.plaster, 0, y + h / 2, 0))
    P.push(box(s * 0.4, h * 0.5, 0.02, C.glow, 0, y + h / 2, s * 0.4), box(0.02, h * 0.5, s * 0.4, C.glow, s * 0.4, y + h / 2, 0))
    P.push(box(s * 0.95, 0.03, s * 0.95, C.red, 0, y + h, 0))
    P.push(roof(s * 0.86, 0.15, C.slate, y + h + 0.085))
    y += h + 0.15
  }
  P.push(cyl(0.012, 0.014, 0.3, 6, C.gold, 0, y + 0.13, 0))
  for (const dy of [0.06, 0.13, 0.2]) P.push(cyl(0.04 - dy * 0.1, 0.04 - dy * 0.1, 0.012, 8, C.gold, 0, y + dy, 0))
  return build(P)
}

// the final gate: a large torii (opening faces local +Z); the glowing disc inside is built separately in World.jsx
function portal() {
  const P = []
  for (const sx of [-1, 1]) {
    P.push(cyl(0.065, 0.08, 1.5, 10, C.red, sx * 0.64, 0.8, 0), box(0.24, 0.1, 0.24, C.stoneDk, sx * 0.64, 0.05, 0))
    P.push(box(0.2, 0.05, 0.2, C.black, sx * 0.64, 0.12, 0))
  }
  P.push(box(1.5, 0.08, 0.1, C.red, 0, 1.16, 0))                    // nuki (lower tie beam)
  P.push(box(0.12, 0.26, 0.05, C.gold, 0, 1.3, 0))                  // name plaque
  P.push(box(1.9, 0.07, 0.15, C.red, 0, 1.5, 0))                    // shimaki
  P.push(box(2.15, 0.09, 0.22, C.black, 0, 1.58, 0))                // kasagi (top beam)
  for (const sx of [-1, 1]) P.push(box(0.3, 0.07, 0.22, C.black, sx * 1.12, 1.63, 0, 0, sx * 0.28)) // upturned ends
  P.push(box(0.1, 0.07, 0.17, C.gold, 0, 1.66, 0))
  return build(P)
}

// inverted hexagonal rock that hangs under a floating island (top face at y = 0, tip at y = -1); light at the top, dark at the tip
function islandRock() {
  const g = new THREE.ConeGeometry(1, 1, 7, 1).toNonIndexed()
  g.deleteAttribute('uv'); g.rotateX(Math.PI); g.translate(0, -0.5, 0)
  const p = g.attributes.position, a = new Float32Array(p.count * 3), top = new THREE.Color('#cdbfa6'), tip = new THREE.Color('#6d6377'), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) { c.copy(top).lerp(tip, -p.getY(i)); a.set([c.r, c.g, c.b], i * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return g
}

const BUILDERS = { islandRock, shrine, pagoda, portal, sakura, cubeTree, bonsai, bamboo, shrub, pine, mossRock, rail, hokora, stoneLantern, gardenLantern, woodLantern, torii, rock, tuft, bush }

// geometries are built lazily, once
let _cache
export function decorGeometries() {
  if (_cache) return _cache
  _cache = {}
  for (const k in BUILDERS) _cache[k] = BUILDERS[k]()
  return _cache
}
