// miniprogram/pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
const IMP = db.collection('IMP')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    score: 0,
    impulse: '',
    delta: '',
    impulses: [
      // { year: '19', month: '07', date: '01', impulse: '事项1', delta: 3, score: 3 },
      // { year: '19', month: '07', date: '04', impulse: '事项事项事项事项事项2', delta: -1, score: 2 }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const self = this
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        app.globalData.openid = res.result.openid // 其实小程序端一次最多查20条，limit可省↓
        wx.showLoading({ title: 'loading', mask: true })
        IMP.where({ _openid: res.result.openid }).orderBy('timeStamp', 'desc').limit(20).get().then(({data})=>{
          if (data.length > 0) {
            self.setData({ impulses: data, score: data[0].score })
          }
          if (data.length >= 3) {
            self.drawTrends(data)
          }
          wx.hideLoading()
        })
      },
      fail: err => {
        console.error('获取openId失败', err)
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  formSubmit: function(e) {
    const self = this
    const data = {...e.detail.value}
    if (data.impulse === '' || data.delta === '' || parseInt(data.delta) === 0 || isNaN(data.delta)) {
      // return
      return wx.showToast({ title: ':)', icon: 'none', mask: true})
    }
    data.delta = /0\d*/.test(data.delta) ? (-1) * parseInt(data.delta) : parseInt(data.delta)
    const now = new Date()
    data.timeStamp = now.getTime()
    data.year = '' + (now.getFullYear() % 1000)
    data.month = now.getMonth() + 1
    data.month = (data.month < 10 ? '0' : '') + data.month
    data.date = now.getDate()
    data.date = (data.date < 10 ? '0' : '') + data.date
    // console.log(data)
    const _openid = app.globalData.openid
    wx.showLoading({
      title: 'loading', mask: true
    })
    IMP.where({_openid}).orderBy('timeStamp','desc').limit(1).get().then(res => { // 新增的时候只取最近的1条即可
      data.score = res.data.length === 0 ? data.delta : (res.data[0].score + data.delta)
      return data
    }).then(data => {
      return IMP.add({ data })
    }).then(res => {
      const {_id} = {...res}
      return IMP.doc(_id).get()
    }).then(({data}) => {
      self.setData({ impulse: '', delta: '', score: data.score })
      const impulses = self.data.impulses
      impulses.unshift(data)
      self.setData({ impulses })
      wx.hideLoading()
    }).then(() => {
      if (self.data.impulses.length>=3){
        self.drawTrends(self.data.impulses)
      }
    })
  },
  drawTrends: function (impulses) {
    const trends = []
    let min = impulses[0].score
    let max = min
    impulses.forEach((imp, i) => {
      if (imp.score > max) max = imp.score;
      if (imp.score < min) min = imp.score;
    })
    impulses.forEach((imp, i) => {
      trends.unshift((imp.score * (-1) + max) / (max - min) * 40)
    }) // 先归一化
    let w = wx.getSystemInfoSync().windowWidth * 0.95
    let ctx = wx.createCanvasContext('trends')
    ctx.setStrokeStyle("#09BB07")
    ctx.setLineWidth(1)
    ctx.moveTo(0, trends[0]);
    for (let i = 1; i < trends.length; i++) {
      ctx.lineTo(i * w / (trends.length - 1), trends[i])
    }
    ctx.stroke()
    ctx.draw()
  }
})