type Vec3 = [number, number, number]

const RGB_TO_LMS: [Vec3, Vec3, Vec3] = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
]

const LMS_TO_RGB: [Vec3, Vec3, Vec3] = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
]

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export const rgbLinearToLms = (rgb: Vec3): Vec3 => {
  return [
    dot3(RGB_TO_LMS[0], rgb),
    dot3(RGB_TO_LMS[1], rgb),
    dot3(RGB_TO_LMS[2], rgb),
  ]
}

export const lmsToRgbLinear = (lms: Vec3): Vec3 => {
  return [
    dot3(LMS_TO_RGB[0], lms),
    dot3(LMS_TO_RGB[1], lms),
    dot3(LMS_TO_RGB[2], lms),
  ]
}
