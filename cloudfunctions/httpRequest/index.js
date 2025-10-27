const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { url, method = 'GET', headers = {}, data, params } = event
  
  try {
    console.log('httpRequest调用:', { url, method })
    
    // 使用云开发的内置HTTP能力
    const result = await cloud.cloudBase.callAPI({
      api: url,
      method: method,
      headers: headers,
      data: data,
      dataType: 'json'
    })
    
    console.log('httpRequest成功')
    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error('httpRequest失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}