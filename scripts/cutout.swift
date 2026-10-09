// Person cutout for a talking head: raw BGRA frames in on stdin, the same frames out on stdout
// with the person's matte written into the alpha channel. Free and local: macOS Vision.
// A frame with no face looking at the camera (b-roll, a screen recording) comes out fully
// transparent, and the bottom rows fade out so the cut-off torso has no hard edge.
//   swiftc -O cutout.swift -o cutout
//   ffmpeg -i in.mp4 -vf scale=W:H -f rawvideo -pix_fmt bgra - | ./cutout W H | ffmpeg -f rawvideo -pix_fmt bgra -s WxH -r 30 -i - ...
import CoreImage
import CoreVideo
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3, let w = Int(args[1]), let h = Int(args[2]) else {
  FileHandle.standardError.write("usage: cutout <width> <height>\n".data(using: .utf8)!)
  exit(1)
}
let frameBytes = w * h * 4
// One request for the whole stream: it is stateful, so the matte stays steady from frame to frame.
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
let context = CIContext(options: [.workingColorSpace: NSNull()])
var matte = [UInt8](repeating: 0, count: w * h)
var pixelBuffer: CVPixelBuffer?
CVPixelBufferCreate(nil, w, h, kCVPixelFormatType_32BGRA, [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary, &pixelBuffer)
let buffer = pixelBuffer!
let input = FileHandle.standardInput, output = FileHandle.standardOutput

func readFrame() -> Data? {
  var data = Data(capacity: frameBytes)
  while data.count < frameBytes {
    let chunk = input.readData(ofLength: frameBytes - data.count)
    if chunk.isEmpty { return nil }
    data.append(chunk)
  }
  return data
}

// Tighten the matte: the soft outer edge carries the old background (bright sky reads as a halo on a dark board).
let levels: [UInt8] = (0..<256).map { v in
  let t = min(1, max(0, (Double(v) / 255 - 0.35) / 0.5))
  return UInt8((t * t * (3 - 2 * t) * 255).rounded())
}
let fadeRows = h / 9, bridge = 10   // bottom fade height; a face lost for fewer than `bridge` frames either side is a blink, not b-roll
let faces = VNDetectFaceRectanglesRequest()
var waiting: [Data] = [], flags: [Bool] = [], written = 0

func flush(upTo end: Int, atEnd: Bool) {
  while written < end {
    let i = written
    let past = flags[max(0, i - bridge)..<i].contains(true)
    let last = min(flags.count - 1, i + bridge)
    let future = i < last ? flags[(i + 1)...last].contains(true) : atEnd
    var frame = waiting.removeFirst()
    if !(flags[i] || (past && future)) {
      frame.withUnsafeMutableBytes { raw in
        let px = raw.bindMemory(to: UInt8.self)
        for k in 0..<(w * h) { px[k * 4 + 3] = 0 }
      }
    }
    output.write(frame)
    written += 1
  }
}

while var frame = readFrame() {
  CVPixelBufferLockBaseAddress(buffer, [])
  let base = CVPixelBufferGetBaseAddress(buffer)!, stride = CVPixelBufferGetBytesPerRow(buffer)
  frame.withUnsafeBytes { src in
    for y in 0..<h { memcpy(base + y * stride, src.baseAddress! + y * w * 4, w * 4) }
  }
  CVPixelBufferUnlockBaseAddress(buffer, [])
  try VNImageRequestHandler(cvPixelBuffer: buffer).perform([request, faces])
  if let mask = request.results?.first?.pixelBuffer {
    let image = CIImage(cvPixelBuffer: mask)
    let fitted = image.transformed(by: CGAffineTransform(scaleX: CGFloat(w) / image.extent.width, y: CGFloat(h) / image.extent.height))
    context.render(fitted, toBitmap: &matte, rowBytes: w, bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .R8, colorSpace: nil)
  } else {
    matte.withUnsafeMutableBufferPointer { $0.update(repeating: 0) }
  }
  frame.withUnsafeMutableBytes { raw in
    let px = raw.bindMemory(to: UInt8.self)
    for y in 0..<h {
      let fade = y < h - fadeRows ? 256 : (h - 1 - y) * 256 / fadeRows
      for x in 0..<w { px[(y * w + x) * 4 + 3] = UInt8(Int(levels[Int(matte[y * w + x])]) * fade / 256) }
    }
  }
  // A real talking-head frame has a large face in it; anything else is a cutaway.
  flags.append((faces.results ?? []).contains { $0.boundingBox.height >= 0.2 })
  waiting.append(frame)
  flush(upTo: flags.count - bridge, atEnd: false)
}
flush(upTo: flags.count, atEnd: true)
