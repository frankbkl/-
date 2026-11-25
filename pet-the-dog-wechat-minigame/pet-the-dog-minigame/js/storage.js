const STATS_KEY = 'pet_the_dog_wx_stats_v1';
const CUSTOM_KEY = 'pet_the_dog_wx_custom_v1';

function loadStats() {
  try {
    const val = wx.getStorageSync(STATS_KEY);
    if (val && typeof val === 'object') return val;
  } catch (e) {}
  return { petCount: 0, breed: 'shiba' };
}

function saveStats(stats) {
  try { wx.setStorageSync(STATS_KEY, stats); } catch (e) {}
}

function loadCustomPets() {
  try {
    const val = wx.getStorageSync(CUSTOM_KEY);
    if (Array.isArray(val)) return val;
  } catch (e) {}
  return [];
}

function saveCustomPets(list) {
  try { wx.setStorageSync(CUSTOM_KEY, list); } catch (e) {}
}

module.exports = { loadStats, saveStats, loadCustomPets, saveCustomPets };
