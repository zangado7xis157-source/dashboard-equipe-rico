(() => {
  "use strict";

  const SIZES = {
    "30x40": { w: 3543, h: 4724, label: "30 x 40 cm — 3543 × 4724 px" },
    "20x30": { w: 2362, h: 3543, label: "20 x 30 cm — 2362 × 3543 px" },
    "A4": { w: 2480, h: 3508, label: "A4 — 2480 × 3508 px" },
    "40x50": { w: 4724, h: 5906, label: "40 x 50 cm — 4724 × 5906 px" },
    "A3": { w: 3508, h: 4961, label: "A3 — 3508 × 4961 px" }
  };

  const rr = (ctx,x,y,w,h,r) => {
    const R=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+R,y); ctx.arcTo(x+w,y,x+w,y+h,R); ctx.arcTo(x+w,y+h,x,y+h,R); ctx.arcTo(x,y+h,x,y,R); ctx.arcTo(x,y,x+w,y,R); ctx.closePath();
  };
  const line = (ctx,x1,y1,x2,y2,width,color) => { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
  const fit = (ctx,text,maxWidth,start,min,weight=900) => { let s=start; while(s>min){ctx.font=`${weight} ${s}px Arial`; if(ctx.measureText(text).width<=maxWidth)break; s-=2;} return s; };
  const spaced = (ctx,text,cx,y,spacing) => {
    const chars=[...text], widths=chars.map(c=>ctx.measureText(c).width); const total=widths.reduce((a,b)=>a+b,0)+spacing*Math.max(0,chars.length-1); let x=cx-total/2; chars.forEach((c,i)=>{ctx.fillText(c,x+widths[i]/2,y); x+=widths[i]+spacing;});
  };
  const poly=(ctx,p,fill,stroke=null,lw=1)=>{ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};

  function drawCrown(ctx,cx,cy,S,gold){
    ctx.save();ctx.translate(cx,cy);ctx.fillStyle=gold;ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=2*S;ctx.beginPath();ctx.moveTo(-70*S,30*S);ctx.lineTo(-54*S,-34*S);ctx.lineTo(-18*S,2*S);ctx.lineTo(0,-62*S);ctx.lineTo(22*S,2*S);ctx.lineTo(58*S,-34*S);ctx.lineTo(70*S,30*S);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(-66*S,34*S,132*S,18*S);ctx.restore();
  }

  function drawLaurel(ctx,cx,cy,rx,ry,color,S){
    ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=5*S;
    for(const dir of [-1,1]){
      ctx.beginPath();
      for(let i=0;i<=34;i++){
        const t=i/34; const a=dir===-1?Math.PI*(0.63+0.74*t):Math.PI*(0.37-0.74*t); const x=cx+Math.cos(a)*rx; const y=cy+Math.sin(a)*ry; if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
      for(let i=0;i<10;i++){
        const t=.08+i*.09; const a=dir===-1?Math.PI*(.66+.64*t):Math.PI*(.34-.64*t); const x=cx+Math.cos(a)*rx; const y=cy+Math.sin(a)*ry;ctx.save();ctx.translate(x,y);ctx.rotate(a+(dir===-1?-.45:.45));ctx.beginPath();ctx.ellipse(0,0,14*S,34*S,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawGrowth(ctx,cx,cy,S,gold){
    ctx.save();ctx.translate(cx,cy);ctx.strokeStyle=gold;ctx.fillStyle=gold;ctx.lineWidth=8*S;ctx.lineCap="round";const bw=18*S,g=13*S,hs=[38,64,94].map(v=>v*S),sx=-(bw*3+g*2)/2;hs.forEach((h,i)=>ctx.fillRect(sx+i*(bw+g),48*S-h,bw,h));ctx.beginPath();ctx.moveTo(-64*S,10*S);ctx.lineTo(-22*S,-28*S);ctx.lineTo(10*S,-8*S);ctx.lineTo(68*S,-70*S);ctx.stroke();ctx.beginPath();ctx.moveTo(68*S,-70*S);ctx.lineTo(44*S,-63*S);ctx.lineTo(62*S,-42*S);ctx.closePath();ctx.fill();ctx.restore();
  }

  function drawBrand(ctx,W,H,S,gold,green){
    const cy=H*.887; const r=76*S;
    const glow=ctx.createRadialGradient(W/2,cy,0,W/2,cy,r*2);glow.addColorStop(0,"rgba(36,230,112,.22)");glow.addColorStop(1,"rgba(36,230,112,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(W/2,cy,r*2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=gold;ctx.lineWidth=6*S;ctx.beginPath();ctx.arc(W/2,cy,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="rgba(38,225,108,.8)";ctx.lineWidth=2*S;ctx.beginPath();ctx.arc(W/2,cy,r-12*S,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#fff";ctx.font=`900 ${Math.round(64*S)}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("R",W/2,cy+2*S);
    ctx.textBaseline="alphabetic";ctx.fillStyle="#f5f7f6";ctx.font=`900 ${Math.round(54*S)}px Arial`;spaced(ctx,"EQUIPE RICO",W/2,H*.94,12*S);
    line(ctx,W*.40,H*.953,W*.60,H*.953,3*S,"rgba(38,225,108,.65)");
  }

  function drawBackground(ctx,W,H,S,green,gold){
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#010303");bg.addColorStop(.33,"#06120c");bg.addColorStop(.68,"#021109");bg.addColorStop(1,"#010202");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const rg=ctx.createRadialGradient(W*.5,H*.43,0,W*.5,H*.43,W*.68);rg.addColorStop(0,"rgba(21,184,80,.28)");rg.addColorStop(.38,"rgba(8,92,43,.14)");rg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.075;ctx.strokeStyle="#6cf29b";ctx.lineWidth=Math.max(1,S);const grid=Math.max(90*S,42);for(let x=-H*.16;x<W+H*.16;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+H*.18,H);ctx.stroke();}for(let y=0;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
    const d="rgba(5,18,12,.96)",m="rgba(9,56,31,.78)";
    poly(ctx,[[0,0],[W*.30,0],[W*.11,H*.20],[0,H*.30]],d);poly(ctx,[[0,0],[W*.20,0],[W*.06,H*.14],[0,H*.20]],m);
    poly(ctx,[[W,0],[W*.70,0],[W*.89,H*.20],[W,H*.30]],d);poly(ctx,[[W,0],[W*.80,0],[W*.94,H*.14],[W,H*.20]],m);
    poly(ctx,[[0,H],[W*.29,H],[W*.08,H*.78],[0,H*.69]],d);poly(ctx,[[W,H],[W*.71,H],[W*.92,H*.78],[W,H*.69]],d);
    line(ctx,W*.05,H*.02,W*.20,H*.18,5*S,"rgba(38,244,113,.75)");line(ctx,W*.95,H*.02,W*.80,H*.18,5*S,"rgba(38,244,113,.75)");line(ctx,W*.05,H*.98,W*.20,H*.84,4*S,"rgba(38,244,113,.55)");line(ctx,W*.95,H*.98,W*.80,H*.84,4*S,"rgba(38,244,113,.55)");
    ctx.save();ctx.globalAlpha=.085;ctx.fillStyle=green;ctx.font=`900 ${Math.round(330*S)}px Arial`;ctx.textAlign="center";ctx.fillText("$",W*.15,H*.43);ctx.fillText("↗",W*.85,H*.44);const by=H*.43;for(let i=0;i<6;i++){const bh=(75+i*42)*S;ctx.fillRect(W*.76+i*58*S,by-bh,28*S,bh);}ctx.restore();
    const mm=Math.round(Math.min(W,H)*.022);ctx.strokeStyle=gold;ctx.lineWidth=Math.max(5,8*S);rr(ctx,mm,mm,W-2*mm,H-2*mm,20*S);ctx.stroke();ctx.strokeStyle="rgba(255,255,255,.78)";ctx.lineWidth=Math.max(2,3*S);rr(ctx,mm+18*S,mm+18*S,W-2*mm-36*S,H-2*mm-36*S,15*S);ctx.stroke();ctx.strokeStyle="rgba(41,236,111,.55)";rr(ctx,mm+35*S,mm+35*S,W-2*mm-70*S,H-2*mm-70*S,12*S);ctx.stroke();
  }

  function draw(canvas,level,size){
    const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,S=Math.min(W/3000,H/4000),green="#24df70",gold="#d8a84f",bronze=level.name==="Bronze"?"#c8833f":level.color;
    drawBackground(ctx,W,H,S,green,gold);ctx.textAlign="center";ctx.textBaseline="alphabetic";
    drawCrown(ctx,W/2,H*.071,S,gold);ctx.fillStyle="#f0f4f1";ctx.font=`700 ${Math.round(50*S)}px Arial`;spaced(ctx,"CONQUISTA DESBLOQUEADA",W/2,H*.132,12*S);line(ctx,W*.16,H*.135,W*.30,H*.135,3*S,"rgba(216,168,79,.75)");line(ctx,W*.70,H*.135,W*.84,H*.135,3*S,"rgba(216,168,79,.75)");
    ctx.fillStyle="#fff";let ts=fit(ctx,"DASHBOARD DE LUCRO CPA",W*.80,118*S,68*S);ctx.font=`900 ${ts}px Arial`;ctx.shadowColor="rgba(255,255,255,.18)";ctx.shadowBlur=14*S;ctx.fillText("DASHBOARD DE LUCRO CPA",W/2,H*.205);ctx.shadowBlur=0;line(ctx,W*.24,H*.232,W*.76,H*.232,3*S,"rgba(39,229,108,.58)");
    const cy=H*.445;drawLaurel(ctx,W/2,cy+36*S,W*.29,H*.16,gold,S);
    const mg=ctx.createLinearGradient(0,H*.30,0,H*.54);mg.addColorStop(0,"#ffffff");mg.addColorStop(.28,"#dfffe9");mg.addColorStop(.56,"#45ef87");mg.addColorStop(.77,"#d9e1dc");mg.addColorStop(1,"#ffffff");ctx.fillStyle=mg;ctx.shadowColor="rgba(38,236,109,.60)";ctx.shadowBlur=58*S;let ms=fit(ctx,`R$ ${level.label}`,W*.78,520*S,330*S);ctx.font=`950 ${ms}px Arial`;ctx.fillText(`R$ ${level.label}`,W/2,H*.485);ctx.shadowBlur=0;line(ctx,W*.18,H*.505,W*.82,H*.505,6*S,"rgba(38,236,109,.62)");
    const bw=W*.44,bh=155*S,bx=W/2-bw/2,by=H*.545;const bg=ctx.createLinearGradient(bx,by,bx,by+bh);bg.addColorStop(0,"#4c2b17");bg.addColorStop(1,"#17100b");ctx.fillStyle=bg;ctx.strokeStyle=bronze;ctx.lineWidth=6*S;rr(ctx,bx,by,bw,bh,30*S);ctx.fill();ctx.stroke();ctx.fillStyle="#efbd86";ctx.font=`900 ${Math.round(64*S)}px Arial`;spaced(ctx,`NÍVEL ${level.name.toUpperCase()}`,W/2,by+bh*.67,10*S);line(ctx,W*.09,by+bh/2,bx-35*S,by+bh/2,4*S,bronze);line(ctx,bx+bw+35*S,by+bh/2,W*.91,by+bh/2,4*S,bronze);
    ctx.fillStyle="#fff";ctx.font=`800 ${Math.round(68*S)}px Arial`;spaced(ctx,"PARABÉNS POR ALCANÇAR ESTA META!",W/2,H*.675,5*S);
    drawLaurel(ctx,W/2,H*.77,150*S,125*S,gold,S);drawGrowth(ctx,W/2,H*.772,S,gold);
    ctx.fillStyle="#dce4df";ctx.font=`700 ${Math.round(46*S)}px Arial`;spaced(ctx,"CONSTÂNCIA • EVOLUÇÃO • RESULTADO",W/2,H*.842,7*S);
    drawBrand(ctx,W,H,S,gold,green);
    ctx.fillStyle="rgba(184,198,189,.68)";ctx.font=`500 ${Math.round(24*S)}px Arial`;ctx.fillText(`${size.label} • preparado para impressão`,W/2,H*.978);
  }

  function install(){
    try{
      if(typeof ACHIEVEMENT_LEVELS==="undefined")return false;
      if(typeof ACHIEVEMENT_SIZES!=="undefined"){Object.keys(ACHIEVEMENT_SIZES).forEach(k=>delete ACHIEVEMENT_SIZES[k]);Object.assign(ACHIEVEMENT_SIZES,SIZES);}
      window.downloadAchievement=(value)=>{
        const level=ACHIEVEMENT_LEVELS.find(x=>x.value===value);if(!level)return alert("Conquista não encontrada.");if(typeof totalAchievementProfit==="function"&&totalAchievementProfit()<level.value)return alert("Essa conquista ainda não foi desbloqueada.");
        const key=document.getElementById(`achSize${value}`)?.value||"30x40",size=SIZES[key]||SIZES["30x40"];const canvas=document.createElement("canvas");canvas.width=size.w;canvas.height=size.h;draw(canvas,level,size);const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`Equipe-Rico-${level.label}-${key}-300dpi-v4.png`;document.body.appendChild(a);a.click();a.remove();
      };
      if(typeof renderAchievements==="function"&&!document.getElementById("achievementsView")?.classList.contains("hidden"))renderAchievements();
      return true;
    }catch(e){console.error("Falha no gerador premium v4",e);return false;}
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},100);
})();
