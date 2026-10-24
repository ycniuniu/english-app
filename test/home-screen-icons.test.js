import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import test from 'node:test'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function readPng(path) {
  const buf = readFileSync(path)
  assert.ok(buf.subarray(0, 8).equals(PNG), `${path} is not a PNG`)
  let offset = 8
  let width = 0
  let height = 0
  let bit = 0
  let color = 0
  const idat = []
  let sawIend = false
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buf.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bit = data[8]
      color = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'tRNS') {
      assert.fail(`${path} has a tRNS chunk, so it is not fully opaque`)
    } else if (type === 'IEND') {
      sawIend = true
      break
    }
    offset += 12 + length
  }
  assert.equal(bit, 8, path)
  assert.equal(color, 2, `${path} should be 24-bit RGB with no alpha`)
  assert.ok(sawIend, path)
  const channels = 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = 1 + width * channels
  assert.equal(raw.length, stride * height, path)
  const pixels = Buffer.alloc(width * height * channels)
  let prev = Buffer.alloc(width * channels)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * stride]
    const scan = raw.subarray(y * stride + 1, (y + 1) * stride)
    const recon = Buffer.alloc(width * channels)
    for (let x = 0; x < width * channels; x += 1) {
      const left = x >= channels ? recon[x - channels] : 0
      const up = prev[x]
      const upLeft = x >= channels ? prev[x - channels] : 0
      if (filter === 0) recon[x] = scan[x]
      else if (filter === 1) recon[x] = (scan[x] + left) & 255
      else if (filter === 2) recon[x] = (scan[x] + up) & 255
      else if (filter === 3) recon[x] = (scan[x] + ((left + up) >> 1)) & 255
      else if (filter === 4) recon[x] = (scan[x] + paeth(left, up, upLeft)) & 255
      else assert.fail(`${path} has an unknown PNG filter ${filter}`)
    }
    recon.copy(pixels, y * width * channels)
    prev = recon
  }
  return { width, height, pixels, bytes: buf.length }
}

function pixel(png, x, y) {
  const i = (y * png.width + x) * 3
  return [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2]]
}

const ICONS = {
  'public/apple-touch-icon.png': 180,
  'public/apple-touch-icon-167.png': 167,
  'public/apple-touch-icon-152.png': 152,
  'public/apple-touch-icon-120.png': 120,
  'public/apple-touch-icon-precomposed.png': 180,
  'public/apple-touch-icon-180x180.png': 180,
  'public/apple-touch-icon-167x167.png': 167,
  'public/apple-touch-icon-152x152.png': 152,
  'public/apple-touch-icon-120x120.png': 120,
  'public/icon-192.png': 192,
  'public/icon-512.png': 512,
}

test('home screen icons are opaque full-bleed PNGs of the cinnabar mark', () => {
  for (const [path, size] of Object.entries(ICONS)) {
    const png = readPng(path)
    assert.equal(png.width, size, path)
    assert.equal(png.height, size, path)
    assert.ok(png.bytes > 500, `${path} is only ${png.bytes} bytes`)
    const colors = new Set()
    for (let i = 0; i < png.pixels.length; i += 3) {
      colors.add((png.pixels[i] << 16) | (png.pixels[i + 1] << 8) | png.pixels[i + 2])
    }
    assert.ok(colors.size > 16, `${path} has only ${colors.size} colors`)
    for (const [x, y] of [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1],
    ]) {
      assert.deepEqual(pixel(png, x, y), [196, 71, 47], `${path} corner ${x},${y}`)
    }
    let white = 0
    for (let i = 0; i < png.pixels.length; i += 3) {
      if (png.pixels[i] > 240 && png.pixels[i + 1] > 240 && png.pixels[i + 2] > 240) white += 1
    }
    const ratio = white / (size * size)
    assert.ok(ratio > 0.03 && ratio < 0.4, `${path} white ratio ${ratio}`)
  }
})

test('manifest and apple touch links point at those icons', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  assert.equal(manifest.name, '开口')
  assert.equal(manifest.short_name, '开口')
  assert.equal(manifest.id, '/')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2)
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png')
    assert.match(icon.purpose, /\bany\b/)
    const [w, h] = icon.sizes.split('x').map(Number)
    assert.equal(w, h)
    const png = readPng(`public${icon.src}`)
    assert.equal(png.width, w)
    assert.equal(png.height, h)
  }

  const html = readFileSync('index.html', 'utf8')
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon-167\.png" sizes="167x167"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon-152\.png" sizes="152x152"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon-120\.png" sizes="120x120"/)
  assert.match(html, /rel="icon" href="\/favicon\.ico"/)
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/)
  const ico = readFileSync('public/favicon.ico')
  assert.equal(ico.readUInt16LE(0), 0)
  assert.equal(ico.readUInt16LE(2), 1)
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/)
  assert.match(html, /name="apple-mobile-web-app-title" content="开口"/)
  assert.equal(html.includes('serviceWorker'), false)
  assert.equal(html.includes('service-worker'), false)
})
