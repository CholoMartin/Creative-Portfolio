// ---- LEVEL DATA: edit this file to reshape the path and the milestones ----
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const LETTER = { U: 'up', D: 'down', L: 'left', R: 'right' }

// One letter per tile step. Five legs of six steps: four checkpoints (every 6th tile) and the portal at the end.
// Keep parallel segments 2+ tiles apart so the path doesn't touch itself.
const PATH = 'RRRUUU' + 'RRRDDD' + 'RRRUUU' + 'RRRDDD' + 'RRRUUU'

export const CELLS = [{ x: 0, z: 0 }]
for (const ch of PATH) {
  const [dx, dz] = DIRS[LETTER[ch]]
  const p = CELLS[CELLS.length - 1]
  CELLS.push({ x: p.x + dx, z: p.z + dz })
}
export const INDEX = new Map(CELLS.map((c, i) => [c.x + ',' + c.z, i]))
// grid -> world, centred on the level's bounding box
const bb = CELLS.reduce((b, c) => ({ x0: Math.min(b.x0, c.x), x1: Math.max(b.x1, c.x), z0: Math.min(b.z0, c.z), z1: Math.max(b.z1, c.z) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 })
const CX = (bb.x0 + bb.x1) / 2, CZ = (bb.z0 + bb.z1) / 2
export const wp = (c) => [c.x - CX, 0, c.z - CZ]

// ---- CONTENT: edit these placeholders ----
// Drop your portrait into /public (e.g. public/portrait.jpg) and point `photo` at it.
export const PROFILE = { name: 'Cholo Martin', role: 'Graphic Designer', photo: '/Cholo.webp' }

// `at` = index of the tile along the path (0 is the start tile). `kind` picks the panel layout (see App.jsx).
export const CHECKPOINTS = [
  { at: 6, id: 'about', kind: 'about', title: 'ABOUT ME', text: "Welcome to my creative space! I'm Cholo, a graphic designer who loves bringing ideas to life through thoughtful visuals and creative storytelling. From branding to illustration, I enjoy exploring different ways to turn ideas into meaningful designs that connect, inspire, and leave a lasting impression." },
  { at: 12, id: 'work', kind: 'roles', title: 'WORK EXPERIENCE',
    roles: [
      { role: 'Graphic Designer', company: 'HPL Game Design, Philippines', desc: 'Designed and animated high-converting product layouts and digital assets for globally recognized brands, tailored for e-commerce platforms.' },
      { role: 'Admin Robot Tester / Graphic Designer', company: 'FrodoBots AI, Singapore', desc: 'Created a website for the Scavenger Hunt and NFT collection, providing detailed information about Earth Rovers and digital collectibles.' },
      { role: 'Graphic Designer', company: 'SWITS, Philippines', desc: 'Built a strong foundation in graphic design by learning the fundamentals and creating numerous promotional posters and social media graphics for the organization.' },
    ] },
  { at: 18, id: 'skills', kind: 'groups', title: 'SKILLS',
    groups: [
      { label: 'Technical', items: ['HTML', 'CSS', 'Excel', 'JavaScript', 'C# / .NET', 'ASP.NET Core MVC', 'SQL / MySQL', 'PHP', 'Data Management', 'Business Analytics'] },
      { label: 'Creative', items: ['Graphic Design', 'Illustration', 'Thumbnail Design', 'E-commerce Design', 'Motion Graphics', 'Image Manipulation', 'Layout & Composition', 'AI-Assisted Art Creation', 'UI/UX Design'] },
      { label: 'Tools', items: ['Photoshop', 'Illustrator', 'After Effects', 'Canva', 'Figma', 'Scenario AI', 'Visual Studio'] },
    ] },
  { at: 24, id: 'contact', kind: 'links', title: 'CONTACT', text: 'Connect with me',
    links: [
      { label: 'Instagram', text: 'instagram.com/cholo.qt', href: 'https://www.instagram.com/cholo.qt' },
      { label: 'WhatsApp', text: 'wa.me/qr/YDGW5ACKT23HJ1', href: 'https://wa.me/qr/YDGW5ACKT23HJ1' },
      { label: 'Email', text: 'cholomartin2002@gmail.com', href: 'mailto:cholomartin2002@gmail.com' },
    ] },
]
// the final destination: no panel, just an activation animation
export const PORTAL = { at: CELLS.length - 1, id: 'portal', kind: 'portal' }
export const STOPS = [...CHECKPOINTS, PORTAL]
export const CP_AT = new Map(STOPS.map((c) => [c.at, c]))

// ---- platforms: the path plus a 3x3 pad around the start and every checkpoint ----
// One stone for everything: the path and the pads share a single base colour (see World.jsx -> Platforms).
// `tint` is only a multiplier on that colour, so it stays white; World adds a +-2% brightness wobble per tile.
const centers = [0, ...STOPS.map((c) => c.at)]
export const PAD_AT = centers
export const PATH_TINT = '#ffffff'
export const PAD_TINTS = ['#ffffff']
const plat = new Map(CELLS.map((c, i) => [c.x + ',' + c.z, { x: c.x, z: c.z, order: i, tint: PATH_TINT, pad: false }]))
centers.forEach((at) => {
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const x = CELLS[at].x + dx, z = CELLS[at].z + dz, k = x + ',' + z
      if (!plat.has(k)) plat.set(k, { x, z, order: at + 0.5, tint: PAD_TINTS[0], pad: true })
    }
})
export const PLATFORM = [...plat.values()]

// ---- garden decorations on the pads ----
// Types (built in decor.js): sakura, cubeTree, pine, bamboo, shrub, mossRock, stoneLantern, gardenLantern, woodLantern, torii,
//                            hokora, tuft, shrine, pagoda, rail
// Each pad gets a small hand-placed recipe: [dx, dz, type] relative to the checkpoint tile.
// The camera looks from +x/+z, so anything on the +x/+z side of the cube is "in front" of it.
// Placement rules (enforced below, so edits to the recipes can't block the view):
//   - never on the path, the checkpoint tile or the camera-facing corner (1,1)
//   - cells in front of the cube (dx+dz > 0) only take low pieces
//   - pieces that would hide the path tile diagonally behind them are flattened (shrub/rock -> tuft) or dropped
//   - railings only run along the OUTER edge of pad cells (never between two platform tiles), so they can't cross a route
// Heights are world units AFTER scaling. The cube is 0.56 tall, so lanterns/shrines read at ~2x cube, trees at ~2.5x.
const SCALE = { sakura: 1.45, cubeTree: 1.4, pine: 1.4, bamboo: 1.5, shrub: 1.3, mossRock: 1.4, stoneLantern: 1.75, gardenLantern: 0.85, woodLantern: 1.5,
  torii: 1.35, hokora: 1.3, tuft: 1.2, shrine: 1.1, pagoda: 1.1, rail: 1 }
const BASE_H = { sakura: 0.95, cubeTree: 0.9, pine: 1.0, bamboo: 1.05, shrub: 0.3, mossRock: 0.26, stoneLantern: 0.78, gardenLantern: 0.32, woodLantern: 0.7, torii: 0.66,
  hokora: 0.7, tuft: 0.24, shrine: 1.2, pagoda: 1.55, rail: 0.3 }
const HEIGHT = Object.fromEntries(Object.keys(BASE_H).map((k) => [k, BASE_H[k] * SCALE[k]]))
const LOW_MAX = 0.4     // tallest piece allowed in front of the cube
const BEHIND_MAX = 0.3  // tallest piece allowed directly in front of a path tile
const RECIPES = {
  0:  [[-1, -1, 'hokora'], [0, -1, 'stoneLantern'], [1, -1, 'pine'], [-1, 0, 'shrub'], [-1, 1, 'gardenLantern'], [0, 1, 'mossRock']],
  6:  [[-1, -1, 'sakura'], [0, -1, 'woodLantern'], [1, -1, 'shrub'], [-1, 0, 'mossRock'], [-1, 1, 'shrub']],
  12: [[-1, -1, 'pagoda'], [1, -1, 'stoneLantern'], [-1, 0, 'bamboo'], [0, 1, 'gardenLantern'], [-1, 1, 'shrub']],
  18: [[-1, -1, 'pine'], [0, -1, 'stoneLantern'], [1, -1, 'sakura'], [-1, 0, 'mossRock'], [-1, 1, 'shrub']],
  24: [[-1, -1, 'sakura'], [1, -1, 'woodLantern'], [-1, 0, 'torii'], [0, 1, 'gardenLantern'], [-1, 1, 'bamboo']],
  30: [[-1, -1, 'sakura'], [1, -1, 'pine'], [-1, 0, 'stoneLantern'], [1, 0, 'stoneLantern'], [-1, 1, 'shrub']], // the portal gate stands at (0,-1)
}
const FLAT = { shrub: 'tuft', mossRock: 'tuft' }
const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }

export const DECOR = []
const taken = new Set()
const add = (type, x, z, rot, extra = {}) =>
  DECOR.push({ type, x, z, ox: 0, oz: 0, rot, s: SCALE[type] * (0.96 + hash(z, x) * 0.08), tint: 0.95 + hash(x + 3, z + 7) * 0.05, ...extra })

for (const at of centers) {
  for (const [dx, dz, want] of RECIPES[at] || []) {
    const x = CELLS[at].x + dx, z = CELLS[at].z + dz
    if ((!dx && !dz) || (dx === 1 && dz === 1) || INDEX.has(x + ',' + z) || !plat.has(x + ',' + z)) continue
    const behind = INDEX.has(x - 1 + ',' + (z - 1)) // a path tile sits diagonally behind this cell
    let type = want, h = HEIGHT[type]
    if (h > LOW_MAX && (dx + dz > 0 || behind)) continue
    if (behind && h > BEHIND_MAX) { if (FLAT[type]) { type = FLAT[type]; h = HEIGHT[type] } else continue }
    if (behind && h > BEHIND_MAX) continue
    // gates face the checkpoint tile; everything else gets a random turn
    add(type, x, z, type === 'torii' ? Math.atan2(-dx, -dz) : hash(x, z) * Math.PI * 2)
    taken.add(x + ',' + z)
  }
}

// ground cover in pad cells the recipes left empty, pushed toward the outer corner so the open middle stays clear
for (const p of PLATFORM) {
  const k = p.x + ',' + p.z
  if (!p.pad || taken.has(k)) continue
  const ci = centers.find((at) => Math.abs(p.x - CELLS[at].x) <= 1 && Math.abs(p.z - CELLS[at].z) <= 1)
  const dx = p.x - CELLS[ci].x, dz = p.z - CELLS[ci].z
  if ((!dx && !dz) || (dx === 1 && dz === 1)) continue
  const r = hash(p.x * 1.3, p.z * 1.7)
  if (r < 0.7) add(r < 0.35 ? 'tuft' : 'mossRock', p.x, p.z, r * 40, { ox: Math.sign(dx) * 0.22, oz: Math.sign(dz) * 0.22, s: (r < 0.35 ? 1.2 : 1.0) * (0.9 + r * 0.2) })
}

// low wooden railings along the outer edge of pad cells (a neighbouring platform tile means no rail)
for (const p of PLATFORM) {
  if (!p.pad || INDEX.has(p.x + ',' + p.z)) continue
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (plat.has(p.x + nx + ',' + (p.z + nz))) continue
    add('rail', p.x, p.z, nx ? Math.PI / 2 : 0, { ox: nx * 0.47, oz: nz * 0.47, s: 1, tint: 1 })
  }
}
