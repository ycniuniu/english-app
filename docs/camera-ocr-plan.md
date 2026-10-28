# 拍照翻译方案

董事长定的分工就一句话：**能离线就离线；离线做不到的，才交给服务器做识别。**

三条路不要混：

1. **苹果手机和安卓手机的正式应用**：文字识别放在手机里做，翻译也用系统自带的离线翻译。不连我们的服务器。
2. **微信小程序**：安装包装不下识别模型，只能拍照或选图之后上传服务器。服务器识别，并直接返回「原文一行、中文一行」。
3. **现在这个网页版**（本仓库，浏览器里打开的页面）：尽量把识别模型下载一次后留在手机里，之后没网也能识别。翻译仍走页面里原来的联网翻译。真正从拍照到译文全程离线，以以后的手机应用为准。小程序必须走服务器。

本文件给工程看。下面的代码是示例，方便照着做。英文只保留产品名、接口名和文件名。

---

## 1. 苹果手机应用

目标：不靠服务器。拍照、认字、译成中文，都在手机上完成。

### 拍照

用系统的相机框架（AVFoundation）。后置相机拍一张，拿到照片，再送给识别。不要把译文画回照片上，只要文字列表。

需要在系统里说明使用相机的原因。用户拒绝相机时，改从相册选一张。

```swift
import AVFoundation
import UIKit

final class PhotoTaker: NSObject, AVCapturePhotoCaptureDelegate {
    let session = AVCaptureSession()
    private let output = AVCapturePhotoOutput()
    var onPhoto: ((UIImage) -> Void)?

    func start() throws {
        session.beginConfiguration()
        session.sessionPreset = .photo
        guard
            let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input),
            session.canAddOutput(output)
        else { return }
        session.addInput(input)
        session.addOutput(output)
        session.commitConfiguration()
        session.startRunning()
    }

    func shoot() {
        let settings = AVCapturePhotoSettings()
        output.capturePhoto(with: settings, delegate: self)
    }

    func photoOutput(_ output: AVCapturePhotoOutput,
                     didFinishProcessingPhoto photo: AVCapturePhoto,
                     error: Error?) {
        guard error == nil, let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        onPhoto?(image)
    }
}
```

### 识别

主方案是手机端的 PaddleOCR，用移动端模型，不要用又大又慢的服务器模型。

- 检测：`PP-OCRv5_mobile_det`（约 4.6 MB）
- 识别：`PP-OCRv5_mobile_rec`（约 15.9 MB）

这一套识别模型同时覆盖英文和日文。模型随安装包放进应用里，打开就能用，不必再下载。手机上的推理格式一般要先从官方模型转成手机推理包（常见是 Paddle Lite 的包），放在应用资源里，路径用本地文件，不写服务器地址。

识别结果按行排好：上面原文，准备送给下一步翻译。

```swift
struct TextLine {
    let source: String
}

protocol TextReader {
    func read(image: UIImage) throws -> [TextLine]
}

/// 包装官方移动端示例。模型文件在安装包内。
final class PaddleTextReader: TextReader {
    private let engine: PaddleOcrEngine

    init() throws {
        let det = Bundle.main.url(forResource: "PP-OCRv5_mobile_det", withExtension: "nb")!
        let rec = Bundle.main.url(forResource: "PP-OCRv5_mobile_rec", withExtension: "nb")!
        engine = try PaddleOcrEngine(detection: det, recognition: rec)
    }

    func read(image: UIImage) throws -> [TextLine] {
        try engine.recognize(image).map { TextLine(source: $0.text) }
    }
}
```

`PaddleOcrEngine` 不是系统自带的名字，是应用自己包一层，里面调用官方手机端示例的加载和识别。模型加载失败时不要偷偷改走服务器。

### 翻译

用系统翻译框架（Translation，需要较新的系统，按 iOS 18 来做）。英文或日文译成简体中文。语言包由系统下载到手机里，之后可离线。这不是我们的服务器。

用户还没装语言包时，让系统弹出下载。下载完成前不要假装已经译好。

```swift
import Translation

func makeConfiguration(source: String) -> TranslationSession.Configuration {
    let script = source.containsHiraganaOrKatakana || source.hasChineseCharacters
        ? Locale.Language(identifier: "ja")
        : Locale.Language(identifier: "en")
    return TranslationSession.Configuration(source: script, target: Locale.Language(identifier: "zh-Hans"))
}

// 在界面上对每一行挂上 translationTask。
// session.translate(原文) 的结果就是这一行的中文。
```

只有汉字、没有假名时，按日文处理（店招、站名很常见）。有假名一定是日文。英文字母更多则按英文。

### 备选

系统也有自己的文字识别（Vision）。只在 PaddleOCR 模型损坏、加载失败时才用，不作为主路径。识别之后仍然走上面的系统离线翻译。

```swift
import Vision

func visionFallback(_ image: CGImage) async throws -> [String] {
    try await withCheckedThrowingContinuation { continuation in
        let request = VNRecognizeTextRequest { request, error in
            if let error { continuation.resume(throwing: error); return }
            let lines = (request.results as? [VNRecognizedTextObservation])?
                .compactMap { $0.topCandidates(1).first?.string } ?? []
            continuation.resume(returning: lines)
        }
        request.recognitionLanguages = ["ja-JP", "en-US"]
        let handler = VNImageRequestHandler(cgImage: image)
        do { try handler.perform([request]) } catch { continuation.resume(throwing: error) }
    }
}
```

---

## 2. 安卓手机应用

同样不靠服务器。拍照用 CameraX，识别用同一套 PaddleOCR 移动端模型，翻译用系统机器学习套件里的离线翻译（ML Kit Translate）。

### 拍照

后置相机，拍完得到一张图，再识别。译文不要画在图上。

```kotlin
private fun bindCamera(provider: ProcessCameraProvider, previewView: PreviewView) {
    val preview = Preview.Builder().build().also {
        it.setSurfaceProvider(previewView.surfaceProvider)
    }
    val capture = ImageCapture.Builder().build()
    provider.unbindAll()
    provider.bindToLifecycle(
        this,
        CameraSelector.DEFAULT_BACK_CAMERA,
        preview,
        capture,
    )
    val file = File(cacheDir, "shot.jpg")
    capture.takePicture(
        ImageCapture.OutputFileOptions.Builder(file).build(),
        ContextCompat.getMainExecutor(this),
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                val bitmap = BitmapFactory.decodeFile(file.absolutePath)
                showBilingual(readAndTranslate(bitmap))
            }
            override fun onError(exception: ImageCaptureException) {
                showMessage("没有拍成，请再试一次。")
            }
        },
    )
}
```

相册选图走系统选图，拿到图之后走同一条识别和翻译。

### 识别

模型与苹果手机相同，打进安装包：

- `PP-OCRv5_mobile_det`
- `PP-OCRv5_mobile_rec`

用官方安卓示例把模型转成手机推理包，从本地路径加载。没有网也能认。

```kotlin
class PaddleTextReader(context: Context) {
    private val predictor = OcrPredictorNative()

    init {
        val dir = context.filesDir
        copyAsset(context, "PP-OCRv5_mobile_det.nb", File(dir, "det.nb"))
        copyAsset(context, "PP-OCRv5_mobile_rec.nb", File(dir, "rec.nb"))
        predictor.init(File(dir, "det.nb").path, File(dir, "rec.nb").path, "", false)
    }

    fun read(bitmap: Bitmap): List<String> {
        return predictor.forward(bitmap).map { it.text }.filter { it.isNotBlank() }
    }
}
```

`OcrPredictorNative` 对应官方手机示例里的本地识别入口。不要把照片上传。

### 翻译

英文、日文分别准备到简体中文的离线语言包。语言包存在手机里。第一次需要下载语言包，下完就能离线，仍然不是我们的服务器。

```kotlin
fun translator(source: String): Translator {
    val from = if (source.hasKana() || source.hasKanji()) {
        TranslateLanguage.JAPANESE
    } else {
        TranslateLanguage.ENGLISH
    }
    val options = TranslatorOptions.Builder()
        .setSourceLanguage(from)
        .setTargetLanguage(TranslateLanguage.CHINESE)
        .build()
    return Translation.getClient(options)
}

suspend fun translateLine(translator: Translator, line: String): String {
    val conditions = DownloadConditions.Builder().build()
    translator.downloadModelIfNeeded(conditions).await()
    return translator.translate(line).await()
}
```

每一行原文下面放中文，列表展示。

---

## 3. 网页版（这次改动）

仓库是 Vite 和 React 做的网页。底栏仍然只有「翻译」和「单词」，没有新的一栏。拍照入口加在现有「翻译」页里。学习进度用的本地存储键（`kaikou.*`）没有改，原来的输入翻译、发音、单词也不改行为。

### 为什么用这套模型

浏览器里比较过两条路：

- 旧的浏览器包（paddle.js）在网页里会直接报错，而且认不了日文。
- 官方网页套件可以跑移动端模型，底层是 ONNX，用浏览器里的 ONNX Runtime Web。检测和识别各一个模型，英文和日文共用这一套识别模型。

采用后者。模型文件：

| 用途 | 名称 | 体积 |
| --- | --- | --- |
| 检测文字区域 | PP-OCRv5_mobile_det | 4.6 MB |
| 识别英文和日文 | PP-OCRv5_mobile_rec | 15.9 MB |
| 识别模型合计 |  | 20.5 MB |
| 推理运行时 | 单线程网页汇编文件 | 14.2 MB |
| 图像处理组件 | 随套件加载 | 9.9 MB |
| 第一次点拍照大约要下载 |  | 44.6 MB |

体积按仓库里的文件实际字节数换算，保留一位小数。运行组件里还有一份很小的配套脚本（约 24 KB），已经算进 44.6 MB。

第一次要下的东西多，是因为识别模型不能塞进普通脚本里，运行组件也不能省。下完写入浏览器缓存，同一台手机再次识别不再下载模型。缓存名不是学习进度那组键。

按常见网速估算第一次等待（只算下载，不算手机算字的时间）：

- 每秒 10 兆比特：约 37 秒
- 每秒 20 兆比特：约 19 秒
- 每秒 50 兆比特：约 7 秒

这是用体积除以网速得到的，不是某一次秒表。网差会更久。模型下完之后，手机还要花几秒到十几秒把字认出来，老手机更慢。

多线程运行需要网站额外发送隔离用的响应头。这次不改部署配置，所以网页固定单线程。这样也更适合苹果手机浏览器，以及加到主屏幕之后的全屏打开方式。

### 页面上怎么走

1. 翻译页有「拍照」和「选图」。拍照调用系统相机；选图从相册挑一张。用的是系统文件入口，不另外向网页要摄像头权限。加到主屏幕后，这个入口仍然能拍照。
2. 照片不上传。浏览器加载上面的模型，在手机里认出一行行字。
3. 每一行调用现在的翻译函数。有假名，或几乎都是汉字，按日文译成中文；英文字母更多，按英文译成中文。原来输入框里的中英自动判断没有改。
4. 列表里每一行上面是原文，下面是中文。不在照片上盖字。

模型放在网站自己的目录 `public/ocr/`，避免从别的网站拉取时被浏览器拦住。第一次下载后进缓存。

这次改动的主要文件：

- `src/PhotoTranslate.jsx`：翻译页上的拍照、选图和双语列表
- `src/ocr-runtime.js`：加载官方网页识别，单线程
- `src/ocr-models.js`：模型名字、体积、第一次等待的算法
- `src/ocr-text.js`：按行整理文字，判断英文还是日文
- `src/ocr-cache.js`：模型下载后缓存
- `src/photo-translate.js`：逐行调用现有翻译
- `src/translate.js`：翻译函数可以额外指定方向；不指定时和原来一样
- `src/TranslatePanel.jsx`：在翻译页挂上拍照入口
- `src/miniapp-ocr.js`：小程序接口形状和占位返回，网页本身不调用
- `public/ocr/`：两个模型文件
- `test/photo-ocr.test.js`：上述逻辑的测试

网页版的限制要讲清楚：识别可以在缓存之后离线；翻译仍然要联网，因为页面没有、也不准备内置一个翻译模型。全程离线只在第 1、2 节的手机应用里做。

---

## 4. 微信小程序

小程序做不到手机里离线识别，只能走服务器。原因是安装包体积，不是功能不想做。

### 拍照能力

两种官方做法：

- 选图或拍照：`wx.chooseMedia`。可以同时允许相册和相机。
- 页内取景：`camera` 组件，适合做取景框。拍完仍要拿到临时文件再上传。

```javascript
wx.chooseMedia({
  count: 1,
  mediaType: ['image'],
  sourceType: ['album', 'camera'],
  success(res) {
    const file = res.tempFiles[0]
    wx.uploadFile({
      url: 'https://已备案域名/api/photo-translate',
      filePath: file.tempFilePath,
      name: 'image',
      success(upload) {
        const data = JSON.parse(upload.data)
        // data.lines：每一项是 { source, zh }
      },
    })
  },
})
```

页内相机还要在配置里写明用途，例如相机权限说明：「用于拍摄需要翻译的文字」。

### 为什么不能把模型放进小程序

微信当前限制（开放文档，分包说明）：

- 单个主包、单个分包都不能超过 **2MB**
- 全部加起来不超过 **30MB**；若是服务商代开发，不超过 **20MB**

识别模型合计 **20.5 MB**，光识别模型就已经超过单个包的 2MB，也占满或超过总上限。再加上运行组件，更装不下。模型也不能拆成许多 2MB 的碎片在小程序里直接跑。所以小程序不能内置 PaddleOCR，必须把照片交给服务器，服务器用同一套 PaddleOCR 移动端模型来认。

### 接口形状

这次仓库不实现真正的服务器，只把形状定下来，并在 `src/miniapp-ocr.js` 里留了一个假的返回，方便以后对接。网页版不会走这个接口。

正式接口：

- 方法：POST
- 路径：`/api/photo-translate`
- 照片：表单字段 `image`（文件）。用上传，不用把整张照片塞进普通请求，避免请求体过小装不下。
- 成功时返回：

```json
{
  "ok": true,
  "lines": [
    { "source": "Hello", "zh": "你好" },
    { "source": "駅", "zh": "车站" }
  ]
}
```

- 失败时返回：

```json
{ "ok": false, "error": "没有识别到文字" }
```

`source` 是原文（英文或日文），`zh` 是中文。小程序只负责把这个列表画出来，不在图上盖字。

占位代码里的假返回不看照片内容，固定给出上面两行，用来把字段定死。服务器接上之后必须换成真的识别和翻译。

### 域名、备案、隐私

- 地址必须是加密访问（https），不能写数字地址，不能写本机地址。
- 服务器放在中国大陆时，域名要完成备案。
- 在小程序后台把该域名配进上传文件的合法域名。若同时用普通请求，也要配进请求合法域名。
- 在用户隐私保护指引里声明：使用摄像头；收集选中的照片或视频。没声明时，正式版会被拦住。
- 用户拒绝相机或相册时，要有一句中文说明，不能反复弹窗强迫同意。
- 照片传到自己的服务器，只为这一次识别和翻译，不要拿去别的用途。接口说明里写清保存多久、谁能看。

### 离线翻译还要另配模型

小程序就算以后想离线翻译，也得再带一个翻译模型。那个模型同样很大，安装包一样装不下。系统自带的离线翻译（第 1、2 节）小程序调用不到。

因此小程序这一条链路是：照片上传，服务器识别并翻译，一次返回原文和中文。不要在小程序里假装能离线。

网页版现有的翻译也是联网的，不能直接当成小程序的离线翻译。

---

## 5. 还做不到的地方

- 网页第一次使用要下载约 44.6 MB，弱网要等很久。
- 网页翻译仍要联网。缓存只覆盖识别模型。
- 网页为了不改部署配置，识别用单线程，比多线程慢。
- 竖排文字可能被并成一行。横排菜单、路牌是主要场景。
- 官方移动端模型的日文准确率低于中文和英文，模糊、手写、反光会认错。
- 识别很吃内存，太旧的手机会失败。
- 小程序没有服务器就不能用。本仓库的占位返回不是真识别。
- 苹果、安卓两节是给以后做应用的做法，这次网页改动没有包含那两个应用。
