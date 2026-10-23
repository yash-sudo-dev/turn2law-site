/* ============================================================
   Turn2Law — ambient dot grid
   A minimalist grid of fine dots across the background. The
   grid breathes with a slow travelling shimmer; around the
   cursor a soft lens brightens dots to gold, swells them and
   nudges them aside. Fast cursor movement and clicks send very
   light expanding rings. Pure canvas, no dependencies, and it
   renders nothing for users who prefer reduced motion.
   ============================================================ */
(function(){
  'use strict';
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  var canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block';
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');

  /* theme: light pages get ink-gray dots that warm to gold;
     dark pages get white dots that warm to bright gold */
  var bgc=(getComputedStyle(document.body).backgroundColor||'').match(/[\d.]+/g);
  var dark=true;
  if(bgc&&bgc.length>=3){
    var lum=(0.2126*+bgc[0]+0.7152*+bgc[1]+0.0722*+bgc[2])/255;
    dark=lum<0.45;
  }
  var BR=dark?255:17,BG=dark?255:17,BB=dark?255:17;      /* resting dot */
  var GR=dark?235:196,GG=dark?203:154,GB=dark?138:74;    /* lit dot (gold) */
  var BASE_A=dark?0.10:0.075;   /* resting alpha — very light */
  var MAX_A=dark?0.55:0.50;     /* fully lit near cursor */

  var DPR=Math.min(window.devicePixelRatio||1,1.5);
  var W=0,H=0,dots=[];
  var SP=26,R=190;              /* grid spacing, cursor lens radius */
  var ptr={x:-9999,y:-9999,tx:-9999,ty:-9999,px:-9999,py:-9999};
  var ripples=[],sparkles=[],lastRip=0;

  function build(){
    dots=[];
    var cols=Math.ceil(W/SP)+1,rows=Math.ceil(H/SP)+1;
    for(var yy=0;yy<rows;yy++)for(var xx=0;xx<cols;xx++)dots.push({ox:xx*SP,oy:yy*SP});
  }
  function size(){
    W=innerWidth;H=innerHeight;
    canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    build();
  }
  size();
  var rsz;addEventListener('resize',function(){clearTimeout(rsz);rsz=setTimeout(size,180);},{passive:true});

  addEventListener('pointermove',function(e){ptr.tx=e.clientX;ptr.ty=e.clientY;},{passive:true});
  addEventListener('pointerdown',function(e){ripples.push({x:e.clientX,y:e.clientY,t:performance.now(),s:0.32});},{passive:true});
  addEventListener('blur',function(){ptr.tx=ptr.x=ptr.px=-9999;ptr.ty=ptr.y=ptr.py=-9999;});

  function frame(now){
    var t=now*0.001;
    ctx.clearRect(0,0,W,H);

    /* cursor lens glides behind the real pointer */
    ptr.x+=(ptr.tx-ptr.x)*0.16;
    ptr.y+=(ptr.ty-ptr.y)*0.16;
    var hasP=ptr.tx>-9000;
    var moved=hasP?Math.hypot(ptr.x-ptr.px,ptr.y-ptr.py):0;
    ptr.px=ptr.x;ptr.py=ptr.y;

    /* a swift sweep leaves a whisper of a ring */
    if(hasP&&moved>34&&now-lastRip>320){
      ripples.push({x:ptr.x,y:ptr.y,t:now,s:0.10});
      lastRip=now;
    }
    for(var k=ripples.length-1;k>=0;k--)if(now-ripples[k].t>1100)ripples.splice(k,1);

    /* occasional single-dot bloom keeps the grid alive at rest */
    if(sparkles.length<2&&Math.random()<0.01&&dots.length)
      sparkles.push({i:(Math.random()*dots.length)|0,t:now});
    for(var w=sparkles.length-1;w>=0;w--)if(now-sparkles[w].t>1500)sparkles.splice(w,1);

    var maxDim=Math.max(W,H);
    for(var n=0;n<dots.length;n++){
      var ox=dots[n].ox,oy=dots[n].oy;

      /* slow travelling shimmer */
      var wave=0.5+0.5*Math.sin((ox+oy)*0.011+t*1.1+ox*0.003);
      var a=BASE_A*(0.7+0.5*wave);
      var r=1.05,inf=0,px=ox,py=oy;

      if(hasP){
        var dx=ox-ptr.x,dy=oy-ptr.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<R){
          var f=1-dist/R;f*=f;
          inf=f;
          r+=f*1.9;
          a+=f*(MAX_A-a);
          if(dist>0.001){px=ox+dx/dist*f*7;py=oy+dy/dist*f*7;}  /* gentle bend away */
        }
      }
      for(var q=0;q<ripples.length;q++){
        var rp=ripples[q],age=(now-rp.t)/1100;
        if(age>=1)continue;
        var rr=age*maxDim*0.45;
        var ddx=ox-rp.x,ddy=oy-rp.y,dd=Math.sqrt(ddx*ddx+ddy*ddy);
        var band=Math.exp(-Math.pow((dd-rr)/30,2))*(1-age)*rp.s;
        if(band>0.01){a+=band;r+=band*2.5;if(band*2>inf)inf=band*2;}
      }
      for(w=0;w<sparkles.length;w++){
        if(sparkles[w].i===n){
          var p2=(now-sparkles[w].t)/1500,env=Math.sin(Math.PI*p2);
          a+=env*0.4;r+=env*2.0;if(env>inf)inf=env;
        }
      }

      if(a>0.008){
        var m=inf>1?1:inf;
        var cr=(BR+(GR-BR)*m)|0,cg=(BG+(GG-BG)*m)|0,cb=(BB+(GB-BB)*m)|0;
        ctx.globalAlpha=a>0.85?0.85:a;
        ctx.fillStyle='rgb('+cr+','+cg+','+cb+')';
        ctx.beginPath();ctx.arc(px,py,r,0,6.2832);ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
