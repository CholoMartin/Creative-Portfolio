// Lighting + colour grade for the garden: the ONE place to tune the "warm golden-hour, cosy sunlit" look.
// Everything here is plain lights and per-colour adjustments applied once at load: no post-processing, no shaders, no per-frame cost.
//
// Why no tone-mapping curve: the scene is lit fairly softly, and curves such as ACES / Neutral lift saturation in the darks and
// dull the pastels (they push greens toward neon and wood toward orange), so output stays plain linear -> sRGB (Canvas `flat`).
import * as THREE from 'three'

// Light rig. Sun = soft gold (not orange), a little lower than before so shadows lengthen; the sky/ground fill is warm cream and warm
// rose-mauve (was pink / cool lavender), which is what makes the shadows read as naturally warm and soft instead of purple-grey.
export const LIGHT = {
  sun: { color: '#ffe0b4', intensity: 1.35, position: [14, 11.5, 6] },
  hemi: { sky: '#fff1ea', ground: '#cdb0bc', intensity: 1.1 },
}

// Colour grade: [saturation multiplier, lightness shift, hue shift in degrees], applied in perceptual (sRGB) HSL, so each colour keeps its identity.
export const GRADE = {
  green: [1.16, 0.008, 2],   // leaves, bushes, pine, bamboo, grass: fresher, a touch more sunlit-yellow
  moss: [1.08, 0, 0],        // the thin ground moss was already vibrant: only a nudge
  stone: [1.45, -0.005, 2],  // low-saturation stone gets a bit richer and warmer
  wood: [1.2, 0.012, -3],    // fences / lanterns / torii posts: warmer, richer brown
  pink: [1, -0.035, 0],      // blossoms are already fully saturated, so deepen the lightness a hair instead
  yellow: [1, -0.035, 0],
}

const _c = new THREE.Color(), _h = { h: 0, s: 0, l: 0 }
export function grade(hex, kind) {
  const g = GRADE[kind]
  if (!g) return hex
  _c.set(hex).getHSL(_h, THREE.SRGBColorSpace)
  _c.setHSL((_h.h + g[2] / 360 + 1) % 1, Math.min(1, _h.s * g[0]), Math.min(1, Math.max(0, _h.l + g[1])), THREE.SRGBColorSpace)
  return '#' + _c.getHexString(THREE.SRGBColorSpace)
}
// grade a whole palette object: kinds = { key: kind }, keys not listed are left alone
export const gradePalette = (palette, kinds) => Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, kinds[k] ? grade(v, kinds[k]) : v]))
