/* base.js  ·  Global chrome (nav, progress, mobile menu, reveal-on-scroll,
   magnetic tilt, FAQ, contact form) + Home page behaviour. */
(function(){
  'use strict';
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  /* ---- Scroll progress + nav ---- */
  var nav=$('#nav'),progress=$('#progress'),totop=$('#totop');
  function onScroll(){
    var st=window.pageYOffset||document.documentElement.scrollTop;
    var h=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.transform='scaleX('+(h>0?st/h:0)+')';
    nav.classList.toggle('scrolled',st>20);
    totop.classList.toggle('show',st>800);
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  totop.addEventListener('click',function(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
  /* ---- Mobile menu ---- */
  var burger=$('#burger'),mobileMenu=$('#mobileMenu');
  function menuIsOpen(){return document.body.classList.contains('menu-open');}
  function openMenu(){
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded','true');
    var first=mobileMenu.querySelector('a,button');
    if(first)first.focus();
  }
  function closeMenu(returnFocus){
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded','false');
    if(returnFocus)burger.focus();
  }
  burger.addEventListener('click',function(){menuIsOpen()?closeMenu(true):openMenu();});
  $$('#mobileMenu a').forEach(function(a){a.addEventListener('click',function(){closeMenu(false);});});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!menuIsOpen())return;
    closeMenu(true);
  });
  /* keep focus within the open mobile menu */
  mobileMenu.addEventListener('keydown',function(e){
    if(e.key!=='Tab'||!menuIsOpen())return;
    var f=$$('a,button',mobileMenu);if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  /* ---- Reveal on scroll ---- */
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  function observeReveals(){$$('.reveal:not(.in)').forEach(function(el){io.observe(el);});}
  /* ---- Magnetic tilt (cards site-wide) ---- */
  var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion){
    $$('.ttile, .pcard, .bcell, .fork').forEach(function(card){
      card.addEventListener('mousemove',function(e){
        var r=card.getBoundingClientRect();
        var px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
        card.style.transform='translateY(-6px) rotateX('+(py*-4)+'deg) rotateY('+(px*4)+'deg)';
      });
      card.addEventListener('mouseleave',function(){card.style.transform='';});
    });
  }
  /* ---- FAQ (premium) ---- */
  $$('.faq-card[data-faq]').forEach(function(card){
    var btn=card.querySelector('.faq-q2'),panel=card.querySelector('.faq-panel2');
    if(card.classList.contains('open')){panel.style.maxHeight=panel.scrollHeight+'px';}
    btn.addEventListener('click',function(){
      var open=card.classList.contains('open');
      $$('.faq-card[data-faq].open').forEach(function(o){
        o.classList.remove('open');
        o.querySelector('.faq-q2').setAttribute('aria-expanded','false');
        o.querySelector('.faq-panel2').style.maxHeight=null;
      });
      if(!open){
        card.classList.add('open');
        btn.setAttribute('aria-expanded','true');
        panel.style.maxHeight=panel.scrollHeight+'px';
      }
    });
  });
  window.addEventListener('resize',function(){
    var openPanel=document.querySelector('.faq-card.open .faq-panel2');
    if(openPanel)openPanel.style.maxHeight=openPanel.scrollHeight+'px';
  });
  /* ---- Contact form ---- */
  var form=$('#contactForm');
  function setErr(id,msg){
    var el=$('#'+id),e=$('#'+id+'Err');
    if(msg){if(el)el.setAttribute('aria-invalid','true');if(e){e.textContent=msg;e.classList.add('show');}}
    else{if(el)el.removeAttribute('aria-invalid');if(e){e.textContent='';e.classList.remove('show');}}
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var fn=$('#fn').value.trim(),em=$('#em').value.trim(),msg=$('#msg').value.trim(),consent=$('#consent').checked;
    var okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
    var firstBad=null;
    setErr('fn',fn?'':'Please enter your first name.');if(!fn)firstBad=firstBad||'fn';
    setErr('em',em?(okEmail?'':'Enter a valid email address.'):'Please enter your email.');if(!em||!okEmail)firstBad=firstBad||'em';
    setErr('msg',msg?'':'Please tell us what you need help with.');if(!msg)firstBad=firstBad||'msg';
    setErr('consent',consent?'':'Please accept the Privacy Policy to continue.');if(!consent)firstBad=firstBad||'consent';
    if(firstBad){var f=$('#'+firstBad);if(f)f.focus();return;}
    var btn=form.querySelector('.send'),orig=btn.innerHTML;
    btn.disabled=true;btn.textContent='Sending…';
    setTimeout(function(){
      btn.style.display='none';btn.disabled=false;btn.innerHTML=orig;
      $('#formOk').style.display='flex';
      form.reset();
    },700);
  });
  $$('#contactForm input,#contactForm textarea').forEach(function(el){
    var ev=el.type==='checkbox'?'change':'input';
    el.addEventListener(ev,function(){setErr(el.id,'');});
  });
  /* ---- Hero N glow subtle parallax ---- */
  var heroGlow=$('.hero .nglow');
  if(heroGlow&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    window.addEventListener('scroll',function(){
      var y=window.pageYOffset;
      if(y<900)heroGlow.style.transform='translateY('+(y*0.12)+'px)';
    },{passive:true});
  }
  /* ---- Hero search + suggestion chips ---- */
  observeReveals();
})();
