Page({
    data: {
      selectedImage: '',
      prompt: '',
      generating: false,
      progress: 0,
      videoUrl: '',
      cloudFileId: '',
      imageUploaded: false,
      videoLoaded: false,
      showVideoUrl: false,
      currentRequestId: '',
      downloadTimer: null
    },
  
    // 页面加载时恢复状态
    onLoad() {
      this.restorePageState()
      this.restoreData()
    },
  
    // 页面显示时检查数据
    onShow() {
      this.restorePageState()
    },
  
    // 保存页面状态到本地存储
    savePageState() {
      try {
        const pageState = {
          selectedImage: this.data.selectedImage,
          prompt: this.data.prompt,
          generating: this.data.generating,
          progress: this.data.progress,
          videoUrl: this.data.videoUrl,
          cloudFileId: this.data.cloudFileId,
          imageUploaded: this.data.imageUploaded,
          currentRequestId: this.data.currentRequestId,
          timestamp: Date.now()
        }
        wx.setStorageSync('videoGeneratorPageState', pageState)
        console.log('页面状态已保存')
      } catch (error) {
        console.error('保存页面状态失败:', error)
      }
    },
  
    // 恢复页面状态
    restorePageState() {
      try {
        const pageState = wx.getStorageSync('videoGeneratorPageState')
        if (pageState) {
          const isExpired = Date.now() - pageState.timestamp > 2 * 60 * 60 * 1000
          
          if (!isExpired) {
            console.log('恢复页面状态')
            this.setData({
              selectedImage: pageState.selectedImage,
              prompt: pageState.prompt,
              generating: pageState.generating,
              progress: pageState.progress,
              videoUrl: pageState.videoUrl,
              cloudFileId: pageState.cloudFileId,
              imageUploaded: pageState.imageUploaded,
              currentRequestId: pageState.currentRequestId
            })
            
            if (pageState.generating) {
              wx.showToast({
                title: `已恢复生成任务 (${pageState.progress}%)`,
                icon: 'success',
                duration: 3000
              })
            } else if (pageState.videoUrl) {
              wx.showToast({
                title: '已恢复视频结果',
                icon: 'success',
                duration: 1500
              })
            }
          } else {
            wx.removeStorageSync('videoGeneratorPageState')
            console.log('清除过期状态')
          }
        }
      } catch (error) {
        console.error('恢复页面状态失败:', error)
      }
    },
  
    // 恢复数据
    restoreData() {
      try {
        const videoData = wx.getStorageSync('videoData')
        if (videoData) {
          const isExpired = Date.now() - videoData.timestamp > 60 * 60 * 1000
          
          if (!isExpired && videoData.videoUrl && !this.data.videoUrl) {
            console.log('恢复视频数据')
            this.setData({
              videoUrl: videoData.videoUrl,
              cloudFileId: videoData.cloudFileId,
              selectedImage: videoData.selectedImage,
              prompt: videoData.prompt
            })
          } else if (isExpired) {
            wx.removeStorageSync('videoData')
          }
        }
      } catch (error) {
        console.error('恢复数据失败:', error)
      }
    },
  
    // 选择图片
    async chooseImage() {
      try {
        const res = await wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        })
        
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          const tempFilePath = res.tempFilePaths[0]
          console.log('选择的临时图片路径:', tempFilePath)
          
          this.setData({
            selectedImage: tempFilePath,
            imageUploaded: false
          })
          
          await this.uploadImage(tempFilePath)
        }
      } catch (error) {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    },
  
    // 上传图片到云存储
    async uploadImage(tempFilePath) {
      try {
        wx.showLoading({
          title: '上传中...',
          mask: true
        })
        
        console.log('开始上传图片，临时路径:', tempFilePath)
        
        const timestamp = Date.now()
        const cloudPath = `images/${timestamp}_${Math.random().toString(36).substr(2, 6)}.jpg`
        
        console.log('云存储路径:', cloudPath)
        
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath
        })
        
        console.log('上传成功:', uploadResult.fileID)
        
        this.setData({
          selectedImage: uploadResult.fileID,
          imageUploaded: true
        })
        
        this.savePageState()
        
        wx.hideLoading()
        wx.showToast({
          title: '上传成功',
          icon: 'success',
          duration: 1500
        })
        
      } catch (error) {
        console.error('上传失败:', error)
        wx.hideLoading()
        
        let errorMsg = '上传失败'
        if (error.errMsg.includes('权限')) {
          errorMsg = '上传权限不足'
        } else if (error.errMsg.includes('文件')) {
          errorMsg = '文件格式不支持'
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      }
    },
  
    // 生成视频
    async generateVideo() {
      // 清理之前的任务
      this.cleanupPreviousTask()
      
      // 基本验证
      if (!this.data.selectedImage) {
        wx.showToast({
          title: '请先选择图片',
          icon: 'none'
        })
        return
      }
      
      if (!this.data.imageUploaded) {
        wx.showToast({
          title: '请等待图片上传完成',
          icon: 'none'
        })
        return
      }
      
      if (!this.data.prompt.trim()) {
        wx.showToast({
          title: '请输入描述文字',
          icon: 'none'
        })
        return
      }
      
      try {
        this.setData({
          generating: true,
          progress: 10
        })
        
        wx.showLoading({
          title: '提交任务中...',
          mask: true
        })
        
        console.log('开始生成视频...')
        console.log('图片ID:', this.data.selectedImage)
        console.log('提示词:', this.data.prompt)
        
        // 1. 调用生成视频云函数
        const result = await wx.cloud.callFunction({
          name: 'teleagiVideoGenerator',
          data: {
            imageUrl: this.data.selectedImage,
            prompt: this.data.prompt,
            isLocalImage: true
          }
        })
        
        wx.hideLoading()
        
        console.log('云函数返回完整结果:', JSON.stringify(result, null, 2))
        
        if (result.result && result.result.success) {
          const requestId = result.result.requestId
          console.log('任务提交成功，requestId:', requestId)
          
          this.setData({
            currentRequestId: requestId,
            progress: 30
          })
          
          this.savePageState()
          
          wx.showToast({
            title: '任务已提交',
            icon: 'success',
            duration: 2000
          })
          
          // 2. 2分钟后调用下载云函数
          console.log('2分钟后开始下载视频')
          this.setData({
            downloadTimer: setTimeout(() => {
              this.downloadVideo(requestId)
            }, 120000) // 2分钟
          })
          
        } else {
          throw new Error(result.result?.message || '任务提交失败')
        }
        
      } catch (error) {
        console.error('生成视频失败:', error)
        this.setData({
          generating: false,
          progress: 0
        })
        
        this.savePageState()
        
        let errorMsg = error.message || '未知错误'
        if (error.errMsg && error.errMsg.includes('cloud function not found')) {
          errorMsg = '云函数未找到，请检查部署'
        } else if (error.message.includes('环境不存在')) {
          errorMsg = '云环境配置错误'
        }
        
        wx.showModal({
          title: '生成失败',
          content: errorMsg,
          showCancel: false
        })
      }
    },
  
    // 下载视频
    async downloadVideo(requestId) {
      try {
        this.setData({
          progress: 50
        })
        
        wx.showLoading({
          title: '下载视频中...',
          mask: true
        })
        
        console.log('开始下载视频，requestId:', requestId)
        
        const result = await wx.cloud.callFunction({
          name: 'teleagiVideoDownloader',
          data: {
            requestId: requestId,
            imageUrl: this.data.selectedImage,
            prompt: this.data.prompt
          }
        })
        
        wx.hideLoading()
        
        console.log('下载云函数返回结果:', JSON.stringify(result, null, 2))
        
        if (result.result && result.result.success) {
          console.log('视频下载成功')
          
          this.setData({
            videoUrl: result.result.videoUrl,
            cloudFileId: result.result.cloudFileId,
            generating: false,
            progress: 100
          })
          
          this.savePageState()
          
          wx.showToast({
            title: '视频生成完成',
            icon: 'success',
            duration: 2000
          })
          
          // 保存视频数据用于分享恢复
          wx.setStorageSync('videoData', {
            videoUrl: this.data.videoUrl,
            cloudFileId: this.data.cloudFileId,
            selectedImage: this.data.selectedImage,
            prompt: this.data.prompt,
            timestamp: Date.now()
          })
          
        } else {
          throw new Error(result.result?.message || '视频下载失败')
        }
        
      } catch (error) {
        console.error('下载视频失败:', error)
        this.setData({
          generating: false,
          progress: 0
        })
        
        this.savePageState()
        
        wx.showModal({
          title: '下载失败',
          content: error.message,
          showCancel: false
        })
      }
    },
  
    // 清理之前的任务
    cleanupPreviousTask() {
      // 清除下载定时器
      if (this.data.downloadTimer) {
        clearTimeout(this.data.downloadTimer)
        this.setData({
          downloadTimer: null
        })
      }
      
      this.setData({
        generating: false,
        progress: 0,
        videoUrl: '',
        cloudFileId: '',
        currentRequestId: ''
      })
      
      try {
        const currentState = wx.getStorageSync('videoGeneratorPageState')
        if (currentState) {
          wx.setStorageSync('videoGeneratorPageState', {
            selectedImage: currentState.selectedImage,
            prompt: currentState.prompt,
            imageUploaded: currentState.imageUploaded,
            generating: false,
            progress: 0,
            videoUrl: '',
            cloudFileId: '',
            currentRequestId: '',
            timestamp: Date.now()
          })
        }
      } catch (error) {
        console.error('清理状态失败:', error)
      }
    },
  
    // 输入提示词
    onPromptInput(e) {
      this.setData({
        prompt: e.detail.value
      })
      this.savePageState()
    },
  
    // 预览图片
    previewImage() {
      if (this.data.selectedImage) {
        wx.previewImage({
          urls: [this.data.selectedImage]
        })
      }
    },
  
    // 视频事件处理
    onVideoError(e) {
      console.error('视频播放错误:', e.detail.errMsg)
      wx.showToast({
        title: '视频播放失败',
        icon: 'none'
      })
    },
  
    onVideoPlay(e) {
      console.log('视频开始播放')
      this.setData({ videoLoaded: true })
    },
  
    onVideoPause(e) {
      console.log('视频暂停')
    },
  
    onVideoEnded(e) {
      console.log('视频播放结束')
    },
  
    // 手动播放视频
    playVideo() {
      if (!this.data.videoUrl) {
        wx.showToast({
          title: '没有可播放的视频',
          icon: 'none'
        })
        return
      }
      
      const videoContext = wx.createVideoContext('resultVideo')
      videoContext.play()
    },
  
    // 暂停视频
    pauseVideo() {
      const videoContext = wx.createVideoContext('resultVideo')
      videoContext.pause()
    },
  
    // 检查相册权限
    checkPhotoAlbumPermission() {
      return new Promise((resolve, reject) => {
        wx.getSetting({
          success: (res) => {
            if (!res.authSetting['scope.writePhotosAlbum']) {
              // 没有权限，请求权限
              wx.authorize({
                scope: 'scope.writePhotosAlbum',
                success: () => {
                  resolve(true) // 授权成功
                },
                fail: () => {
                  resolve(false) // 授权失败
                }
              })
            } else {
              resolve(true) // 已有权限
            }
          },
          fail: (err) => {
            reject(err)
          }
        })
      })
    },
  
    // 保存视频到相册
    async saveVideo() {
      const videoSource = this.data.cloudFileId || this.data.videoUrl
      
      if (!videoSource) {
        wx.showToast({
          title: '没有可保存的视频',
          icon: 'none'
        })
        return
      }
  
      wx.showLoading({
        title: '保存中...',
        mask: true
      })
  
      try {
        // 1. 检查相册权限
        const hasPermission = await this.checkPhotoAlbumPermission()
        
        if (!hasPermission) {
          wx.hideLoading()
          // 显示权限请求弹窗
          wx.showModal({
            title: '需要相册权限',
            content: '需要您授权访问相册才能保存视频',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 用户点击去设置，打开设置页面
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.writePhotosAlbum']) {
                      // 用户授权成功，重新尝试保存
                      this.saveVideo()
                    }
                  }
                })
              }
            }
          })
          return
        }
  
        console.log('视频源:', videoSource)
        
        let videoPath = videoSource
        
        // 如果是云存储文件ID，需要先下载到临时文件
        if (videoSource.startsWith('cloud:')) {
          console.log('下载云存储视频...')
          const downloadResult = await wx.cloud.downloadFile({
            fileID: videoSource
          })
          
          videoPath = downloadResult.tempFilePath
          console.log('云存储视频下载成功，临时路径:', videoPath)
        }
  
        // 2. 验证文件路径是否有效
        console.log('最终文件路径:', videoPath)
        
        // 检查文件是否存在
        try {
          const fileInfo = await new Promise((resolve, reject) => {
            wx.getFileInfo({
              filePath: videoPath,
              success: resolve,
              fail: reject
            })
          })
          console.log('文件信息:', fileInfo)
        } catch (fileError) {
          console.error('文件检查失败:', fileError)
          throw new Error('视频文件不存在或已过期')
        }
  
        // 3. 保存到相册
        console.log('开始保存到相册...')
        await new Promise((resolve, reject) => {
          wx.saveVideoToPhotosAlbum({
            filePath: videoPath,
            success: (saveRes) => {
              console.log('保存成功:', saveRes)
              resolve(saveRes)
            },
            fail: (saveErr) => {
              console.error('保存失败:', saveErr)
              
              // 更详细的错误信息
              let detailedError = saveErr.errMsg || '保存失败'
              if (saveErr.errMsg.includes('file not exist')) {
                detailedError = '视频文件不存在，请重新生成视频'
              } else if (saveErr.errMsg.includes('permission')) {
                detailedError = '没有相册权限，请在设置中开启'
              } else if (saveErr.errMsg.includes('invalid file')) {
                detailedError = '视频文件格式不支持'
              }
              
              reject(new Error(detailedError))
            }
          })
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 2000
        })
        
      } catch (error) {
        wx.hideLoading()
        console.error('保存失败:', error)
        
        let errorMsg = error.message || '保存失败，请重试'
        
        // 更友好的错误提示
        if (error.message.includes('视频文件不存在')) {
          errorMsg = '视频文件已过期，请重新生成视频'
        } else if (error.message.includes('相册权限')) {
          errorMsg = '没有相册权限，请在手机设置中开启权限'
        } else if (error.message.includes('文件格式')) {
          errorMsg = '视频格式不支持保存'
        } else if (error.message.includes('下载失败')) {
          errorMsg = '视频下载失败，请检查网络连接'
        }
        
        wx.showModal({
          title: '保存失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    },
  
    // 全屏预览视频
    previewVideo() {
      const videoSource = this.data.cloudFileId || this.data.videoUrl
      if (!videoSource) {
        wx.showToast({
          title: '没有可预览的视频',
          icon: 'none'
        })
        return
      }
  
      // 如果是云存储文件ID，需要获取临时URL
      if (videoSource.startsWith('cloud:')) {
        wx.cloud.getTempFileURL({
          fileList: [videoSource],
          success: res => {
            if (res.fileList && res.fileList[0]) {
              const tempUrl = res.fileList[0].tempFileURL
              wx.previewMedia({
                sources: [{
                  url: tempUrl,
                  type: 'video'
                }]
              })
            }
          },
          fail: error => {
            console.error('获取临时URL失败:', error)
            wx.showToast({
              title: '预览失败',
              icon: 'none'
            })
          }
        })
      } else {
        wx.previewMedia({
          sources: [{
            url: videoSource,
            type: 'video'
          }]
        })
      }
    },
  
    // 重置页面
    resetPage() {
      this.cleanupPreviousTask()
      this.setData({
        selectedImage: '',
        prompt: '',
        imageUploaded: false,
        videoLoaded: false,
        showVideoUrl: false
      })
      
      // 清理所有存储
      wx.removeStorageSync('videoGeneratorPageState')
      wx.removeStorageSync('videoData')
    },
  
    // 分享功能
    onShareAppMessage() {
      // 分享前确保数据已保存
      if (this.data.videoUrl) {
        wx.setStorageSync('videoData', {
          videoUrl: this.data.videoUrl,
          cloudFileId: this.data.cloudFileId,
          selectedImage: this.data.selectedImage,
          prompt: this.data.prompt,
          timestamp: Date.now()
        })
      }
      
      return {
        title: this.data.prompt || '看我生成的AI视频！',
        path: '/pages/video-generator/video-generator',
        imageUrl: this.data.selectedImage || ''
      }
    },
  
    onShareTimeline() {
      return {
        title: this.data.prompt || '看我生成的AI视频！',
        imageUrl: this.data.selectedImage || ''
      }
    },
  
    // 页面卸载时保存状态
    onUnload() {
      this.savePageState()
    },
  
    onHide() {
      this.savePageState()
    }
  })