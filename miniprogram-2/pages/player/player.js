Page({
    data: { url: '' },
    onLoad(q) {
      const tid = q.taskId;
      wx.showLoading({ title: '加载中' });
      wx.downloadFile({
        url: `https://yourdomain.com/download?taskId=${tid}`,
        success: (res) => {
          this.setData({ url: res.tempFilePath });
          wx.hideLoading();
        },
        fail: () => wx.showToast({ title: '下载失败', icon: 'error' })
      });
    },
    save() {
      wx.saveVideoToPhotosAlbum({
        filePath: this.data.url,
        success: () => wx.showToast({ title: '已保存' }),
        fail: () => wx.showToast({ title: '保存失败', icon: 'error' })
      });
    }
  });