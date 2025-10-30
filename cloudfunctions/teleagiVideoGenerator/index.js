const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-9gu0w07d15cd3e8e'
})

// 配置参数
const ACCESS_KEY = 'ea4fe9ff62f2473d9bc620'
const SECRET_KEY = 'e211f813ac694d77de46425'
const REGION = 'BJ'
const EXPIRATION_IN_SECONDS = '43200'
const SIGNED_HEADERS = 'x-app-id'

const REQUEST_URL = ""

// 编码函数和其他函数保持不变...
// [保持原有的 normalize, generateCanonicalUri, generateCanonicalHeaders, generateSignature, imageToBase64, sendHttpRequest 函数]

// 主函数 - 只负责提交任务，立即返回
exports.main = async (event) => {
  console.log('=== 云函数开始执行 (仅提交任务) ===')
  
  const { imageUrl, prompt, isLocalImage = true } = event
  
  try {
    console.log('=== 开始提交图生视频任务 ===')
    
    // 参数验证
    if (!imageUrl) {
      throw new Error('缺少图片参数')
    }
    
    if (!prompt) {
      throw new Error('缺少提示词参数')
    }
    
    console.log('=== 步骤1: 处理图片数据 ===')
    let imageData
    
    if (isLocalImage) {
      console.log('下载图片并转换为Base64...')
      imageData = await imageToBase64(imageUrl)
      console.log('Base64数据长度:', imageData.length)
    } else {
      imageData = imageUrl
      console.log('使用已有的Base64数据')
    }
    
    console.log('=== 步骤2: 生成请求数据 ===')
    const seqId = `wx_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`
    const requestData = {
      "seq_id": seqId,
      "task_id": 30004,
      "image": [imageData],
      "image_type": 1,
      "prompt": prompt,
      "return_mode": 1,
      "resolution": [720, 720],
      "extra_message": [
        {
          "key": "video_seed",
          "value": 100
        },
        {
          "key": "negative_prompt",
          "value": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"
        }
      ]
    }
    
    console.log('请求数据生成完成')
    
    console.log('=== 步骤3: 生成签名 ===')
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-ID': ACCESS_KEY,
    }
    
    const canonicalUri = generateCanonicalUri(REQUEST_URL)
    const { canonicalHeaders, signedHeadersStr } = generateCanonicalHeaders(headers)
    const authorization = generateSignature(
      ACCESS_KEY, SECRET_KEY, REGION, timestamp, EXPIRATION_IN_SECONDS,
      'POST', canonicalUri, canonicalHeaders, signedHeadersStr
    )
    
    headers['Authorization'] = authorization
    console.log('签名生成完成')
    
    console.log('=== 步骤4: 调用API提交任务 ===')
    console.log('请求URL:', REQUEST_URL)
    
    const result = await sendHttpRequest(REQUEST_URL, { 
      method: 'POST',
      headers: headers 
    }, requestData)
    
    console.log('=== API响应 ===')
    console.log('响应状态码:', result.statusCode)
    console.log('完整响应:', JSON.stringify(result.data, null, 2))
    
    // 处理响应
    if (result.statusCode === 200) {
      const responseData = result.data
      
      if (responseData.code === "10000") {
        const requestId = responseData.requestId
        console.log('任务提交成功，requestId:', requestId)
        
        // 立即返回，不等待
        return {
          success: true,
          status: 'submitted',
          requestId: requestId,
          message: '任务已提交，2分钟后开始下载'
        }
      } else {
        console.log('API返回错误:', responseData)
        throw new Error(`API返回错误: code=${responseData.code}, message=${responseData.msg}`)
      }
    } else {
      console.log('HTTP请求失败，状态码:', result.statusCode)
      throw new Error(`HTTP请求失败: 状态码 ${result.statusCode}`)
    }
    
  } catch (error) {
    console.error('图生视频处理失败:', error)
    
    return {
      success: false,
      message: error.message
    }
  }
}
