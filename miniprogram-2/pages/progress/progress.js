Page({
    data: { status: 'running', taskId: '' },
    onLoad(q) { this.setData({ taskId: q.taskId }); this.poll(); },
    poll() {
      const timer = setInterval(() => {
        wx.request({
          url: `https://yourdomain.com/status?taskId=${this.data.taskId}`,
          success: (res) => {
            if (res.data.status === 'success') {
              clearInterval(timer);
              this.setData({ status: 'success' });
            } else if (res.data.status === 'fail') {
              clearInterval(timer);
              this.setData({ status: 'fail' });
            }
          }
        });
      }, 3000);
    },
    goPlay() {
      wx.navigateTo({ url: `/pages/player/player?taskId=${this.data.taskId}` });
    }
  });