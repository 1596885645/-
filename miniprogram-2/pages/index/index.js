Page({
    data: {
      userInfo: {},
      isAuthorized: true,
      features: [
        {
          id: 'video-generator',
          name: '图生视频',
          desc: '图片+描述生成创意视频',
          iconText: '🎬',
          path: '/pages/video-generator/video-generator'
        },
        {
          id: 'text-to-image',
          name: '文生图',
          desc: '文字描述生成精美图片',
          iconText: '🖼️',
          path: ''
        },
        {
          id: 'ai-chat',
          name: '智能对话',
          desc: '与AI进行智能对话交流',
          iconText: '💬',
          path: ''
        },
        {
          id: 'voice-clone',
          name: '声音克隆',
          desc: '克隆你的声音并生成语音',
          iconText: '🎤',
          path: ''
        }
      ]
    },
  
    onLoad() {
      this.checkLoginStatus();
    },
    onShow() {
        this.checkLoginStatus();
      },
    // 检查登录状态
    checkLoginStatus() {
        const app = getApp();
        this.setData({
          userInfo: app.globalData.userInfo,
          isAuthorized: app.globalData.isAuthorized
        });
      },
  
    // 用户授权
    onGetUserInfo(e) {
        console.log('用户授权信息:', e.detail);
        
        if (e.detail.userInfo) {
          // 用户同意授权
          const app = getApp();
          
          // 调用全局登录方法
          app.userLogin((success, userInfo) => {
            if (success) {
              this.setData({
                userInfo: userInfo,
                isAuthorized: true
              });
              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 2000
              });
            } else {
              wx.showToast({
                title: '登录失败，请重试',
                icon: 'none'
              });
            }
          });
        } else {
          // 用户拒绝授权
          wx.showToast({
            title: '授权失败，无法使用功能',
            icon: 'none'
          });
        }
      },
  
    // 跳转到功能页面
    navigateToFeature(e) {
      // 检查授权状态
      if (!this.data.isAuthorized) {
        wx.showModal({
          title: '需要登录',
          content: '请先登录后再使用AI功能',
          showCancel: false,
          confirmText: '去登录'
        });
        return;
      }
  
      const path = e.currentTarget.dataset.path;
      if (path) {
        wx.navigateTo({
          url: path
        });
      } else {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
      }
    },
  
    onShareAppMessage() {
      return {
        title: 'TeleAI - 强大的AI工具集合',
        path: '/pages/index/index'
      };
    }
  });