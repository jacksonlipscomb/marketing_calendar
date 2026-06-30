// Pick black or white text for maximum legibility on an arbitrary fill color.
//
// Category fill colors are user data (any hex), so a hard-coded `text-white` fails
// on light fills (e.g. the seeded amber #f59e0b). We compute the WCAG relative
// luminance of the fill and pick the text color that contrasts best.
//
// The crossover is L = 0.179 — the exact luminance where contrast against black
// equals contrast against white. Above it the fill is "light" → use black text;
// at or below → use white. (Do NOT use 0.5: it picks white far too often and
// leaves mid-light fills like amber unreadable.)

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, "")
  // Expand 3-digit shorthand (#abc → #aabbcc).
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

// sRGB channel (0..255) → linear-light component, per the WCAG definition.
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const rgb = parseHex(hex)
  // Unparseable input: default to white, which is safe on the default dark canvas.
  if (!rgb) return "#ffffff"
  const luminance =
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  return luminance > 0.179 ? "#000000" : "#ffffff"
}
