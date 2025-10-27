// 生成随机任务ID
export const generateTaskId = () => {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // 检查图片大小
  export const checkImageSize = (tempFilePath) => {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath: tempFilePath,
        success: (res) => {
          if (res.size > 5 * 1024 * 1024) {
            reject(new Error('图片大小不能超过5MB'));
          } else {
            resolve(res.size);
          }
        },
        fail: reject
      });
    });
  };
  
  // 显示提示
  export const showToast = (title, icon = 'none') => {
    wx.showToast({ title, icon, duration: 2000 });
  };