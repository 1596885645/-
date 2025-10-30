const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-9gu0w07d18e'
})

// 配置参数
const ACCESS_KEY = 'ea4fe9ff62f2473d9bc626e0'
const SECRET_KEY = 'e211f813ac694dcda217a3b5'
const REGION = 'BJ'
const EXPIRATION_IN_SECONDS = '4320'
const SIGNED_HEADERS = 'x-app-id'

const QUERY_URL = ""
const FILE_DOMAIN = ""

// 编码函数和其他辅助函数保持不变...
// [保持原有的 normalize, generateCanonicalUri, generateCanonicalHeaders, generateSignature, sendHttpRequest, buildFullVideoUrl 函数]

// 下载视频并上传到云存储
async function downloadAndUploadVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const { URL } = require('url')
    
    console.log('开始下载视频:', videoUrl)
    
    const parsedUrl = new URL(videoUrl)
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 45000
    }, async (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${res.statusCode}`))
        return
      }
      
      const chunks = []
      res.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      res.on('end', async () => {
        try {
          const videoBuffer = Buffer.concat(chunks)
          console.log('视频下载完成，大小:', videoBuffer.length)
          
          // 上传到云存储
          const timestamp = Date.now()
          const cloudPath = `videos/${timestamp}_${Math.random().toString(36).substr(2, 6)}.mp4`
          
          const uploadResult = await cloud.uploadFile({
            cloudPath: cloudPath,
            fileContent: videoBuffer
          })
          
          console.log('视频上传成功:', uploadResult.fileID)
          resolve(uploadResult.fileID)
          
        } catch (error) {
          reject(new Error(`上传失败: ${error.message}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(new Error(`下载失败: ${error.message}`))
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('视频下载超时'))
    })
    
    req.end()
  })
}

// 检查任务状态
async function checkTaskStatus(requestId) {
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
  
  console.log('查询任务状态...')
  const result = await sendHttpRequest(QUERY_URL, { 
    method: 'GET',
    headers: headers 
  }, { requestId: requestId })
  
  if (result.statusCode === 200) {
    const responseData = result.data
    
    if (responseData.code === "10000") {
      const data = responseData.data || {}
      const status = data.status
      const taskResult = data.task_result || {}
      const outVideo = taskResult.out_video || []
      
      console.log('任务状态:', status)
      
      if (status === 2 && outVideo.length > 0) {
        // 任务完成
        const videoPath = outVideo[0]
        const fullUrl = buildFullVideoUrl(videoPath)
        console.log('视频已生成:', fullUrl)
        return { success: true, videoUrl: fullUrl, status: 'completed' }
      } else if (responseData.code === "20008") {
        // 服务连接异常
        console.log('推理服务连接异常')
        return { success: false, status: 'retry', message: '服务繁忙，稍后重试' }
      } else {
        // 任务处理中
        console.log('任务处理中，状态:', status)
        return { success: false, status: 'processing', message: '任务仍在处理中' }
      }
    } else if (responseData.code === "20008") {
      // 服务连接异常
      console.log('推理服务连接异常')
      return { success: false, status: 'retry', message: '服务繁忙，稍后重试' }
    } else {
      throw new Error(`API返回错误: ${responseData.msg}`)
    }
  } else {
    throw new Error(`状态查询失败: 状态码 ${result.statusCode}`)
  }
}

// 主函数 - 下载视频
exports.main = async (event) => {
  const { requestId, imageUrl, prompt } = event
  
  try {
    console.log('=== 开始下载视频 ===')
    console.log('requestId:', requestId)
    
    if (!requestId) {
      throw new Error('缺少requestId参数')
    }
    
    const db = cloud.database()
    
    // 记录开始下载
    await db.collection('videoTasks').add({
      data: {
        requestId: requestId,
        imageUrl: imageUrl,
        prompt: prompt,
        status: 'downloading',
        startTime: new Date(),
        createTime: new Date()
      }
    })
    
    // 检查任务状态
    let retryCount = 0
    const maxRetries = 10 // 最多重试10次
    
    while (retryCount < maxRetries) {
      console.log(`第 ${retryCount + 1} 次检查任务状态`)
      
      const statusResult = await checkTaskStatus(requestId)
      
      if (statusResult.success && statusResult.status === 'completed') {
        // 任务完成，开始下载
        console.log('开始下载视频:', statusResult.videoUrl)
        
        try {
          const cloudFileId = await downloadAndUploadVideo(statusResult.videoUrl)
          console.log('视频下载完成，云存储ID:', cloudFileId)
          
          // 更新任务状态为完成
          await db.collection('videoTasks').where({
            requestId: requestId
          }).update({
            data: {
              status: 'completed',
              videoUrl: statusResult.videoUrl,
              cloudFileId: cloudFileId,
              completeTime: new Date(),
              updateTime: new Date()
            }
          })
          
          return {
            success: true,
            videoUrl: statusResult.videoUrl,
            cloudFileId: cloudFileId,
            message: '视频下载完成'
          }
          
        } catch (downloadError) {
          console.error('视频下载失败:', downloadError)
          
          // 更新任务状态为失败
          await db.collection('videoTasks').where({
            requestId: requestId
          }).update({
            data: {
              status: 'download_failed',
              error: downloadError.message,
              updateTime: new Date()
            }
          })
          
          return {
            success: false,
            message: `视频下载失败: ${downloadError.message}`
          }
        }
      } else if (statusResult.status === 'retry') {
        // 需要重试
        retryCount++
        console.log(`服务繁忙，${retryCount}/${maxRetries} 次重试`)
        
        if (retryCount < maxRetries) {
          // 等待30秒后重试
          await new Promise(resolve => setTimeout(resolve, 30000))
        } else {
          throw new Error('重试次数超限，任务失败')
        }
      } else {
        // 任务仍在处理中，等待后继续检查
        retryCount++
        console.log(`任务仍在处理中，${retryCount}/${maxRetries} 次检查`)
        
        if (retryCount < maxRetries) {
          // 等待30秒后继续检查
          await new Promise(resolve => setTimeout(resolve, 30000))
        } else {
          throw new Error('任务处理超时')
        }
      }
    }
    
    throw new Error('超出最大重试次数')
    
  } catch (error) {
    console.error('下载视频失败:', error)
    
    // 记录错误状态
    try {
      const db = cloud.database()
      await db.collection('videoTasks').where({
        requestId: requestId
      }).update({
        data: {
          status: 'error',
          error: error.message,
          updateTime: new Date()
        }
      })
    } catch (dbError) {
      console.error('记录错误状态失败:', dbError)
    }
    
    return {
      success: false,
      message: error.message
    }
  }
}
