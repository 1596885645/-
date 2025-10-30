const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-9gu0w07d15'
})

// 配置参数
const ACCESS_KEY = 'ea4fe9ff62f2473d9bc626ef340'
const SECRET_KEY = 'e211f813ac694dcda217a3b4bd5'
const REGION = 'BJ'
const EXPIRATION_IN_SECONDS = '4320'
const SIGNED_HEADERS = 'x-app-id'

const QUERY_URL = ""
const FILE_DOMAIN = ""

// 编码函数
function normalize(string, encodingSlash = true) {
  const safeChars = encodingSlash ? '~()*!\'/' : '~()*!\''
  return encodeURIComponent(string).replace(/[!'()*~]/g, (c) => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

function generateCanonicalUri(url) {
  const parsedUrl = new URL(url)
  return parsedUrl.pathname.split('/').map(segment => normalize(segment, false)).join('/')
}

function generateCanonicalHeaders(headers) {
  const signedHeadersList = SIGNED_HEADERS.split(';')
  const signedHeadersSet = new Set(signedHeadersList)
  const sortedHeaders = Object.entries(headers)
    .filter(([k]) => signedHeadersSet.has(k.toLowerCase()))
    .map(([k, v]) => [k.toLowerCase(), normalize(v.trim())])
    .sort((a, b) => a[0].localeCompare(b[0]))
  
  const canonicalHeaders = sortedHeaders.map(([k, v]) => `${k}:${v}`).join('\n')
  const signedHeadersStr = Array.from(signedHeadersSet).sort().join(';')
  
  return { canonicalHeaders, signedHeadersStr }
}

function generateSignature(accessKey, secretKey, region, timestamp, expirationInSeconds, method, canonicalUri, canonicalHeaders, signedHeadersStr, canonicalQueryString = '') {
  const crypto = require('crypto')
  
  const signingKeyStr = `teleai-cloud-auth-v1/${accessKey}/${region}/${timestamp}/${expirationInSeconds}`
  const signingKey = crypto.createHmac('sha256', secretKey).update(signingKeyStr).digest('hex')
  
  const canonicalRequest = `${method.toUpperCase()}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}`
  const signature = crypto.createHmac('sha256', signingKey).update(canonicalRequest).digest('hex')
  
  return `${signingKeyStr}/${signedHeadersStr}/${signature}`
}

// 使用 Node.js 的 https 模块发送请求 - 快速版本
function sendHttpRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const { URL } = require('url')
    
    const parsedUrl = new URL(url)
    
    let requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000 // 5秒超时，确保快速返回
    }
    
    if (options.method === 'GET' && data) {
      const queryParams = new URLSearchParams(data).toString()
      requestOptions.path += '?' + queryParams
    }
    
    console.log('发送HTTP请求，超时时间:', requestOptions.timeout)
    
    const req = https.request(requestOptions, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        console.log('收到响应，状态码:', res.statusCode)
        
        try {
          const jsonResponse = JSON.parse(responseData)
          resolve({
            statusCode: res.statusCode,
            data: jsonResponse
          })
        } catch (parseError) {
          reject(new Error(`响应解析失败: ${parseError.message}`))
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('请求错误:', error)
      reject(new Error(`HTTP请求失败: ${error.message}`))
    })
    
    req.on('timeout', () => {
      console.error('HTTP请求超时')
      req.destroy()
      reject(new Error('HTTP请求超时'))
    })
    
    req.end()
  })
}

// 构建完整视频URL
function buildFullVideoUrl(relativePath) {
  if (relativePath.startsWith('http')) {
    return relativePath
  } else {
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath
    }
    return FILE_DOMAIN + relativePath
  }
}

// 基于时间的进度估算函数
function estimateProgressBasedOnTime(requestId) {
  try {
    // 从requestId中提取时间戳
    const timestampMatch = requestId.match(/wx_(\d+)_/)
    if (timestampMatch && timestampMatch[1]) {
      const startTime = parseInt(timestampMatch[1])
      const currentTime = Date.now()
      const elapsedMinutes = (currentTime - startTime) / (1000 * 60)
      
      console.log(`任务已等待: ${elapsedMinutes.toFixed(1)} 分钟`)
      
      // 根据已等待时间估算进度
      if (elapsedMinutes < 1) {
        return 20
      } else if (elapsedMinutes < 2) {
        return 40
      } else if (elapsedMinutes < 3) {
        return 60
      } else if (elapsedMinutes < 4) {
        return 80
      } else {
        return 90
      }
    }
  } catch (error) {
    console.error('估算进度失败:', error)
  }
  
  // 默认进度
  return 30
}

// 主函数 - 快速状态查询
exports.main = async (event) => {
  const { requestId } = event
  
  try {
    console.log('=== 快速状态查询开始 ===')
    console.log('requestId:', requestId)
    
    if (!requestId) {
      throw new Error('缺少requestId参数')
    }
    
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-ID': ACCESS_KEY,
    }
    
    const canonicalUri = generateCanonicalUri(QUERY_URL)
    const { canonicalHeaders, signedHeadersStr } = generateCanonicalHeaders(headers)
    const canonicalQueryString = `requestId=${normalize(requestId)}`
    
    const authorization = generateSignature(
      ACCESS_KEY, SECRET_KEY, REGION, timestamp, EXPIRATION_IN_SECONDS,
      'GET', canonicalUri, canonicalHeaders, signedHeadersStr, canonicalQueryString
    )
    
    headers['Authorization'] = authorization
    
    console.log('=== 调用状态查询API ===')
    
    // 查询任务状态 - 使用快速版本
    const result = await sendHttpRequest(QUERY_URL, { 
      method: 'GET',
      headers: headers 
    }, { requestId: requestId })
    
    console.log('=== 状态查询API响应 ===')
    console.log('响应状态码:', result.statusCode)
    
    // 快速处理响应
    if (result.statusCode === 200) {
      const responseData = result.data
      
      console.log('响应code:', responseData.code)
      console.log('响应msg:', responseData.msg)
      
      // 首先检查是否是 20008 错误
      if (responseData.code === "20008") {
        // 推理服务连接异常 - 视为处理中状态
        console.log('推理服务连接异常，继续等待')
        const progress = estimateProgressBasedOnTime(requestId)
        
        return {
          success: true,
          status: 'processing',
          progress: progress,
          message: '服务繁忙，请稍候...'
        }
      }
      
      // 处理其他的响应代码
      if (responseData.code === "10000") {
        // 服务执行成功 - 快速检查回告数据
        const data = responseData.data || {}
        const status = data.status
        const taskResult = data.task_result || {}
        const outVideo = taskResult.out_video || []
        
        console.log('任务状态:', status)
        
        if (status === 2 && outVideo.length > 0) {
          // 任务完成且有视频 - 快速返回
          const videoPath = outVideo[0]
          const fullUrl = buildFullVideoUrl(videoPath)
          console.log('任务完成，视频URL:', fullUrl)
          
          return {
            success: true,
            status: 'completed',
            videoUrl: fullUrl,
            progress: 100,
            message: '视频生成完成'
          }
        } else if (status === 1) {
          // 任务执行中 - 快速返回
          console.log('任务执行中')
          return {
            success: true,
            status: 'processing',
            progress: 60,
            message: '视频生成中...'
          }
        } else if (status === 0) {
          // 任务未开始 - 快速返回
          console.log('任务未开始')
          return {
            success: true,
            status: 'processing',
            progress: 10,
            message: '任务排队中...'
          }
        } else {
          // 默认处理中 - 快速返回
          console.log('默认处理中状态')
          return {
            success: true,
            status: 'processing',
            progress: estimateProgressBasedOnTime(requestId),
            message: '视频生成中...'
          }
        }
      } else if (responseData.code === "990003" || responseData.code === "10401" || responseData.code === "10200") {
        // 任务排队/处理中 - 快速返回
        console.log('任务处理中')
        const progress = estimateProgressBasedOnTime(requestId)
        
        return {
          success: true,
          status: 'processing',
          progress: progress,
          message: responseData.msg || '任务处理中，请稍候...'
        }
      } else {
        // 其他错误代码 - 快速返回
        console.log('API返回错误代码:', responseData.code)
        return {
          success: false,
          status: 'failed',
          message: responseData.msg || `错误代码: ${responseData.code}`
        }
      }
    } else {
      // HTTP错误 - 快速返回
      throw new Error(`状态查询失败: 状态码 ${result.statusCode}`)
    }
    
  } catch (error) {
    console.error('状态查询失败:', error)
    // 错误 - 快速返回
    return {
      success: false,
      status: 'error',
      message: error.message
    }
  }
}
