const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-9gu0w07d8e'
})

// 延迟触发的主函数
exports.main = async (event) => {
  const { requestId, imageUrl, prompt } = event
  
  try {
    console.log('=== 延迟触发视频下载 ===')
    console.log('requestId:', requestId)
    console.log('2分钟等待完成，开始处理视频下载')
    
    // 先记录任务状态
    const db = cloud.database()
    await db.collection('videoResults').add({
      data: {
        requestId: requestId,
        imageUrl: imageUrl,
        prompt: prompt,
        status: 'scheduled',
        scheduledTime: new Date(),
        createTime: new Date()
      }
    })
    
    console.log('等待2分钟...')
    // 等待2分钟（120秒）
    await new Promise(resolve => setTimeout(resolve, 120000))
    
    console.log('等待完成，开始下载视频')
    
    // 调用视频下载云函数
    const result = await cloud.callFunction({
      name: 'teleagiVideoDownloader',
      data: {
        requestId: requestId,
        imageUrl: imageUrl,
        prompt: prompt
      }
    })
    
    console.log('延迟触发完成，下载结果:', result)
    
    return {
      success: true,
      message: '延迟触发完成'
    }
    
  } catch (error) {
    console.error('延迟触发失败:', error)
    
    // 记录错误状态
    try {
      const db = cloud.database()
      await db.collection('videoResults').add({
        data: {
          requestId: requestId,
          imageUrl: imageUrl,
          prompt: prompt,
          status: 'error',
          error: error.message,
          createTime: new Date()
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
