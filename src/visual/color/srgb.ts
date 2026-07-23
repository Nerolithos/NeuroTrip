const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

export const srgbToLinear = (channel: number) => {
  const c = clamp01(channel)
  if (c <= 0.04045) {
    return c / 12.92
  }
  return Math.pow((c + 0.055) / 1.055, 2.4)
}

export const linearToSrgb = (channel: number) => {
  const c = clamp01(channel)
  if (c <= 0.0031308) {
    return c * 12.92
  }
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

export const decodeRgb8 = (r: number, g: number, b: number): [number, number, number] => {
  return [srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]
}

export const encodeRgb8 = (r: number, g: number, b: number): [number, number, number] => {
  return [linearToSrgb(r) * 255, linearToSrgb(g) * 255, linearToSrgb(b) * 255]
}
