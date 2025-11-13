// stuff/dayNightClock.js
// Compact, auto-sized 12-hour clock with subtle theming.

function roundRectPath(ctx, x, y, w, h, r = 6) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * Draw a HH:MM AM/PM clock synced to createDayNight().
 * @param {CanvasRenderingContext2D} ctx
 * @param {{getCycle:()=>{t:number,darkness?:number,dayLight?:number}}} dayNight
 * @param {number} x left
 * @param {number} y top
 */
export function drawClock(ctx, dayNight, x = 20, y = 20) {
  if (!dayNight?.getCycle) return;
  const cyc = dayNight.getCycle();
  const darkness = Math.max(0, Math.min(1, cyc.darkness ?? 0));

  // time → hh:mm am/pm
  const mins = Math.floor((cyc.t * 1440 + 0.5) % 1440);
  let h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const hh = (h24 % 12 || 12).toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  const text = `${hh}:${mm} ${ampm}`;

  // style + layout
  ctx.save();
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const padX = 10, padY = 6;
  const textW = Math.ceil(ctx.measureText(text).width);
  const boxW = textW + padX * 2;
  const boxH = 24 + padY * 2;

  // background (darker at night)
  const bgA = 0.45 + darkness * 0.35;              // 0.45→0.80
  const strokeA = 0.18 + darkness * 0.20;          // subtle border
  ctx.globalAlpha = 1;

  // rounded rect
  roundRectPath(ctx, x - 0.5, y - 0.5, boxW, boxH, 7);
  ctx.fillStyle = `rgba(0,0,0,${bgA})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${strokeA})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // tiny progress bar (day progress)
  const pct = cyc.t; // 0..1
  const barX = x + 6, barY = y + boxH - 8, barW = boxW - 12, barH = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = `rgba(${40 + 180 * (1 - darkness) | 0}, ${180 + 40 * (1 - darkness) | 0}, 220, ${0.45 + 0.35 * (1 - darkness)})`;
  ctx.fillRect(barX, barY, Math.max(2, Math.round(barW * pct)), barH);

  // text with soft shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + padX, y + padY);

  ctx.restore();
}
