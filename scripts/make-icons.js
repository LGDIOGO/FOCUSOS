/**
 * Gera os ícones PNG do app (iOS exige PNG no apple-touch-icon; Android/Chrome
 * pedem 192 e 512 no manifest). Node puro, só `zlib`: sem dependências.
 * Uso: node scripts/make-icons.js
 * Desenho: quadrado branco de cantos arredondados com um losango preto (igual ao favicon.svg).
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Distância assinada de um quadrado arredondado (centro cx,cy; meia-largura h; raio r).
function sdRoundBox(px, py, cx, cy, h, r) {
  const qx = Math.abs(px - cx) - (h - r)
  const qy = Math.abs(py - cy) - (h - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

// Cobertura suave (anti-alias) a partir da distância assinada.
const cover = (d) => Math.max(0, Math.min(1, 0.5 - d))

function icon(size, { maskable }) {
  const c = size / 2
  // maskable: fundo cobre tudo (o sistema recorta); normal: cantos arredondados como o favicon (9/32).
  const half = size / 2
  const radius = size * (9 / 32)
  const inner = (maskable ? 0.62 : 1) * size // área segura do losango
  const diamondHalf = (inner * (12 / 32)) * Math.SQRT1_2 * 1 // meia-diagonal do quadrado de 12/32 girado 45°
  const sq = (inner * (12 / 32)) / 2
  const sqRadius = inner * (2 / 32)
  return png(size, (x, y) => {
    const bg = maskable ? 1 : cover(sdRoundBox(x, y, c, c, half, radius))
    // rotaciona o ponto -45° para testar o quadrado girado 45°
    const dx = x - c, dy = y - c
    const rx = dx * Math.SQRT1_2 + dy * Math.SQRT1_2
    const ry = -dx * Math.SQRT1_2 + dy * Math.SQRT1_2
    const fg = cover(sdRoundBox(rx + c, ry + c, c, c, sq, sqRadius))
    const v = Math.round(255 * (1 - fg))
    return [v, v, v, Math.round(255 * bg)]
  })
}

const out = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(out, { recursive: true })
const files = {
  'icon-192.png': icon(192, { maskable: false }),
  'icon-512.png': icon(512, { maskable: false }),
  'icon-maskable-512.png': icon(512, { maskable: true }),
  'apple-touch-icon.png': icon(180, { maskable: true }), // iOS aplica o próprio arredondamento
}
for (const [name, buf] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), buf)
  console.log('ok', name, buf.length, 'bytes')
}
