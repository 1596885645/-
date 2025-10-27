App({
    onLaunch() {
      console.log('TeleAI小程序启动');
      
      // 初始化云开发
      if (wx.cloud) {
        wx.cloud.init({
          env: "cloud1-9gu0w07d15cd3e8e", // 替换为你的云环境ID
          traceUser: true
        })
      }
      
      // 检查登录状态
      this.checkLoginStatus();
    },
    
    // 检查登录状态
    checkLoginStatus() {
      const that = this;
      wx.getSetting({
        success(res) {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接获取用户信息
            wx.getUserInfo({
              success(userRes) {
                that.globalData.userInfo = userRes.userInfo;
                that.globalData.isAuthorized = true;
                console.log('用户已授权:', userRes.userInfo);
              },
              fail(err) {
                console.error('获取用户信息失败:', err);
              }
            });
          } else {
            console.log('用户未授权');
            that.globalData.isAuthorized = false;
            that.globalData.userInfo = null;
          }
        },
        fail(err) {
          console.error('检查授权设置失败:', err);
        }
      });
    },
    
    // 全局登录方法
    userLogin(callback) {
      const that = this;
      
      // 1. 调用 wx.login 获取 code
      wx.login({
        success(loginRes) {
          if (loginRes.code) {
            console.log('获取到登录code:', loginRes.code);
            
            // 2. 获取用户信息
            wx.getUserInfo({
              success(userRes) {
                // 3. 更新全局数据
                that.globalData.userInfo = userRes.userInfo;
                that.globalData.isAuthorized = true;
                
                console.log('登录成功:', userRes.userInfo);
                
                // 4. 这里可以将 loginRes.code 和 userInfo 发送到你的服务器
                // 服务器通过 code 换取 openid 和 session_key
                
                // 5. 执行回调
                if (callback && typeof callback === 'function') {
                  callback(true, userRes.userInfo);
                }
              },
              fail(userErr) {
                console.error('获取用户信息失败:', userErr);
                if (callback && typeof callback === 'function') {
                  callback(false, null);
                }
              }
            });
          } else {
            console.error('登录失败:', loginRes.errMsg);
            if (callback && typeof callback === 'function') {
              callback(false, null);
            }
          }
        },
        fail(loginErr) {
          console.error('wx.login 调用失败:', loginErr);
          if (callback && typeof callback === 'function') {
            callback(false, null);
          }
        }
      });
    },
  
    globalData: {
      userInfo: null,
      isAuthorized: false
    }
  })