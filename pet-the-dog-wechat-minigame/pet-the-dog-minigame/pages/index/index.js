const { BREEDS, BUILTIN_KEYS, registerCustomPet } = require('../../js/breeds');
const { loadStats, saveStats, loadCustomPets, saveCustomPets } = require('../../js/storage');
const audio = require('../../js/audio');
const { showRewardAdForCustomPet } = require('../../js/ad');
const { buildLayout, renderUI, hitTestButtons } = require('../../js/ui');

let canvas = null;
let ctx = null;
let W = 0;
let H = 0;
let topSafe = 24;
let rafId = null;

// Load persisted stats & custom pets
const stats = loadStats();
let customPets = loadCustomPets();
customPets.forEach(registerCustomPet);
if (!BREEDS[stats.breed]) stats.breed = 'shiba';

// Image cache using canvas.createImage()
const imgCache = {};
function getImage(src) {
  if (!src) return null;
  if (!imgCache[src]) {
    const im = canvas.createImage();
    im.src = src;
    imgCache[src] = im;
  }
  return imgCache[src];
}

function preloadBreed(key) {
  const b = BREEDS[key];
  if (!b) return;
  b.ring.forEach((f) => getImage(f.src));
  if (b.top45Src) getImage(b.top45Src);
  if (b.top90Src) getImage(b.top90Src);
  if (b.bot45Src) getImage(b.bot45Src);
  if (b.bot90Src) getImage(b.bot90Src);
}

const SLICES = 48;
const state = {
  time: 0,
  interactMode: 'spin',
  activeTool: 'hand',
  yaw: 45,
  yawVel: 0,
  pitch: 0,
  pitchVel: 0,
  autoSpin: false,
  zoom: 1.0,
  targetZoom: 1.0,
  happiness: 32,
  pettingEnergy: 0,
  sliceY: new Float32Array(SLICES),
  sliceVelY: new Float32Array(SLICES),
  bounceY: 0,
  bounceVelY: 0,
  tailPullX: 0,
  tailPullY: 0,
  tailVelX: 0,
  tailVelY: 0,
  tailWagPhase: 0,
  eatingTimer: 0,
  chewAccum: 0,
  barkTimer: 0,
  soundWaves: [],
  particles: [],
  treats: [],
  toastText: '',
  toastTimer: 0,
  touchDown: false,
  touchX: 0,
  touchY: 0,
  lastX: 0,
  lastY: 0,
  totalDrag: 0,
  dragSubMode: 'none',
  strokeAccum: 0
};

let layout = null;

function refreshLayout() {
  layout = buildLayout(W, H, topSafe, BUILTIN_KEYS.concat(customPets.map((p) => p.id)), BREEDS);
}

function showToast(msg) {
  state.toastText = msg;
  state.toastTimer = 2.0;
}

function normYaw(a) { return ((a % 360) + 360) % 360; }
function isFlippedRightView() { return normYaw(state.yaw) > 180; }
function isSideTailEligible() {
  if (Math.abs(state.pitch) > 25) return false;
  const a = normYaw(state.yaw);
  return (a >= 60 && a <= 125) || (a >= 235 && a <= 300);
}

function getDrawRect() {
  const aspect = 16 / 9;
  const availW = W - 68;
  let dw = availW * 0.96 * state.zoom;
  let dh = dw / aspect;
  const maxH = (H - 250) * state.zoom;
  if (dh > maxH) {
    dh = maxH;
    dw = dh * aspect;
  }
  const dx = (W - 44 - dw) * 0.5;
  const dy = (H - dh) * 0.48;
  return { dx, dy, dw, dh };
}

function getMouthScreenPos() {
  const r = getDrawRect();
  const a = normYaw(state.yaw);
  const p = state.pitch;
  let u = 0.24, v = 0.31;
  if (Math.abs(p) >= 38) {
    u = a > 180 ? 0.80 : 0.20;
    v = p > 0 ? 0.48 : 0.30;
  } else if (a < 26 || a > 334) {
    u = 0.50; v = 0.31;
  } else if (a >= 154 && a <= 206) {
    u = 0.50; v = 0.22;
  } else if (a > 180) {
    u = 0.76; v = 0.31;
  }
  return { x: r.dx + r.dw * u, y: r.dy + r.dh * v, facingRight: a > 180, isRear: (a >= 154 && a <= 206 && Math.abs(p) < 38) };
}

function spawnParticle(x, y, type, text) {
  state.particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 40,
    vy: -44 - Math.random() * 40,
    life: 1,
    decay: 0.95 + Math.random() * 0.4,
    size: 12 + Math.random() * 7,
    type,
    text: text || ''
  });
}

function triggerBark() {
  const b = BREEDS[stats.breed];
  state.barkTimer = 0.72;
  state.bounceVelY -= 170;
  state.happiness = Math.min(100, state.happiness + 10);
  audio.playBark(b.barkPitch);
  setTimeout(() => audio.playBark(b.barkPitch), 180);
  const m = getMouthScreenPos();
  state.soundWaves.push({ x: m.x, y: m.y, r: 8, life: 1 });
  spawnParticle(m.x + (m.facingRight ? 18 : -28), m.y - 22, 'text', '汪！汪！');
}

function throwTreat() {
  const m = getMouthScreenPos();
  const startX = m.facingRight ? W - 24 : 24;
  state.treats.push({
    x: startX, y: H * 0.25,
    vx: (m.x - startX) * 1.55, vy: -180,
    rot: 0, vrot: 8,
    targetX: m.x, targetY: m.y
  });
  showToast('肉骨头飞过去啦！');
}

// 将临时文件转存为永久路径，避免小程序重启后临时路径被清理
function persistImage(tempFilePath, cb) {
  if (typeof wx.getFileSystemManager !== 'function') {
    cb(tempFilePath);
    return;
  }
  try {
    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: (r) => cb(r.savedFilePath),
      fail: () => cb(tempFilePath)
    });
  } catch (e) {
    cb(tempFilePath);
  }
}

// 微信内容安全检测：openid 需由后端 code2session 换取，纯前端工程暂留空，检测失败时放行不阻断主流程
function checkImageContent(path, cb) {
  let openid = '';
  try { openid = wx.getStorageSync('openid') || ''; } catch (e) {}
  if (typeof wx.mediaCheckAsync !== 'function' || !openid) {
    cb();
    return;
  }
  wx.mediaCheckAsync({
    mediaUrl: path,
    mediaType: 2,
    version: 2,
    scene: 3,
    openid,
    success: () => cb(),
    fail: () => cb()
  });
}

function handleCustomPetUpload() {
  showRewardAdForCustomPet(() => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        const finishUpload = (src) => {
          const id = 'custom_' + Date.now();
          const cp = { id, name: '我的小狗', src, barkPitch: 400 };
          customPets.push(cp);
          registerCustomPet(cp);
          saveCustomPets(customPets);
          stats.breed = id;
          saveStats(stats);
          preloadBreed(id);
          refreshLayout();
          showToast('专属电子宠物已生成！');
        };
        checkImageContent(file.tempFilePath, () => {
          persistImage(file.tempFilePath, finishUpload);
        });
      }
    });
  });
}

function applyPetFeedback(x, y, dist) {
  const r = getDrawRect();
  const u = (x - r.dx) / Math.max(1, r.dw);
  const centerSlice = Math.floor(u * SLICES);
  const tool = state.activeTool;
  const mult = tool === 'scratch' ? 1.5 : (tool === 'dryer' ? 1.2 : 1.0);
  const push = Math.min(dist * 3.2 * mult, 120);
  const rad = tool === 'dryer' ? 10 : 6;

  for (let i = 0; i < SLICES; i++) {
    const d = Math.abs(i - centerSlice);
    if (d <= rad) {
      const weight = Math.cos((d / rad) * (Math.PI / 2));
      const dir = tool === 'dryer' ? Math.sin(state.time * 26 + i * 0.6) : 1;
      state.sliceVelY[i] += push * weight * dir;
    }
  }
  state.pettingEnergy = Math.min(1, state.pettingEnergy + dist * 0.014);
  state.happiness = Math.min(100, state.happiness + dist * 0.06);
  state.strokeAccum += dist;

  if (state.strokeAccum >= 40) {
    state.strokeAccum = 0;
    stats.petCount += 1;
    saveStats(stats);
    audio.playTool(tool, state.happiness);
    if (tool === 'bubble') spawnParticle(x, y - 10, 'bubble');
    else if (tool === 'comb') spawnParticle(x, y - 10, 'fur');
    else if (tool === 'dryer') spawnParticle(x + 8, y, 'wind');
    else spawnParticle(x, y - 14, Math.random() > 0.3 ? 'heart' : 'spark');
  }
}

// Touch handling
function handleTouchStart(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  const x = t.clientX, y = t.clientY;

  const hitBtn = hitTestButtons(layout, x, y);
  if (hitBtn) {
    if (hitBtn.type === 'mode') {
      state.interactMode = hitBtn.value;
      if (hitBtn.value === 'pet') state.autoSpin = false;
      showToast(hitBtn.value === 'spin' ? '360° 自由球面旋转模式' : '当前角度撸狗模式');
    } else if (hitBtn.type === 'tool') {
      state.activeTool = hitBtn.value;
      state.interactMode = 'pet';
      state.autoSpin = false;
      showToast(`已切换道具：${hitBtn.label}`);
    } else if (hitBtn.type === 'breed') {
      stats.breed = hitBtn.value;
      saveStats(stats);
      preloadBreed(hitBtn.value);
      state.bounceVelY -= 110;
      audio.playBark(BREEDS[hitBtn.value].barkPitch);
      showToast(`已切换为 ${BREEDS[hitBtn.value].name}`);
    } else if (hitBtn.id === 'act_treat') {
      throwTreat();
    } else if (hitBtn.id === 'act_bark') {
      triggerBark();
    } else if (hitBtn.id === 'act_custom') {
      handleCustomPetUpload();
    } else if (hitBtn.id === 'act_sound') {
      audio.setEnabled(!audio.isEnabled());
      showToast(audio.isEnabled() ? '已开启音效' : '已静音');
    } else if (hitBtn.id === 'act_auto') {
      state.autoSpin = !state.autoSpin;
      showToast(state.autoSpin ? '开启自动巡航' : '已暂停巡航');
    } else if (hitBtn.id === 'act_zoom_in') {
      state.targetZoom = Math.min(1.5, state.targetZoom + 0.15);
    } else if (hitBtn.id === 'act_zoom_out') {
      state.targetZoom = Math.max(0.8, state.targetZoom - 0.15);
    }
    return;
  }

  state.touchDown = true;
  state.touchX = state.lastX = x;
  state.touchY = state.lastY = y;
  state.totalDrag = 0;

  if (state.interactMode === 'spin') {
    state.dragSubMode = 'spin';
    state.autoSpin = false;
    state.yawVel = 0;
    state.pitchVel = 0;
  } else {
    const r = getDrawRect();
    const b = BREEDS[stats.breed];
    const flipped = isFlippedRightView();
    const tailRootU = flipped ? (1 - b.tailRootU) : b.tailRootU;
    const tailEndU = flipped ? (1 - b.tailEndU) : b.tailEndU;
    const tx1 = r.dx + r.dw * tailRootU;
    const tx2 = r.dx + r.dw * tailEndU + state.tailPullX;
    const ty = r.dy + r.dh * b.tailYNorm + state.tailPullY;
    const inTail = isSideTailEligible() && x >= Math.min(tx1, tx2) - 24 && x <= Math.max(tx1, tx2) + 24 && Math.abs(y - ty) < r.dh * 0.36;
    state.dragSubMode = inTail ? 'tail' : 'pet';
    if (state.dragSubMode === 'pet') applyPetFeedback(x, y, 16);
  }
}

function handleTouchMove(e) {
  if (!state.touchDown) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  const x = t.clientX, y = t.clientY;
  const dx = x - state.lastX;
  const dy = y - state.lastY;
  const dist = Math.hypot(dx, dy);
  state.totalDrag += dist;
  state.touchX = state.lastX = x;
  state.touchY = state.lastY = y;

  if (state.dragSubMode === 'spin') {
    const dYaw = -dx * 0.55;
    const dPitch = dy * 0.55;
    state.yaw = normYaw(state.yaw + dYaw);
    state.pitch = Math.max(-90, Math.min(90, state.pitch + dPitch));
    state.yawVel = dYaw * 16;
    state.pitchVel = dPitch * 14;
  } else if (state.dragSubMode === 'tail') {
    const r = getDrawRect();
    const b = BREEDS[stats.breed];
    const flipped = isFlippedRightView();
    const tailEndX = r.dx + r.dw * (flipped ? (1 - b.tailEndU) : b.tailEndU);
    state.tailPullX = flipped ? Math.max(-140, Math.min(16, x - tailEndX)) : Math.min(140, Math.max(-16, x - tailEndX));
    state.tailPullY = Math.max(-r.dh * 0.3, Math.min(r.dh * 0.3, (y - (r.dy + r.dh * b.tailYNorm)) * 0.7));
    state.tailVelX = state.tailVelY = 0;
  } else if (state.dragSubMode === 'pet') {
    applyPetFeedback(x, y, dist);
  }
}

function handleTouchEnd() {
  if (state.dragSubMode === 'tail' && Math.hypot(state.tailPullX, state.tailPullY) > 16) {
    audio.playBoing(Math.hypot(state.tailPullX, state.tailPullY));
  } else if (state.dragSubMode === 'spin' && state.totalDrag < 6) {
    triggerBark();
  }
  state.touchDown = false;
  state.dragSubMode = 'none';
}

function handleTouchCancel() {
  state.touchDown = false;
  state.dragSubMode = 'none';
}

function drawDogFrame(img, flipped, r, enableTailStretch, shiftX, shiftY, scaleX, scaleY) {
  if (!img || !img.width) return;
  const b = BREEDS[stats.breed];
  const cx = r.dx + r.dw * 0.5;
  const cy = r.dy + r.dh * 0.5;

  let hasDeform = Math.abs(state.tailPullX) > 0.5 || Math.abs(state.tailPullY) > 0.5 || state.pettingEnergy > 0.02 || Math.abs(state.bounceY) > 0.5;
  if (!hasDeform) {
    for (let i = 0; i < SLICES; i++) {
      if (Math.abs(state.sliceY[i]) > 0.25) { hasDeform = true; break; }
    }
  }

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.translate(cx + (shiftX || 0), cy + (shiftY || 0));
  ctx.scale((flipped ? -1 : 1) * (scaleX || 1), scaleY || 1);
  ctx.translate(-cx, -cy);

  if (!hasDeform && !enableTailStretch) {
    const breathY = Math.sin(state.time * 2.6) * 1.5;
    ctx.drawImage(img, 0, 0, img.width, img.height, r.dx, r.dy + breathY, r.dw, r.dh - breathY * 0.5);
    ctx.restore();
    return;
  }

  const sw = img.width / SLICES;
  const sh = img.height;
  const baseSliceW = r.dw / SLICES;
  const tailRootSlice = Math.floor(b.tailRootU * SLICES);
  const tailSpanSlices = Math.max(1, SLICES - tailRootSlice);
  const wagAmp = 2.8 + (state.happiness / 100) * 9 + state.pettingEnergy * 5;
  const absPullX = flipped ? -state.tailPullX : state.tailPullX;

  let curX = r.dx;
  for (let i = 0; i < SLICES; i++) {
    const logicalIdx = flipped ? (SLICES - 1 - i) : i;
    let sliceW = baseSliceW;
    let offsetY = state.bounceY * 0.4 + state.sliceY[logicalIdx] * 0.6;
    let stretchH = r.dh - state.sliceY[logicalIdx] * 0.5;
    if (enableTailStretch && i >= tailRootSlice) {
      const t = (i - tailRootSlice) / tailSpanSlices;
      sliceW = Math.max(1, baseSliceW + (absPullX / tailSpanSlices) * (0.4 + 1.2 * t));
      offsetY += state.tailPullY * (t * t) + Math.sin(state.tailWagPhase - t * 1.1) * wagAmp * t;
    }
    ctx.drawImage(img, i * sw, 0, sw, sh, Math.floor(curX), r.dy + offsetY, Math.ceil(sliceW) + 1, stretchH);
    curX += sliceW;
  }
  ctx.restore();
}

function drawBone(x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#fff3d6';
  ctx.strokeStyle = '#c49a6c';
  ctx.lineWidth = 2;
  ctx.fillRect(-12, -4, 24, 8);
  ctx.strokeRect(-12, -4, 24, 8);
  [[-12, -4], [-12, 4], [12, -4], [12, 4]].forEach(([kx, ky]) => {
    ctx.beginPath(); ctx.arc(kx, ky, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

function update(dt) {
  state.time += dt;
  if (state.toastTimer > 0) state.toastTimer = Math.max(0, state.toastTimer - dt);
  if (state.barkTimer > 0) state.barkTimer = Math.max(0, state.barkTimer - dt);
  state.pettingEnergy = Math.max(0, state.pettingEnergy - dt * 0.85);
  state.happiness = Math.max(20, state.happiness - dt * 0.4);
  state.zoom += (state.targetZoom - state.zoom) * Math.min(1, dt * 10);

  if (state.autoSpin) {
    state.yaw = normYaw(state.yaw + dt * 32);
  } else if (!state.touchDown) {
    if (Math.abs(state.yawVel) > 0.3) { state.yaw = normYaw(state.yaw + state.yawVel * dt); state.yawVel *= Math.pow(0.05, dt); }
    if (Math.abs(state.pitchVel) > 0.3) { state.pitch = Math.max(-90, Math.min(90, state.pitch + state.pitchVel * dt)); state.pitchVel *= Math.pow(0.05, dt); }
  }

  state.bounceVelY += (-180 * state.bounceY - 14 * state.bounceVelY) * dt;
  state.bounceY += state.bounceVelY * dt;

  for (let i = 0; i < SLICES; i++) {
    let avg = state.sliceY[i];
    if (i > 0 && i < SLICES - 1) avg = (state.sliceY[i - 1] + state.sliceY[i + 1]) * 0.5;
    state.sliceVelY[i] += (-165 * state.sliceY[i] + 55 * (avg - state.sliceY[i]) - 13 * state.sliceVelY[i]) * dt;
    state.sliceY[i] = Math.max(-16, Math.min(20, state.sliceY[i] + state.sliceVelY[i] * dt));
  }

  if (state.dragSubMode !== 'tail') {
    state.tailVelX += (-150 * state.tailPullX - 9.2 * state.tailVelX) * dt;
    state.tailVelY += (-150 * state.tailPullY - 9.2 * state.tailVelY) * dt;
    state.tailPullX += state.tailVelX * dt;
    state.tailPullY += state.tailVelY * dt;
  }

  state.tailWagPhase += dt * (5.5 + (state.happiness / 100) * 16 + state.pettingEnergy * 10 + (state.eatingTimer > 0 ? 20 : 0));

  if (state.eatingTimer > 0) {
    state.eatingTimer = Math.max(0, state.eatingTimer - dt);
    state.pettingEnergy = Math.max(state.pettingEnergy, 0.55);
    state.chewAccum += dt;
    if (state.chewAccum >= 0.34) {
      state.chewAccum = 0;
      audio.playCrunch();
      state.bounceVelY -= 70;
      const m = getMouthScreenPos();
      spawnParticle(m.x, m.y - 16, Math.random() > 0.45 ? 'heart' : 'text', '咔嚓!');
    }
  }

  for (let i = state.treats.length - 1; i >= 0; i--) {
    const tr = state.treats[i];
    tr.vy += 480 * dt; tr.x += tr.vx * dt; tr.y += tr.vy * dt; tr.rot += tr.vrot * dt;
    if (Math.hypot(tr.x - tr.targetX, tr.y - tr.targetY) < 48) {
      state.treats.splice(i, 1);
      state.eatingTimer = 2.2;
      state.chewAccum = 0.34;
      state.happiness = Math.min(100, state.happiness + 18);
      showToast('狗狗摇着尾巴开心地吃起来啦！');
    } else if (tr.y > H + 40) {
      state.treats.splice(i, 1);
    }
  }

  for (let i = state.soundWaves.length - 1; i >= 0; i--) {
    state.soundWaves[i].r += dt * 150;
    state.soundWaves[i].life -= dt * 1.8;
    if (state.soundWaves[i].life <= 0) state.soundWaves.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.decay * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function render() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const r = getDrawRect();
  const b = BREEDS[stats.breed];
  const p = state.pitch;
  const elevFlip = isFlippedRightView();
  const hasMid = Boolean(b.top45Src && b.bot45Src);
  const topT = hasMid ? 67.5 : 38;
  const botT = hasMid ? -67.5 : -38;

  if (p >= topT) {
    drawDogFrame(getImage(b.top90Src), elevFlip, r, false, 0, 0, 1, 1);
  } else if (hasMid && p >= 22.5) {
    drawDogFrame(getImage(b.top45Src), elevFlip, r, false, 0, 0, 1, 1);
  } else if (p <= botT) {
    drawDogFrame(getImage(b.bot90Src), elevFlip, r, false, 0, 0, 1, 1);
  } else if (hasMid && p <= -22.5) {
    drawDogFrame(getImage(b.bot45Src), elevFlip, r, false, 0, 0, 1, 1);
  } else {
    const stepDeg = 360 / b.ring.length;
    const idx = Math.round(normYaw(state.yaw) / stepDeg) % b.ring.length;
    const frame = b.ring[idx];
    drawDogFrame(getImage(frame.src), frame.flip, r, isSideTailEligible() || state.eatingTimer > 0, 0, 0, 1, 1);
  }

  // Barking open mouth + soundwaves
  if (state.barkTimer > 0) {
    const m = getMouthScreenPos();
    if (!m.isRear) {
      const openH = Math.abs(Math.sin((state.barkTimer / 0.72) * Math.PI * 2)) * 13 * state.zoom + 4;
      ctx.save();
      ctx.translate(m.x, m.y + 4);
      ctx.fillStyle = '#2b1315';
      ctx.beginPath(); ctx.ellipse(0, openH * 0.28, 10 * state.zoom, openH * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef6f8c';
      ctx.beginPath(); ctx.ellipse(0, openH * 0.52, 6 * state.zoom, openH * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  state.soundWaves.forEach((sw) => {
    ctx.save(); ctx.globalAlpha = Math.max(0, sw.life * 0.7); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  });

  if (state.eatingTimer > 0) {
    const m = getMouthScreenPos();
    drawBone(m.x + (m.facingRight ? 10 : -10), m.y + 8 + Math.sin(state.time * 22) * 4, Math.sin(state.time * 18) * 0.22);
  }
  state.treats.forEach((tr) => drawBone(tr.x, tr.y, tr.rot));

  state.particles.forEach((pt) => {
    ctx.save(); ctx.globalAlpha = Math.max(0, pt.life);
    if (pt.type === 'heart') {
      ctx.fillStyle = '#f06595'; ctx.font = '16px sans-serif'; ctx.fillText('❤', pt.x, pt.y);
    } else if (pt.type === 'bubble') {
      ctx.strokeStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2); ctx.stroke();
    } else if (pt.type === 'fur') {
      ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + 10, pt.y - 4); ctx.stroke();
    } else if (pt.type === 'wind') {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pt.x - 10, pt.y); ctx.lineTo(pt.x + 14, pt.y - 2); ctx.stroke();
    } else if (pt.type === 'text') {
      ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#d97706'; ctx.fillText(pt.text, pt.x, pt.y);
    } else {
      ctx.fillStyle = '#f59e0b'; ctx.font = '15px sans-serif'; ctx.fillText('✦', pt.x, pt.y);
    }
    ctx.restore();
  });

  // Render active touch hand/tool indicator when pressing on dog
  if (state.touchDown && state.interactMode === 'pet') {
    const iconMap = { hand: '✊', scratch: '🐾', comb: '🪮', bubble: '🫧', dryer: '💨' };
    ctx.save();
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconMap[state.activeTool] || '✊', state.touchX, state.touchY - 12);
    ctx.restore();
  }

  renderUI(ctx, W, H, layout, state, stats, audio.isEnabled());
}

function startLoop() {
  let lastTime = Date.now();
  const loop = () => {
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    render();
    rafId = canvas.requestAnimationFrame(loop);
  };
  rafId = canvas.requestAnimationFrame(loop);
}

Page({
  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#dogCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0]) return;
      const node = res[0].node;

      let sysInfo;
      try {
        sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (e) {
        sysInfo = wx.getSystemInfoSync();
      }
      const dpr = Math.min(sysInfo.pixelRatio || 2, 2);

      W = res[0].width;
      H = res[0].height;
      canvas = node;
      ctx = node.getContext('2d');
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.scale(dpr, dpr);

      topSafe = (sysInfo.statusBarHeight || 24) + 6;
      try {
        const menuRect = wx.getMenuButtonBoundingClientRect();
        if (menuRect && menuRect.top) topSafe = menuRect.top;
      } catch (e) {}

      preloadBreed(stats.breed);
      refreshLayout();
      startLoop();
    });
  },
  onTouchStart(e) { handleTouchStart(e); },
  onTouchMove(e) { handleTouchMove(e); },
  onTouchEnd(e) { handleTouchEnd(e); },
  onTouchCancel() { handleTouchCancel(); },
  onShareAppMessage() {
    return { title: '快来 360° 沉浸式撸真实小狗！' };
  },
  onUnload() {
    if (canvas && rafId) canvas.cancelAnimationFrame(rafId);
  }
});
