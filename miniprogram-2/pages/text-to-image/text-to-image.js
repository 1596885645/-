Page({
    data: {},
    onLoad() {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  });