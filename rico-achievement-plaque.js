(() => {
  "use strict";

  const BUILD_TAG = "plaque-frame-20261030-v1";

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

  function drawLaurel(ctx, cx, cy, radius, color, scale) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 5 * scale;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, dir === -1 ? Math.PI * 0.65 : Math.PI * 0.35, dir === -1 ? Math.PI * 1.35 : Math.PI * -0.35, dir === -1);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const t = 0.12 + i * 0.11;
        const angle = dir === -1 ? Math.PI * (0.67 + 0.66 * t) : Math.PI * (0.33 - 0.66 * t);
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + (dir === -1 ? -0.45 : 0.45));
        ctx.beginPath();
        ctx.ellipse(0, 0, 9 * scale, 22 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawGrowthIcon(ctx, cx, cy, scale, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 8 * scale;
    ctx.lineCap = "round";
    const barW = 18 * scale;
    const gap = 12 * scale;
    const heights = [36, 58, 86].map((v) => v * scale);
    const startX = cx - (barW * 3 + gap * 2) / 2;
    heights.forEach((h, i) => {
      const x = startX + i * (barW + gap);
      ctx.fillRect(x, cy + 36 * scale - h, barW, h);
    });
    ctx.beginPath();
    ctx.moveTo(cx - 54 * scale, cy + 4 * scale);
    ctx.lineTo(cx - 10 * scale, cy - 30 * scale);
    ctx.lineTo(cx + 18 * scale, cy - 13 * scale);
    ctx.lineTo(cx + 63 * scale, cy - 62 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 63 * scale, cy - 62 * scale);
    ctx.lineTo(cx + 42 * scale, cy - 57 * scale);
    ctx.lineTo(cx + 58 * scale, cy - 39 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlaque(canvas, level, size) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const S = Math.min(W / 3000, H / 4000);
    const bronze = level.name === "Bronze" ? "#c98345" : level.color;
    const accent = level.color;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#030806");
    bg.addColorStop(0.48, "#07110c");
    bg.addColorStop(1, "#010403");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.72);
    glow.addColorStop(0, "rgba(34,145,83,.16)");
    glow.addColorStop(0.55, "rgba(15,72,42,.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Corner ribbons inspired by a physical framed plaque.
    ctx.globalAlpha = 0.72;
    const ribbon = ctx.createLinearGradient(0, 0, W * 0.38, H * 0.22);
    ribbon.addColorStop(0, "#0e3823");
    ribbon.addColorStop(0.55, "#0a2117");
    ribbon.addColorStop(1, "rgba(5,18,12,0)");
    ctx.fillStyle = ribbon;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W * 0.34, 0); ctx.lineTo(W * 0.14, H * 0.22); ctx.lineTo(0, H * 0.29); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, H); ctx.lineTo(W * 0.66, H); ctx.lineTo(W * 0.86, H * 0.78); ctx.lineTo(W, H * 0.71); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // Fine geometric lines.
    line(ctx, W * 0.05, H * 0.16, W * 0.25, H * 0.02, Math.max(2, 3 * S), "rgba(76,214,126,.45)");
    line(ctx, W * 0.95, H * 0.84, W * 0.75, H * 0.98, Math.max(2, 3 * S), "rgba(76,214,126,.45)");
    line(ctx, W * 0.08, H * 0.92, W * 0.30, H * 0.99, Math.max(2, 2 * S), "rgba(255,255,255,.12)");
    line(ctx, W * 0.92, H * 0.08, W * 0.70, H * 0.01, Math.max(2, 2 * S), "rgba(255,255,255,.12)");

    // Printable safety border.
    const m = Math.round(Math.min(W, H) * 0.035);
    ctx.strokeStyle = "rgba(224,231,226,.9)";
    ctx.lineWidth = Math.max(4, 6 * S);
    roundRect(ctx, m, m, W - 2 * m, H - 2 * m, 28 * S);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = Math.max(2, 2 * S);
    roundRect(ctx, m + 24 * S, m + 24 * S, W - 2 * m - 48 * S, H - 2 * m - 48 * S, 22 * S);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#dfe7e2";
    ctx.font = `700 ${Math.round(48 * S)}px Arial`;
    spacedText(ctx, "CONQUISTA DESBLOQUEADA", W / 2, H * 0.115, 11 * S);
    line(ctx, W * 0.12, H * 0.118, W * 0.28, H * 0.118, 3 * S, "rgba(225,231,227,.72)");
    line(ctx, W * 0.72, H * 0.118, W * 0.88, H * 0.118, 3 * S, "rgba(225,231,227,.72)");

    ctx.fillStyle = "#ffffff";
    const titleSize = fitText(ctx, "DASHBOARD DE LUCRO CPA", W * 0.82, 112 * S, 66 * S, 900);
    ctx.font = `900 ${titleSize}px Arial`;
    ctx.fillText("DASHBOARD DE LUCRO CPA", W / 2, H * 0.205);

    ctx.fillStyle = "#c7d0ca";
    ctx.font = `600 ${Math.round(64 * S)}px Arial`;
    spacedText(ctx, "EQUIPE RICO", W / 2, H * 0.252, 15 * S);

    // Main monetary milestone with metallic gradient.
    const moneyGrad = ctx.createLinearGradient(0, H * 0.30, 0, H * 0.50);
    moneyGrad.addColorStop(0, "#ffffff");
    moneyGrad.addColorStop(0.42, "#e4e7e5");
    moneyGrad.addColorStop(0.72, "#aeb5b0");
    moneyGrad.addColorStop(1, "#f5f7f6");
    ctx.shadowColor = "rgba(61,230,124,.38)";
    ctx.shadowBlur = 36 * S;
    ctx.fillStyle = moneyGrad;
    const moneySize = fitText(ctx, `R$ ${level.label}`, W * 0.82, 430 * S, 250 * S, 950);
    ctx.font = `950 ${moneySize}px Arial`;
    ctx.fillText(`R$ ${level.label}`, W / 2, H * 0.47);
    ctx.shadowBlur = 0;
    line(ctx, W * 0.20, H * 0.488, W * 0.80, H * 0.488, 5 * S, "rgba(51,221,116,.45)");

    // Level badge.
    const badgeW = W * 0.43;
    const badgeH = 150 * S;
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = H * 0.525;
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
    badgeGrad.addColorStop(0, "rgba(59,31,18,.96)");
    badgeGrad.addColorStop(1, "rgba(24,15,11,.96)");
    ctx.fillStyle = badgeGrad;
    ctx.strokeStyle = bronze;
    ctx.lineWidth = 5 * S;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 28 * S);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e4b37d";
    ctx.font = `800 ${Math.round(62 * S)}px Arial`;
    spacedText(ctx, `NÍVEL ${level.name.toUpperCase()}`, W / 2, badgeY + badgeH * 0.67, 10 * S);
    line(ctx, W * 0.10, badgeY + badgeH / 2, badgeX - 40 * S, badgeY + badgeH / 2, 4 * S, bronze);
    line(ctx, badgeX + badgeW + 40 * S, badgeY + badgeH / 2, W * 0.90, badgeY + badgeH / 2, 4 * S, bronze);

    ctx.fillStyle = "#f1f4f2";
    const congratsSize = fitText(ctx, "PARABÉNS POR ALCANÇAR ESTA META!", W * 0.83, 66 * S, 42 * S, 700);
    ctx.font = `700 ${congratsSize}px Arial`;
    spacedText(ctx, "PARABÉNS POR ALCANÇAR ESTA META!", W / 2, H * 0.665, 5 * S);

    // Laurel / growth mark.
    const emblemY = H * 0.765;
    const emblemR = 135 * S;
    drawLaurel(ctx, W / 2, emblemY, emblemR, bronze, S);
    drawGrowthIcon(ctx, W / 2, emblemY + 28 * S, S, bronze);

    ctx.fillStyle = "#d2dad5";
    ctx.font = `700 ${Math.round(44 * S)}px Arial`;
    spacedText(ctx, "CONSTÂNCIA • EVOLUÇÃO • RESULTADO", W / 2, H * 0.875, 7 * S);

    ctx.fillStyle = "rgba(194,205,198,.72)";
    ctx.font = `500 ${Math.round(32 * S)}px Arial`;
    ctx.fillText("DASHBOARD DE LUCRO CPA — EQUIPE RICO", W / 2, H * 0.925);

    ctx.fillStyle = "rgba(132,155,141,.75)";
    ctx.font = `500 ${Math.round(24 * S)}px Arial`;
    ctx.fillText(`${size.label} • preparado para impressão`, W / 2, H * 0.954);

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
      if (typeof renderAchievements === "function") {
        const originalRender = renderAchievements;
        renderAchievements = function () {
          rebuildSizes();
          originalRender();
          try {
            ACHIEVEMENT_LEVELS.forEach((level) => {
              const sel = document.getElementById(`achSize${level.value}`);
              if (sel && [...sel.options].some((o) => o.value === "30x40")) sel.value = "30x40";
            });
          } catch (_) {}
        };
      }
    } catch (_) {}

    window.__ricoPlaqueBuild = BUILD_TAG;
    return true;
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installDownloader() || attempts > 40) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
