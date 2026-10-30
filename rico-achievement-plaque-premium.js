(() => {
  "use strict";

  function rr(ctx,x,y,w,h,r){
    const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath();
  }
  function fit(ctx,text,max,start,min,weight=800){
    let s=start;while(s>min){ctx.font=`${weight} ${s}px Arial`;if(ctx.measureText(text).width<=max)break;s-=2;}return s;
  }
  function spaced(ctx,text,cx,y,gap){
    const chars=[...text], widths=chars.map(c=>ctx.measureText(c).width);const total=widths.reduce((a,b)=>a+b,0)+gap*Math.max(0,chars.length-1);let x=cx-total/2;
    chars.forEach((c,i)=>{ctx.fillText(c,x+widths[i]/2,y);x+=widths[i]+gap;});
  }
  function line(ctx,x1,y1,x2,y2,w,color){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function laurel(ctx,cx,cy,r,color,S){
    ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=5*S;
    for(const dir of [-1,1]){
      ctx.beginPath();ctx.arc(cx,cy,r,dir===-1?Math.PI*.65:Math.PI*.35,dir===-1?Math.PI*1.35:Math.PI*-.35,dir===-1);ctx.stroke();
      for(let i=0;i<7;i++){
        const t=.12+i*.11, a=dir===-1?Math.PI*(.67+.66*t):Math.PI*(.33-.66*t), px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r;
        ctx.save();ctx.translate(px,py);ctx.rotate(a+(dir===-1?-.45:.45));ctx.beginPath();ctx.ellipse(0,0,9*S,22*S,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    ctx.restore();
  }
  function growth(ctx,cx,cy,S,color){
    ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=8*S;ctx.lineCap="round";
    const bw=18*S,g=12*S,hs=[36,58,86].map(v=>v*S),sx=cx-(bw*3+g*2)/2;
    hs.forEach((h,i)=>ctx.fillRect(sx+i*(bw+g),cy+36*S-h,bw,h));
    ctx.beginPath();ctx.moveTo(cx-54*S,cy+4*S);ctx.lineTo(cx-10*S,cy-30*S);ctx.lineTo(cx+18*S,cy-13*S);ctx.lineTo(cx+63*S,cy-62*S);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+63*S,cy-62*S);ctx.lineTo(cx+42*S,cy-57*S);ctx.lineTo(cx+58*S,cy-39*S);ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawPremiumBackground(ctx,W,H,S,accent){
    const base=ctx.createLinearGradient(0,0,W,H);
    base.addColorStop(0,"#020605");base.addColorStop(.26,"#07140d");base.addColorStop(.55,"#03110a");base.addColorStop(.78,"#08130e");base.addColorStop(1,"#010302");
    ctx.fillStyle=base;ctx.fillRect(0,0,W,H);

    const center=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,W*.62);
    center.addColorStop(0,"rgba(39,185,101,.23)");center.addColorStop(.32,"rgba(20,105,59,.13)");center.addColorStop(.68,"rgba(3,30,16,.05)");center.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=center;ctx.fillRect(0,0,W,H);

    const topGlow=ctx.createRadialGradient(W*.5,H*.03,0,W*.5,H*.03,W*.48);
    topGlow.addColorStop(0,"rgba(117,255,174,.15)");topGlow.addColorStop(.4,"rgba(27,125,70,.06)");topGlow.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=topGlow;ctx.fillRect(0,0,W,H*.42);

    ctx.save();ctx.globalAlpha=.82;
    const p1=ctx.createLinearGradient(0,0,W*.42,H*.24);p1.addColorStop(0,"rgba(24,90,54,.86)");p1.addColorStop(.45,"rgba(9,45,28,.72)");p1.addColorStop(1,"rgba(3,13,8,0)");ctx.fillStyle=p1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.42,0);ctx.lineTo(W*.16,H*.23);ctx.lineTo(0,H*.31);ctx.closePath();ctx.fill();
    const p2=ctx.createLinearGradient(W,H,W*.6,H*.72);p2.addColorStop(0,"rgba(18,73,43,.82)");p2.addColorStop(.5,"rgba(7,37,22,.66)");p2.addColorStop(1,"rgba(2,10,6,0)");ctx.fillStyle=p2;
    ctx.beginPath();ctx.moveTo(W,H);ctx.lineTo(W*.59,H);ctx.lineTo(W*.85,H*.76);ctx.lineTo(W,H*.68);ctx.closePath();ctx.fill();ctx.restore();

    ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle="rgba(100,236,151,.26)";ctx.lineWidth=Math.max(1,2*S);
    const step=Math.max(110*S,W/24);
    for(let x=-H*.22;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+H*.22,H);ctx.stroke();}
    ctx.globalAlpha=.16;for(let y=H*.08;y<H;y+=step*.92){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-H*.04);ctx.stroke();}ctx.restore();

    ctx.save();ctx.globalAlpha=.32;ctx.fillStyle="rgba(255,255,255,.5)";
    const pts=[[.11,.19],[.83,.16],[.18,.34],[.73,.29],[.27,.73],[.81,.78],[.15,.88],[.62,.9],[.9,.54],[.38,.13],[.56,.62],[.45,.81]];
    pts.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(W*x,H*y,(i%3+1)*1.15*S,0,Math.PI*2);ctx.fill();});ctx.restore();

    const vignette=ctx.createRadialGradient(W*.5,H*.5,W*.28,W*.5,H*.5,W*.78);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.72,"rgba(0,0,0,.08)");vignette.addColorStop(1,"rgba(0,0,0,.62)");ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);

    ctx.save();ctx.globalAlpha=.7;
    line(ctx,W*.045,H*.15,W*.245,H*.015,Math.max(2,3*S),"rgba(65,222,124,.55)");
    line(ctx,W*.955,H*.85,W*.755,H*.985,Math.max(2,3*S),"rgba(65,222,124,.55)");
    line(ctx,W*.12,H*.04,W*.37,H*.04,Math.max(2,2*S),"rgba(255,255,255,.14)");
    line(ctx,W*.63,H*.96,W*.88,H*.96,Math.max(2,2*S),"rgba(255,255,255,.14)");ctx.restore();
  }

  function render(canvas,level,size){
    const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height,S=Math.min(W/3000,H/4000),bronze=level.name==="Bronze"?"#c98345":level.color;
    drawPremiumBackground(ctx,W,H,S,level.color);

    const m=Math.round(Math.min(W,H)*.033);
    const border=ctx.createLinearGradient(m,m,W-m,H-m);border.addColorStop(0,"rgba(232,238,234,.95)");border.addColorStop(.35,"rgba(102,128,111,.8)");border.addColorStop(.65,"rgba(225,233,228,.92)");border.addColorStop(1,"rgba(79,102,87,.82)");
    ctx.strokeStyle=border;ctx.lineWidth=Math.max(4,7*S);rr(ctx,m,m,W-2*m,H-2*m,30*S);ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=Math.max(2,2*S);rr(ctx,m+26*S,m+26*S,W-2*m-52*S,H-2*m-52*S,24*S);ctx.stroke();

    ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.fillStyle="#e8eeea";ctx.font=`700 ${Math.round(48*S)}px Arial`;spaced(ctx,"CONQUISTA DESBLOQUEADA",W/2,H*.112,11*S);
    line(ctx,W*.12,H*.117,W*.28,H*.117,3*S,"rgba(225,231,227,.58)");line(ctx,W*.72,H*.117,W*.88,H*.117,3*S,"rgba(225,231,227,.58)");

    ctx.fillStyle="#fff";let title=fit(ctx,"DASHBOARD DE LUCRO CPA",W*.82,112*S,66*S,900);ctx.font=`900 ${title}px Arial`;ctx.fillText("DASHBOARD DE LUCRO CPA",W/2,H*.204);
    ctx.fillStyle="#c8d2cb";ctx.font=`600 ${Math.round(64*S)}px Arial`;spaced(ctx,"EQUIPE RICO",W/2,H*.252,15*S);

    const halo=ctx.createRadialGradient(W*.5,H*.415,0,W*.5,H*.415,W*.38);halo.addColorStop(0,"rgba(65,235,130,.20)");halo.addColorStop(.45,"rgba(22,123,67,.07)");halo.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=halo;ctx.fillRect(W*.1,H*.27,W*.8,H*.34);

    const metal=ctx.createLinearGradient(0,H*.31,0,H*.49);metal.addColorStop(0,"#ffffff");metal.addColorStop(.23,"#dce1de");metal.addColorStop(.5,"#969f99");metal.addColorStop(.72,"#edf1ef");metal.addColorStop(1,"#b5bdb8");
    ctx.shadowColor="rgba(54,235,122,.55)";ctx.shadowBlur=48*S;ctx.fillStyle=metal;let money=fit(ctx,`R$ ${level.label}`,W*.83,445*S,250*S,950);ctx.font=`950 ${money}px Arial`;ctx.fillText(`R$ ${level.label}`,W/2,H*.47);ctx.shadowBlur=0;
    line(ctx,W*.19,H*.49,W*.81,H*.49,5*S,"rgba(61,235,124,.55)");

    const bw=W*.43,bh=150*S,bx=W/2-bw/2,by=H*.525;
    const badge=ctx.createLinearGradient(bx,by,bx+bw,by+bh);badge.addColorStop(0,"rgba(34,18,11,.96)");badge.addColorStop(.48,"rgba(71,34,17,.88)");badge.addColorStop(1,"rgba(23,14,10,.96)");ctx.fillStyle=badge;ctx.strokeStyle=bronze;ctx.lineWidth=5*S;rr(ctx,bx,by,bw,bh,28*S);ctx.fill();ctx.stroke();
    ctx.fillStyle="#e7b47c";ctx.font=`800 ${Math.round(62*S)}px Arial`;spaced(ctx,`NÍVEL ${level.name.toUpperCase()}`,W/2,by+bh*.67,10*S);line(ctx,W*.1,by+bh/2,bx-40*S,by+bh/2,4*S,bronze);line(ctx,bx+bw+40*S,by+bh/2,W*.9,by+bh/2,4*S,bronze);

    ctx.fillStyle="#f4f6f5";const cs=fit(ctx,"PARABÉNS POR ALCANÇAR ESTA META!",W*.83,66*S,42*S,700);ctx.font=`700 ${cs}px Arial`;spaced(ctx,"PARABÉNS POR ALCANÇAR ESTA META!",W/2,H*.665,5*S);
    laurel(ctx,W/2,H*.765,135*S,bronze,S);growth(ctx,W/2,H*.765+28*S,S,bronze);
    ctx.fillStyle="#d5ddd8";ctx.font=`700 ${Math.round(44*S)}px Arial`;spaced(ctx,"CONSTÂNCIA • EVOLUÇÃO • RESULTADO",W/2,H*.875,7*S);
    ctx.fillStyle="rgba(205,215,209,.74)";ctx.font=`500 ${Math.round(32*S)}px Arial`;ctx.fillText("DASHBOARD DE LUCRO CPA — EQUIPE RICO",W/2,H*.925);
    ctx.fillStyle="rgba(143,166,152,.68)";ctx.font=`500 ${Math.round(24*S)}px Arial`;ctx.fillText(`${size.label} • preparado para impressão`,W/2,H*.954);
  }

  function install(){
    if(typeof ACHIEVEMENT_LEVELS==="undefined"||typeof ACHIEVEMENT_SIZES==="undefined")return false;
    window.downloadAchievement=(value)=>{
      const level=ACHIEVEMENT_LEVELS.find(x=>x.value===value);
      if(!level||(typeof totalAchievementProfit==="function"&&totalAchievementProfit()<level.value)){alert("Essa conquista ainda não foi desbloqueada.");return;}
      const key=document.getElementById(`achSize${value}`)?.value||"30x40";const size=ACHIEVEMENT_SIZES[key]||ACHIEVEMENT_SIZES["30x40"];
      const canvas=document.createElement("canvas");canvas.width=size.w;canvas.height=size.h;render(canvas,level,size);
      const a=document.createElement("a");a.href=canvas.toDataURL("image/png",1);a.download=`Equipe-Rico-${level.label}-${key}-300dpi.png`;document.body.appendChild(a);a.click();a.remove();
    };
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},120);
})();
