let audioCtx = null;
let enabled = true;

function getCtx() {
  if (!enabled) return null;
  try {
    if (!audioCtx && typeof wx.createWebAudioContext === 'function') {
      audioCtx = wx.createWebAudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    return null;
  }
  return audioCtx;
}

function setEnabled(v) { enabled = Boolean(v); }
function isEnabled() { return enabled; }

function playStroke(happiness) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    const base = 230 + Math.random() * 70 + (happiness || 30) * 1.2;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.16, now + 0.08);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch (e) {}
}

function playTool(tool, happiness) {
  const ac = getCtx();
  if (!ac) return;
  if (tool === 'hand') return playStroke(happiness);
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tool === 'bubble' ? 'sine' : 'triangle';
    const f = tool === 'bubble' ? (520 + Math.random() * 320) : (tool === 'comb' ? 780 : 320);
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.06);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {}
}

function playBoing(intensity) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    const f = 180 + Math.min(intensity || 80, 200) * 0.85;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.85, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(f * 0.85, now + 0.26);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  } catch (e) {}
}

function playBark(pitch) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    const p = (pitch || 400) * (0.95 + Math.random() * 0.1);
    osc.frequency.setValueAtTime(p * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(p * 1.45, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(p * 0.65, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  } catch (e) {}
}

function playCrunch() {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160 + Math.random() * 120, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {}
}

module.exports = { setEnabled, isEnabled, playStroke, playTool, playBoing, playBark, playCrunch };
