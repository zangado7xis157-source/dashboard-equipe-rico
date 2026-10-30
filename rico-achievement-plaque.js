(() => {
  "use strict";

  const BUILD_TAG = "plaque-premium-20261030-v3";

  function rebuildSizes() {
    try {
      if (typeof ACHIEVEMENT_SIZES === "undefined") return;
      Object.keys(ACHIEVEMENT_SIZES).forEach((key) => delete ACHIEVEMENT_SIZES[key]);
      Object.assign(ACHIEVEMENT_SIZES, {
        "30x40": { w: 3543, h: 4724, label: "30 x 40 cm — 3543 × 4724 px" },
        "20x30": { w: 2362, h: 3543, label: "20 x 30 cm — 2362 × 3543 px" },
        "A4": { w: 2480, h: 3508, label: "A4 — 2480 × 3508 px" },
        "40x50": { w: 4724, h: 5906, label: "40 x 50 cm — 4724 × 5906 px" },
        "A3": { w: 3508, h: 4961, label: "A3 — 3508 × 4961 px" }
      });
    } catch (_) {}
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth, startSize, minSize, weight = 800, family = "Arial") {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= Math.max(1, startSize / 90);
    }
    return size;
  }

  function spacedText(ctx, text, x, y, spacing) {
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    let cursor = x - total / 2;
    chars.forEach((c, i) => {
      ctx.fillText(c, cursor + widths[i] / 2, y);
      cursor += widths[i] + spacing;
    });
  }

  function line(ctx, x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function polygon(ctx, pts, fill, stroke = null, lineWidth = 1) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function drawCrown(ctx, cx, cy, S, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(-72 * S, 28 * S);
    ctx.lineTo(-56 * S, -34 * S);
    ctx.lineTo(-18 * S, 2 * S);
    ctx.lineTo(0, -62 * S);
    ctx.lineTo(22 * S, 2 * S);
    ctx.lineTo(60 * S, -34 * S);
    ctx.lineTo(72 * S, 28 * S);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-68 * S, 32 * S, 136 * S, 18 * S);
    ctx.restore();
  }

  function drawLaurel(ctx, cx, cy, radiusX, radiusY, color, S) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 5 * S;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const angle = dir === -1 ? Math.PI * (0.63 + 0.72 * t) : Math.PI * (0.37 - 0.72 * t);
        const x = cx + Math.cos(angle) * radiusX;
        const y = cy + Math.sin(angle) * radiusY;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < 9; i++) {
        const t = 0.10 + i * 0.095;
        const angle = dir === -1 ? Math.PI * (0.66 + 0.62 * t) : Math.PI * (0.34 - 0.62 * t);
        const px = cx + Math.cos(angle) * radiusX;
        const py = cy + Math.sin(angle) * radiusY;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + (dir === -1 ? -0.45 : 0.45));
        ctx.beginPath();
        ctx.ellipse(0, 0, 14 * S, 32 * S, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawGrowthIcon(ctx, cx, cy, S, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 7 * S;
    ctx.lineCap = "round";
    const barW = 17 * S;
    const gap = 12 * S;
    const heights = [34, 58, 88].map((v) => v * S);
    const startX = -(barW * 3 + gap * 2) / 2;
    heights.forEach((h, i) => {
      const x = startX + i * (barW + gap);
      ctx.fillRect(x, 44 * S - h, barW, h);
    });
    ctx.beginPath();
    ctx.moveTo(-60 * S, 12 * S);
    ctx.lineTo(-20 * S, -24 * S);
    ctx.lineTo(12 * S, -4 * S);
    ctx.lineTo(62 * S, -62 * S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(62 * S, -62 * S);
    ctx.lineTo(39 * S, -56 * S);
    ctx.lineTo(57 * S, -36 * S);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEquipeRicoMark(ctx, cx, cy, S, gold) {
    ctx.save();
    ctx.translate(cx, cy);
    const r = 64 * S;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
    glow.addColorStop(0, "rgba(40,230,115,.22)");
    glow.addColorStop(1, "rgba(40,230,115,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5 * S;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(52,225,117,.75)";
    ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.arc(0, 0, r - 10 * S, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(60 * S)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("R", 0, 3 * S);
    ctx.restore();
  }

  function drawPremiumBackground(ctx, W, H, S, green, gold) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#020504");
    bg.addColorStop(0.35, "#07110c");
    bg.addColorStop(0.68, "#02100a");
    bg.addColorStop(1, "#010202");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const centerGlow = ctx.createRadialGradient(W * 0.5, H * 0.43, 0, W * 0.5, H * 0.43, W * 0.62);
    centerGlow.addColorStop(0, "rgba(22,177,78,.24)");
    centerGlow.addColorStop(0.35, "rgba(9,100,47,.13)");
    centerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, W, H);

    // Subtle tech grid.
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#6ef09a";
    ctx.lineWidth = Math.max(1, S);
    const grid = Math.max(90 * S, 40);
    for (let x = -H * 0.15; x < W + H * 0.15; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.18, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // Premium angular side panels.
    const panelDark = "rgba(8,20,15,.95)";
    const panelMid = "rgba(10,48,28,.78)";
    polygon(ctx, [[0,0],[W*.25,0],[W*.09,H*.20],[0,H*.29]], panelDark);
    polygon(ctx, [[0,0],[W*.18,0],[W*.05,H*.14],[0,H*.19]], panelMid);
    polygon(ctx, [[W,0],[W*.75,0],[W*.91,H*.20],[W,H*.29]], panelDark);
    polygon(ctx, [[W,0],[W*.82,0],[W*.95,H*.14],[W,H*.19]], panelMid);
    polygon(ctx, [[0,H],[W*.27,H],[W*.08,H*.78],[0,H*.70]], panelDark);
    polygon(ctx, [[W,H],[W*.73,H],[W*.92,H*.78],[W,H*.70]], panelDark);

    line(ctx, W*.055, H*.02, W*.19, H*.17, 5*S, "rgba(47,242,118,.72)");
    line(ctx, W*.945, H*.02, W*.81, H*.17, 5*S, "rgba(47,242,118,.72)");
    line(ctx, W*.055, H*.98, W*.20, H*.84, 4*S, "rgba(47,242,118,.55)");
    line(ctx, W*.945, H*.98, W*.80, H*.84, 4*S, "rgba(47,242,118,.55)");

    // Tiny finance silhouettes behind centerpiece.
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = green;
    ctx.font = `900 ${Math.round(300*S)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("$", W*.15, H*.42);
    ctx.fillText("↗", W*.84, H*.43);
    const baseY = H*.43;
    for (let i = 0; i < 6; i++) {
      const bh = (60 + i*40)*S;
      ctx.fillRect(W*.77 + i*55*S, baseY - bh, 26*S, bh);
    }
    ctx.restore();

    // Gold + green outer frame.
    const m = Math.round(Math.min(W,H)*0.024);
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(5, 8*S);
    roundRect(ctx, m, m, W-2*m, H-2*m, 18*S); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = Math.max(2, 3*S);
    roundRect(ctx, m+18*S, m+18*S, W-2*m-36*S, H-2*m-36*S, 14*S); ctx.stroke();
    ctx.strokeStyle = "rgba(43,236,111,.55)";
    ctx.lineWidth = Math.max(2, 3*S);
    roundRect(ctx, m+34*S, m+34*S, W-2*m-68*S, H-2*m-68*S, 12*S); ctx.stroke();
  }

  function drawPlaque(canvas, level, size) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const S = Math.min(W / 3000, H / 4000);
    const green = "#22d86c";
    const gold = "#d9a954";
    const bronze = level.name === "Bronze" ? "#c98345" : level.color;

    drawPremiumBackground(ctx, W, H, S, green, gold);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Crown + heading.
    drawCrown(ctx, W/2, H*0.075, S, gold);
    ctx.fillStyle = "#eef3ef";
    ctx.font = `700 ${Math.round(50*S)}px Arial`;
    spacedText(ctx, "CONQUISTA DESBLOQUEADA", W/2, H*0.135, 12*S);
    line(ctx, W*.16, H*.138, W*.31, H*.138, 3*S, "rgba(217,169,84,.7)");
    line(ctx, W*.69, H*.138, W*.84, H*.138, 3*S, "rgba(217,169,84,.7)");

    // Title only at top — EQUIPE RICO moved to bottom.
    ctx.fillStyle = "#ffffff";
    const titleSize = fitText(ctx, "DASHBOARD DE LUCRO CPA", W*.80, 116*S, 64*S, 900);
    ctx.font = `900 ${titleSize}px Arial`;
    ctx.shadowColor = "rgba(255,255,255,.18)";
    ctx.shadowBlur = 12*S;
    ctx.fillText("DASHBOARD DE LUCRO CPA", W/2, H*0.205);
    ctx.shadowBlur = 0;

    line(ctx, W*.25, H*.233, W*.75, H*.233, 3*S, "rgba(42,224,105,.55)");

    // Large centerpiece with laurel branches.
    const centerY = H*0.445;
    drawLaurel(ctx, W/2, centerY+30*S, W*.28, H*.16, gold, S);

    const moneyGrad = ctx.createLinearGradient(0, H*.30, 0, H*.52);
    moneyGrad.addColorStop(0, "#ffffff");
    moneyGrad.addColorStop(.28, "#ecf2ee");
    moneyGrad.addColorStop(.55, "#35e177");
    moneyGrad.addColorStop(.78, "#0b8d43");
    moneyGrad.addColorStop(1, "#ffffff");
    ctx.fillStyle = moneyGrad;
    ctx.strokeStyle = "rgba(217,169,84,.85)";
    ctx.lineWidth = 4*S;
    ctx.shadowColor = "rgba(29,235,102,.72)";
    ctx.shadowBlur = 58*S;
    const moneySize = fitText(ctx, `R$ ${level.label}`, W*.73, 520*S, 280*S, 950);
    ctx.font = `950 ${moneySize}px Arial`;
    ctx.strokeText(`R$ ${level.label}`, W/2, centerY+105*S);
    ctx.fillText(`R$ ${level.label}`, W/2, centerY+105*S);
    ctx.shadowBlur = 0;
    line(ctx, W*.22, centerY+155*S, W*.78, centerY+155*S, 7*S, "rgba(45,238,111,.75)");

    // Bronze badge.
    const badgeW = W*.48;
    const badgeH = 160*S;
    const badgeX = W/2-badgeW/2;
    const badgeY = H*.565;
    const badgeGrad = ctx.createLinearGradient(0,badgeY,0,badgeY+badgeH);
    badgeGrad.addColorStop(0,"#3e2315");
    badgeGrad.addColorStop(1,"#160d09");
    ctx.fillStyle = badgeGrad;
    ctx.strokeStyle = bronze;
    ctx.lineWidth = 5*S;
    roundRect(ctx,badgeX,badgeY,badgeW,badgeH,28*S); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f0bc7e";
    ctx.font = `900 ${Math.round(64*S)}px Arial`;
    spacedText(ctx, `NÍVEL ${level.name.toUpperCase()}`, W/2, badgeY+badgeH*.68, 10*S);
    line(ctx,W*.10,badgeY+badgeH/2,badgeX-40*S,badgeY+badgeH/2,4*S,gold);
    line(ctx,badgeX+badgeW+40*S,badgeY+badgeH/2,W*.90,badgeY+badgeH/2,4*S,gold);

    // Congratulatory block.
    ctx.fillStyle = "#f7faf8";
    const congrats = "PARABÉNS POR ALCANÇAR ESTA META!";
    const congratsSize = fitText(ctx, congrats, W*.83, 72*S, 44*S, 800);
    ctx.font = `800 ${congratsSize}px Arial`;
    spacedText(ctx, congrats, W/2, H*.682, 5*S);

    ctx.fillStyle = "#b8c5bd";
    const thanks = "Obrigado por confiar e fazer parte do Dashboard de Lucro CPA.";
    const thanksSize = fitText(ctx, thanks, W*.78, 48*S, 30*S, 500);
    ctx.font = `500 ${thanksSize}px Arial`;
    ctx.fillText(thanks, W/2, H*.723);

    // Center emblem.
    const emblemY = H*.79;
    drawLaurel(ctx,W/2,emblemY,150*S,120*S,gold,S);
    drawGrowthIcon(ctx,W/2,emblemY+25*S,S,gold);

    ctx.fillStyle = "#e6ece8";
    ctx.font = `700 ${Math.round(44*S)}px Arial`;
    spacedText(ctx,"CONSTÂNCIA • EVOLUÇÃO • RESULTADO",W/2,H*.87,7*S);

    // Brand mark moved to bottom.
    const brandY = H*.935;
    drawEquipeRicoMark(ctx,W/2-185*S,brandY-5*S,S,gold);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(66*S)}px Arial`;
    ctx.fillText("EQUIPE RICO",W/2-90*S,brandY+10*S);
    ctx.fillStyle = "rgba(161,181,169,.82)";
    ctx.font = `500 ${Math.round(24*S)}px Arial`;
    ctx.fillText("DASHBOARD DE LUCRO CPA",W/2-90*S,brandY+52*S);
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(119,143,128,.72)";
    ctx.font = `500 ${Math.round(21*S)}px Arial`;
    ctx.fillText(`${size.label} • preparado para impressão`,W/2,H*.982);

    return canvas;
  }

  function installDownloader() {
    if (typeof ACHIEVEMENT_LEVELS === "undefined" || typeof ACHIEVEMENT_SIZES === "undefined") return false;
    rebuildSizes();

    window.downloadAchievement = (value) => {
      const level = ACHIEVEMENT_LEVELS.find((x) => x.value === value);
      if (!level || (typeof totalAchievementProfit === "function" && totalAchievementProfit() < level.value)) {
        alert("Essa conquista ainda não foi desbloqueada.");
        return;
      }
      const sizeKey = document.getElementById(`achSize${value}`)?.value || "30x40";
      const size = ACHIEVEMENT_SIZES[sizeKey] || ACHIEVEMENT_SIZES["30x40"];
      const canvas = document.createElement("canvas");
      canvas.width = size.w;
      canvas.height = size.h;
      drawPlaque(canvas, level, size);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1);
      a.download = `Equipe-Rico-${level.label}-${sizeKey}-300dpi.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    try {
      if (typeof renderAchievements === "function" && document.getElementById("achievementGrid")) renderAchievements();
    } catch (_) {}
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (installDownloader() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
