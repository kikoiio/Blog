const clamp = (value) => Math.max(0, Math.min(1, value))
const smooth = (value) => value * value * (3 - 2 * value)

export function filmstripLayout(position = 0, reveal = 0, count = 0, viewportWidth = 1440) {
  const density = clamp((viewportWidth - 600) / 1000)
  const scale = 1 - (0.44 + 0.24 * density) * reveal
  const width = Math.max(320, viewportWidth)
  const gap = 0.06 * (1 - reveal) + Math.max(16 / width, 0.018) * reveal
  const radius = Math.ceil(1 + reveal * (1 + density)) + 1
  const center = Math.round(position)
  const start = Math.max(0, center - radius)
  const end = Math.min(count - 1, center + radius)

  const frames = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => {
    const slot = start + index
    const offset = slot - position
    const distance = Math.abs(offset)
    const depth = smooth(clamp(distance / 2)) * reveal
    const frameScale = scale * (1 - 0.36 * depth)
    const z = -140 * depth

    return {
      slot,
      scale: frameScale,
      x: 0,
      y: 7 * depth - 2 * reveal,
      z,
      rotation: -Math.sign(offset) * 18 * smooth(clamp(distance / 1.5)) * reveal,
      layer: Math.max(0, 100 - Math.round(distance * 10)),
      visible: false,
    }
  })

  if (!frames.length) return frames
  const planes = frames.map(frame => {
    const angle = frame.rotation * Math.PI / 180
    const halfWidth = frame.scale / 2
    const depth = halfWidth * width * Math.sin(angle)
    return {
      left: -halfWidth * Math.cos(angle),
      right: halfWidth * Math.cos(angle),
      leftProjection: 1200 / (1200 - frame.z - depth),
      rightProjection: 1200 / (1200 - frame.z + depth),
      centerProjection: 1200 / (1200 - frame.z),
    }
  })
  const anchor = frames.findIndex(frame => frame.slot === Math.floor(position))
  const fraction = position - Math.floor(position)

  // Keep the continuous scroll position centered while packing projected edges.
  if (fraction > 0 && anchor + 1 < frames.length) {
    const current = planes[anchor]
    const next = planes[anchor + 1]
    const ratio = current.rightProjection / next.leftProjection
    const distance = (current.right * current.rightProjection + gap) / next.leftProjection - next.left
    frames[anchor].x = -fraction * next.centerProjection * distance
      / ((1 - fraction) * current.centerProjection + fraction * next.centerProjection * ratio)
  }
  for (let index = anchor + 1; index < frames.length; index++) {
    const previous = planes[index - 1]
    const right = (frames[index - 1].x + previous.right) * previous.rightProjection
    frames[index].x = (right + gap) / planes[index].leftProjection - planes[index].left
  }
  for (let index = anchor - 1; index >= 0; index--) {
    const next = planes[index + 1]
    const left = (frames[index + 1].x + next.left) * next.leftProjection
    frames[index].x = (left - gap) / planes[index].rightProjection - planes[index].right
  }
  return frames.map((frame, index) => ({
    ...frame,
    visible: (frame.x + planes[index].right) * planes[index].rightProjection > -0.5
      && (frame.x + planes[index].left) * planes[index].leftProjection < 0.5,
  }))
}
