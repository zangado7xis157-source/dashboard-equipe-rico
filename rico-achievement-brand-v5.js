(() => {
  "use strict";

  const VALID_SIZES = new Set([
    "3543x4724",
    "2362x3543",
    "2480x3508",
    "4724x5906",
    "3508x4961",
  ]);

  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawDashboardLogo(ctx, cx, cy, size) {
    const x = cx - size / 2;
    const y = cy - size / 2;
    const r = size * 0.215;

    const bg = ctx.createLinearGradient(x, y, x + size, y + size);
    bg.addColorStop(0, "#06111f");
    bg.addColorStop(1, "#0a2340");
    ctx.fillStyle = bg;
    roundedRect(ctx, x, y, size, size, r);
    ctx.fill();

    ctx.strokeStyle = "rgba(20,151,255,.62)";
    ctx.lineWidth = Math.max(3, size * 0.02);
    roundedRect(ctx, x + size * 0.086, y + size * 0.086, size * 0.828, size * 0.828, size * 0.172);
    ctx.stroke();

    const blue = ctx.createLinearGradient(x + size * 0.25, y + size * 0.22, x + size * 0.78, y + size * 0.82);
    blue.addColorStop(0, "#1aa0ff");
    blue.addColorStop(1, "#0068e8");
    ctx.fillStyle = blue;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 512, size / 512);
    ctx.beginPath();
    ctx.moveTo(142, 136);
    ctx.lineTo(265, 136);
    ctx.bezierCurveTo(348, 136, 397, 177, 397, 243);
    ctx.bezierCurveTo(397, 291, 369, 325, 319, 342);
    ctx.lineTo(410, 456);
    ctx.lineTo(319, 456);
    ctx.lineTo(241, 353);
    ctx.lineTo(213, 353);
    ctx.lineTo(213, 456);
    ctx.lineTo(142, 456);
    ctx.closePath();
    ctx.moveTo(213, 197);
    ctx.lineTo(213, 295);
    ctx.lineTo(261, 295);
    ctx.bezierCurveTo(304, 295, 325, 279, 325, 246);
    ctx.bezierCurveTo(325, 214, 304, 197, 261, 197);
    ctx.closePath();
    ctx.fill("evenodd");
    ctx.restore();

    const dotX = x + size * (395 / 512);
    const dotY = y + size * (112 / 512);
    const dotR = size * (34 / 512);
    ctx.fillStyle = "#15ef9f";
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#03120a";
    ctx.lineWidth = Math.max(3, size * (10 / 512));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x + size * (381 / 512), y + size * (113 / 512));
    ctx.lineTo(x + size * (391 / 512), y + size * (123 / 512));
    ctx.lineTo(x + size * (411 / 512), y + size * (98 / 512));
    ctx.stroke();
  }

  function patchPlaque(canvas) {
    const W = canvas.width;
    const H = canvas.height;
    if (!VALID_SIZES.has(`${W}x${H}`) || canvas.dataset.ricoBrandV5 === "1") return;
    canvas.dataset.ricoBrandV5 = "1";

    const ctx = canvas.getContext("2d");
    const S = Math.min(W / 3000, H / 4000);

    // Clean only the existing brand block, preserving the rest of the plaque.
    const bandX = W * 0.31;
    const bandY = H * 0.855;
    const bandW = W * 0.38;
    const bandH = H * 0.11;
    const bandGrad = ctx.createLinearGradient(bandX, bandY, bandX, bandY + bandH);
    bandGrad.addColorStop(0, "rgba(2,15,9,.97)");
    bandGrad.addColorStop(0.5, "rgba(3,18,11,.98)");
    bandGrad.addColorStop(1, "rgba(1,8,5,.98)");
    ctx.fillStyle = bandGrad;
    roundedRect(ctx, bandX, bandY, bandW, bandH, 30 * S);
    ctx.fill();

    const glow = ctx.createRadialGradient(W / 2, H * 0.925, 0, W / 2, H * 0.925, W * 0.13);
    glow.addColorStop(0, "rgba(22,151,255,.16)");
    glow.addColorStop(1, "rgba(22,151,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(bandX, bandY, bandW, bandH);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f5f7f6";
    ctx.font = `900 ${Math.round(56 * S)}px Arial`;
    ctx.fillText("EQUIPE RICO", W / 2, H * 0.892);

    ctx.strokeStyle = "rgba(36,223,112,.65)";
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(W * 0.43, H * 0.903);
    ctx.lineTo(W * 0.57, H * 0.903);
    ctx.stroke();

    drawDashboardLogo(ctx, W / 2, H * 0.938, 150 * S);
  }

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    try { patchPlaque(this); } catch (e) { console.error("Falha ao aplicar logo do Dashboard na placa", e); }
    return originalToDataURL.apply(this, args);
  };
})();
