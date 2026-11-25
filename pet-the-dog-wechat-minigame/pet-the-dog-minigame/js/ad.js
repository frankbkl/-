// 开通微信小游戏流量主后，将下方 AD_UNIT_ID 替换为你的激励视频广告位 ID
const REWARD_AD_UNIT_ID = '';

let rewardedAd = null;

function showRewardAdForCustomPet(onRewarded) {
  if (!REWARD_AD_UNIT_ID || typeof wx.createRewardedVideoAd !== 'function') {
    // 本地调试/未配置广告位时直接放行
    onRewarded();
    return;
  }
  try {
    if (!rewardedAd) {
      rewardedAd = wx.createRewardedVideoAd({ adUnitId: REWARD_AD_UNIT_ID });
    }
    const handleClose = (res) => {
      rewardedAd.offClose(handleClose);
      if (!res || res.isEnded) {
        onRewarded();
      } else {
        wx.showToast({ title: '完整观看广告即可解锁定制', icon: 'none' });
      }
    };
    rewardedAd.onClose(handleClose);
    rewardedAd.show().catch(() => {
      rewardedAd.load().then(() => rewardedAd.show()).catch(() => {
        wx.showToast({ title: '广告暂不可用，请稍后再试', icon: 'none' });
        onRewarded();
      });
    });
  } catch (e) {
    wx.showToast({ title: '广告暂不可用', icon: 'none' });
    onRewarded();
  }
}

module.exports = { showRewardAdForCustomPet };
