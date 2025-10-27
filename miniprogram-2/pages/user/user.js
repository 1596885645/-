Page({
    data: {
      userInfo: null,
      isAuthorized: false,
      version: '1.0.0',
      functions: [
        { name: '使用教程', icon: '📚' },
        { name: '意见反馈', icon: '💬' },
        { name: '关于我们', icon: '👥' },
        { name: '设置', icon: '⚙️' }
      ]
    },
  
    onLoad() {
      this.checkLoginStatus();
    },
  
    onShow() {
      this.checkLoginStatus();
    },
  
    checkLoginStatus() {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userInfo']) {
            wx.getUserInfo({
              success: (userRes) => {
                this.setData({
                  userInfo: userRes.userInfo,
                  isAuthorized: true
                });
              }
            });
          }
        }
      });
    },
  
    onGetUserInfo(e) {
      if (e.detail.userInfo) {
        this.setData({
          userInfo: e.detail.userInfo,
          isAuthorized: true
        });
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      }
    },
  
    navigateToFunction(e) {
      const index = e.currentTarget.dataset.index;
      const functionName = this.data.functions[index].name;
      
      wx.showModal({
        title: functionName,
        content: '功能开发中，敬请期待',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    contactService() {
      wx.showModal({
        title: '联系客服',
        content: '如有问题请联系客服微信：teleai-service',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    onShareAppMessage() {
      return {
        title: 'TeleAI - 强大的AI工具集合',
        path: '/pages/index/index'
      };
    }
  });