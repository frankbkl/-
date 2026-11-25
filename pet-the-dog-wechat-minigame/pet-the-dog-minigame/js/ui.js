const TOOLS = [
  { id: 'hand',    icon: '✋', label: '手掌' },
  { id: 'scratch', icon: '🐾', label: '抓毛' },
  { id: 'comb',    icon: '🪮', label: '梳毛' },
  { id: 'bubble',  icon: '🫧', label: '泡泡' },
  { id: 'dryer',   icon: '💨', label: '吹毛' }
];

function drawRoundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function buildLayout(W, H, topSafe, allBreedKeys, BREEDS) {
  const buttons = [];
  const pad = 14;

  // Row 1 (below status bar / aligned with menu button): Mode switch
  const y1 = topSafe + 4;
  buttons.push({ id: 'mode_spin', x: pad, y: y1, w: 96, h: 32, type: 'mode', value: 'spin', label: '360° 旋转' });
  buttons.push({ id: 'mode_pet',  x: pad + 102, y: y1, w: 88, h: 32, type: 'mode', value: 'pet',  label: '撸狗模式' });

  // Row 2: Action buttons
  const y2 = y1 + 42;
  const actDefs = [
    { id: 'act_custom', label: '+ 定制狗狗', cta: true, w: 92 },
    { id: 'act_treat',  label: '喂骨头',     w: 66 },
    { id: 'act_bark',   label: '汪一声',     w: 66 },
    { id: 'act_sound',  label: '音效',       w: 56 },
    { id: 'act_auto',   label: '巡航',       w: 52 }
  ];
  let cx = pad;
  actDefs.forEach((a) => {
    if (cx + a.w > W - pad) return;
    buttons.push({ id: a.id, x: cx, y: y2, w: a.w, h: 30, type: 'action', label: a.label, cta: a.cta });
    cx += a.w + 6;
  });

  // Right-side vertical tool dock
  const toolW = 48;
  const toolH = 44;
  const toolGap = 6;
  const dockH = TOOLS.length * toolH + (TOOLS.length - 1) * toolGap + 12;
  const dockX = W - toolW - 14;
  const dockY = Math.max(y2 + 44, (H - dockH) * 0.48);

  TOOLS.forEach((t, idx) => {
    buttons.push({
      id: 'tool_' + t.id,
      x: dockX,
      y: dockY + 6 + idx * (toolH + toolGap),
      w: toolW,
      h: toolH,
      type: 'tool',
      value: t.id,
      icon: t.icon,
      label: t.label
    });
  });

  // Bottom breed selector pills (2 rows if needed)
  const breedYStart = H - 96;
  let bx = pad;
  let by = breedYStart;
  allBreedKeys.forEach((key) => {
    const b = BREEDS[key];
    if (!b) return;
    const label = b.isCustom ? `★${b.name}` : b.name;
    const bw = Math.max(54, label.length * 14 + 22);
    if (bx + bw > W - pad) {
      bx = pad;
      by += 36;
    }
    buttons.push({ id: 'breed_' + key, x: bx, y: by, w: bw, h: 30, type: 'breed', value: key, label });
    bx += bw + 6;
  });

  // Zoom +/- buttons above breed bar on right
  const zoomY = breedYStart - 38;
  buttons.push({ id: 'act_zoom_out', x: W - pad - 76, y: zoomY, w: 34, h: 28, type: 'action', label: '－' });
  buttons.push({ id: 'act_zoom_in',  x: W - pad - 36, y: zoomY, w: 34, h: 28, type: 'action', label: '＋' });

  return { buttons, dockRect: { x: dockX - 5, y: dockY, w: toolW + 10, h: dockH }, y2, zoomY, pad };
}

function renderUI(ctx, W, H, layout, state, stats, soundOn) {
  const { buttons, dockRect, y2, zoomY, pad } = layout;

  // Tool dock background
  ctx.save();
  drawRoundRect(ctx, dockRect.x, dockRect.y, dockRect.w, dockRect.h, 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Happiness & stats bar (left side above breed bar)
  const infoY = zoomY;
  ctx.save();
  drawRoundRect(ctx, pad, infoY, Math.min(248, W - pad * 2 - 86), 28, 14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  ctx.stroke();

  const yawDeg = Math.round(((state.yaw % 360) + 360) % 360) % 360;
  const pitchDeg = Math.round(state.pitch);
  const pSign = pitchDeg > 0 ? `+${pitchDeg}°` : `${pitchDeg}°`;
  ctx.font = '600 11px sans-serif';
  ctx.fillStyle = '#44403c';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`水平${yawDeg}° 俯仰${pSign} · 已撸${stats.petCount}次`, pad + 10, infoY + 14);
  ctx.restore();

  // Mood bar below row 2
  const moodY = y2 + 38;
  ctx.save();
  ctx.font = '600 11px sans-serif';
  ctx.fillStyle = '#78716c';
  ctx.textBaseline = 'middle';
  ctx.fillText('开心值', pad, moodY + 6);
  drawRoundRect(ctx, pad + 42, moodY + 2, 74, 8, 4);
  ctx.fillStyle = '#eceae6';
  ctx.fill();
  drawRoundRect(ctx, pad + 42, moodY + 2, Math.max(6, (state.happiness / 100) * 74), 8, 4);
  ctx.fillStyle = state.happiness > 70 ? '#ef4444' : '#f59e0b';
  ctx.fill();
  ctx.restore();

  // Draw all buttons
  buttons.forEach((b) => {
    let active = false;
    if (b.type === 'mode' && state.interactMode === b.value) active = true;
    if (b.type === 'tool' && state.activeTool === b.value) active = true;
    if (b.type === 'breed' && stats.breed === b.value) active = true;
    if (b.id === 'act_auto' && state.autoSpin) active = true;

    ctx.save();
    drawRoundRect(ctx, b.x, b.y, b.w, b.h, b.type === 'tool' ? 11 : 15);
    if (b.cta) {
      ctx.fillStyle = '#d97706';
      ctx.fill();
    } else if (active) {
      ctx.fillStyle = '#1c1917';
      ctx.fill();
    } else {
      ctx.fillStyle = b.type === 'tool' ? 'transparent' : 'rgba(255,255,255,0.94)';
      ctx.fill();
      if (b.type !== 'tool') {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (b.type === 'tool') {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = active ? '#ffffff' : '#1c1917';
      ctx.fillText(b.icon, b.x + b.w / 2, b.y + 15);
      ctx.font = '600 10px sans-serif';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + 33);
    } else {
      let text = b.label;
      if (b.id === 'act_sound') text = soundOn ? '音效开' : '静音';
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = (active || b.cta) ? '#ffffff' : '#1c1917';
      ctx.fillText(text, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
    }
    ctx.restore();
  });

  // Toast overlay
  if (state.toastText && state.toastTimer > 0) {
    ctx.save();
    ctx.font = '600 12px sans-serif';
    const tw = ctx.measureText(state.toastText).width + 26;
    const tx = (W - tw) / 2;
    const ty = zoomY - 40;
    drawRoundRect(ctx, tx, ty, tw, 28, 14);
    ctx.fillStyle = 'rgba(28, 25, 23, 0.86)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.toastText, W / 2, ty + 14);
    ctx.restore();
  }
}

function hitTestButtons(layout, x, y) {
  for (let i = layout.buttons.length - 1; i >= 0; i--) {
    const b = layout.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return b;
    }
  }
  return null;
}

module.exports = { buildLayout, renderUI, hitTestButtons };
