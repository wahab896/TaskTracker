const GOLDEN_ANGLE = 137.5;
const SATURATION = 65;
const LIGHTNESS = 55;

/**
 * Generates a visually distinct color for a topic based on its position
 * (how many topics existed before it). Uses golden-angle hue spacing so
 * colors stay well-distributed even as more topics are added later,
 * without needing to recalculate existing topics' colors.
 */
export function generateTopicColor(topicIndex: number): string {
  const hue = (topicIndex * GOLDEN_ANGLE) % 360;
  return hslToHex(hue, SATURATION, LIGHTNESS);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}