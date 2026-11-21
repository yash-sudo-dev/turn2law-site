/* pages.js  ·  Per-section behaviour. Each block is an isolated IIFE
   scoped to its #page-* root so ids/selectors never cross sections. */

/* ===================== LEGAL SERVICES ===================== */
(function(){'use strict';
  var root=document.getElementById('page-legal-services');
  if(!root)return;
  var $=function(s,c){return (c||root).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s))};
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  $$('.reveal:not(.in)').forEach(function(el){io.observe(el);});
  $$('.faq-item').forEach(function(item){var btn=item.querySelector('.faq-q'),panel=item.querySelector('.faq-panel');btn.addEventListener('click',function(){var open=item.classList.contains('open');$$('.faq-item.open').forEach(function(o){o.classList.remove('open');o.querySelector('.faq-panel').style.maxHeight=null;});if(!open){item.classList.add('open');panel.style.maxHeight=panel.scrollHeight+'px';}});});
})();

/* ===================== LEGAL SERVICES · service detail modal ===================== */
(function(){'use strict';
  var root=document.getElementById('page-legal-services');
  if(!root)return;
  var ICONS={
    building:'<path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15"></path><path d="M12 21V10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v11"></path><path d="M2 21h20"></path><path d="M7 8h1M7 12h1M7 16h1M16 12h1M16 16h1"></path>',
    award:'<circle cx="12" cy="8" r="6"></circle><path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.1"></path>',
    clipboard:'<path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="m9 14 2 2 4-4"></path>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path>',
    trending:'<path d="M23 6 13.5 15.5l-5-5L1 18"></path><path d="M17 6h6v6"></path>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    dispute:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'
  };

  var SERVICES=[
    {code:'01 · Incorporation',name:'Company incorporation',icon:'building',tags:['PVT LTD','OPC','LLP','SECTION 8'],
      desc:'Private Limited, OPC, LLP, Section 8, and conversions, with the whole process visible before you pay. Pricing below is exactly what you see at checkout, entity by entity.',
      entities:[
        {name:'Private Limited',tiers:[
          {name:'Basic',price:'₹14,999',billing:'one-time',features:['DSC for 2 directors','DIN for 2 directors','Name approval (RUN)','MOA &amp; AOA drafting','Incorporation certificate','Company PAN &amp; TAN']},
          {name:'Standard',price:'₹19,999',billing:'one-time',rec:true,features:['Everything in Basic','Current bank account','GST registration','Commencement certificate','Share certificates','Priority support']},
          {name:'Premium',price:'₹29,999',billing:'one-time',features:['Everything in Standard','MSME / Udyam registration','Trademark registration','ESI &amp; PF registration','Professional tax','Dedicated account manager']}
        ]},
        {name:'OPC',tiers:[
          {name:'Basic',price:'₹12,999',billing:'one-time',features:['DSC for director','DIN for director','Name approval','MOA &amp; AOA','Incorporation certificate','PAN &amp; TAN']},
          {name:'Standard',price:'₹17,999',billing:'one-time',rec:true,features:['Everything in Basic','Bank account','GST registration','Share certificate','Priority support']},
          {name:'Premium',price:'₹24,999',billing:'one-time',features:['Everything in Standard','MSME registration','Trademark filing','Tax consultation','Account manager']}
        ]},
        {name:'LLP',tiers:[
          {name:'Basic',price:'₹11,999',billing:'one-time',features:['DSC for 2 partners','DIN for designated partners','Name approval','LLP agreement drafting','LLP registration','PAN &amp; TAN']},
          {name:'Standard',price:'₹16,999',billing:'one-time',rec:true,features:['Everything in Basic','Bank account assistance','GST registration','Certificate of incorporation','Priority support']},
          {name:'Premium',price:'₹23,999',billing:'one-time',features:['Everything in Standard','MSME registration','Trademark filing','Legal consultation','Dedicated manager']}
        ]},
        {name:'Section 8',tiers:[
          {name:'Basic',price:'₹16,999',billing:'one-time',features:['DSC for 2 directors','DIN for 2 directors','Name approval','MOA &amp; AOA (non-profit clauses)','Section 8 licence &amp; incorporation','PAN &amp; TAN']},
          {name:'Standard',price:'₹22,999',billing:'one-time',rec:true,features:['Everything in Basic','12A &amp; 80G groundwork','Bank account','Priority support']},
          {name:'Premium',price:'₹32,999',billing:'one-time',features:['Everything in Standard','FCRA readiness review','Dedicated account manager','Annual compliance briefing']}
        ]}
      ],
      steps:[['01','Obtain digital signatures and Director Identification Numbers for all directors or partners.'],['02','Reserve your entity name through the RUN / name-approval service.'],['03','File the incorporation form with drafted MOA / AOA or partnership agreement.'],['04','The registrar verifies documents; any query is relayed to you in plain language.'],['05','Receive your incorporation certificate, PAN, and TAN.'],['06','Open a current account and your compliance calendar switches on.']],
      note:'No minimum capital required. Private Limited needs at least 2 directors (max 15); OPC needs 1; LLPs and Partnerships need at least 2 partners.'},
    {code:'02 · Trademark & IP',name:'Trademark and IP',icon:'award',tags:['SEARCH','FILING','OPPOSITION','COPYRIGHT'],
      desc:'Search, filing, opposition, renewal, copyright, and patent assistance, handled by the bench. Government fees are billed at actuals on top of the professional fee below.',
      tiers:[
        {name:'Search &amp; file',price:'₹4,999',billing:'+ govt fee',features:['Comprehensive trademark search','Filing in one class','Applicant-type fee guidance','Application tracking']},
        {name:'Filing &amp; defence',price:'₹9,999',billing:'+ govt fee',rec:true,features:['Everything in Search &amp; file','Examination report response','Opposition reply drafting','Hearing brief preparation']},
        {name:'Full IP cover',price:'₹18,999',billing:'+ govt fee',features:['Everything in Filing &amp; defence','Copyright registration (1 work)','Renewal reminders for 10 years','Dedicated IP counsel']}
      ],
      steps:[['01','A comprehensive search across classes to flag conflicting marks before you file.'],['02','Filing with the Trademark Registry under the correct class and applicant type.'],['03','Examination report, if raised, is answered by the bench within the statutory window.'],['04','Opposition, if filed by a third party, is defended with a counter-statement and evidence.'],['05','Registration certificate issues; renewal reminders are set for year nine.']],
      note:'Government e-filing fee is ₹4,500 per class for individuals, startups, and MSMEs, and ₹9,000 per class for other applicants, billed at actuals.'},
    {code:'03 · Registrations',name:'Business registrations',icon:'clipboard',tags:['GST','MSME','IEC','FSSAI','SHOPS'],
      desc:'The registrations a running business collects, done once and done right. Pricing is per registration; ask about bundle discounts when ordered together.',
      entities:[
        {name:'GST',tiers:[
          {name:'Basic',price:'₹2,999',billing:'one-time',features:['GST registration filing','GSTIN certificate','Filing assistance','Expert guidance','Email support']},
          {name:'Standard',price:'₹4,999',billing:'one-time',rec:true,features:['Everything in Basic','Return filing (3 months)','Invoice generation tool','Priority support','Compliance calendar']},
          {name:'Premium',price:'₹9,999',billing:'one-time',features:['Everything in Standard','Annual return filing','Tax planning session','Dedicated CA','Audit support']}
        ]},
        {name:'IEC',tiers:[
          {name:'Basic',price:'₹2,999',billing:'one-time',features:['IEC number registration','Document preparation','Application filing','Certificate delivery']},
          {name:'Standard',price:'₹4,999',billing:'one-time',rec:true,features:['Everything in Basic','Priority processing','PAN–IEC linking','Compliance checklist','Dedicated support']},
          {name:'Premium',price:'₹7,999',billing:'one-time',features:['Everything in Standard','Post-registration guidance','Export compliance training','Legal consultation (2 sessions)','Dedicated account manager']}
        ]},
        {name:'MSME / Udyam',tiers:[
          {name:'Assisted filing',price:'₹1,499',billing:'one-time',rec:true,features:['Udyam registration filing','Certificate delivery','Investment &amp; turnover classification check','Email support']}
        ]},
        {name:'FSSAI',tiers:[
          {name:'Basic registration',price:'₹2,999',billing:'+ govt fee',rec:true,features:['Eligibility check (basic / state / central)','Application filing','Document preparation','Certificate delivery']}
        ]},
        {name:'Shops &amp; Establishment',tiers:[
          {name:'Assisted filing',price:'₹1,999',billing:'+ govt fee',rec:true,features:['State-specific application filing','Document preparation','Certificate delivery']}
        ]}
      ],
      steps:[['01','Tell us which registrations your business needs; we confirm documents and fees upfront.'],['02','Our team prepares and files each application with the relevant authority.'],['03','Queries from the department, if any, are handled and relayed to you.'],['04','Certificates land in your locker as each registration is approved.']]},
    {code:'04 · ROC compliance',name:'ROC and annual compliance',icon:'calendar',tags:['AOC-4','MGT-7','DIR-3 KYC','REGISTERS'],
      desc:'Annual filings, resolutions, registers, and AGM paperwork on a calendar that cannot miss a date.',
      tiers:[
        {name:'Annual compliance',price:'₹18,000',billing:'/ year',rec:true,features:['AOC-4 and MGT-7 annual filings','DIR-3 KYC for all directors','Statutory registers maintained','Board &amp; AGM minutes drafted','Compliance calendar with WhatsApp reminders']}
      ],
      steps:[['01','Your compliance calendar switches on the moment incorporation completes.'],['02','Reminders land on email and WhatsApp before every statutory deadline.'],['03','Filings are prepared, shared for your sign-off, and filed with the ROC.'],['04','Registers and minutes are kept current and stored in your locker.']],
      note:'Covers one financial year for a single company with standard filings. Event-based filings (share transfers, charge creation, director changes) are quoted separately.'},
    {code:'05 · Fundraising',name:'Fundraising advisory',icon:'trending',tags:['ESOP','CAP TABLE','TERM SHEET','FEMA'],
      desc:'ESOP schemes, cap tables, term sheets, and FEMA / RBI paperwork for your round, priced by deliverable so you know the cost before you commit.',
      tiers:[
        {name:'Term sheet review',price:'₹14,999',billing:'fixed fee',features:['Clause-by-clause review','Investor-friendliness flags','One round of negotiation notes','Turnaround in 3 business days']},
        {name:'ESOP scheme',price:'₹24,999',billing:'fixed fee',rec:true,features:["ESOP pool structuring",'Scheme drafting and board resolutions','Cap table modelling','Grant letter templates']},
        {name:'Full round support',price:'Custom quote',billing:'engagement',features:["Shareholders' agreement drafting",'FEMA / RBI filings (FC-GPR)','Cap table and waterfall modelling','Closing checklist management']}
      ],
      steps:[['01','Share your term sheet or round structure; we scope the exact deliverables.'],['02','Drafting and structuring work runs on a fixed-fee, fixed-timeline basis.'],['03','FEMA / RBI filings are prepared and tracked to closing.'],['04','Signed documents and filings land in your locker.']]},
    {code:'06 · Employment & HR',name:'Employment and HR legal',icon:'users',tags:['CONTRACTS','POSH','PF / ESI','POLICIES'],
      desc:'Contracts, POSH compliance, PF and ESI, and policy manuals as you hire, so growth never outruns your paperwork.',
      tiers:[
        {name:'Contract pack',price:'₹2,999',billing:'per template',features:['Employment agreement, role-specific','Offer letter and NDA','Plain-language explainer per clause']},
        {name:'POSH compliance',price:'₹9,999',billing:'one-time',rec:true,features:['POSH policy drafting','Internal Committee (IC) constitution','Employee awareness deck','Annual report template']},
        {name:'Full HR legal pack',price:'₹19,999',billing:'one-time',features:['Everything in Contract pack and POSH','PF &amp; ESI registration guidance','Employee handbook and policy manuals','Priority support']}
      ],
      steps:[['01','Tell us your headcount and hiring plan; we recommend the right pack.'],['02','Contracts and policies are drafted from India-specific, versioned templates.'],['03','POSH committee setup and registrations are handled end to end.'],['04','Everything is stored in your locker, ready to send on day one.']]},
    {code:'07 · Disputes',name:'Disputes and recovery',icon:'dispute',tags:['NOTICES','RECOVERY','MEDIATION'],
      desc:'Legal notices, payment recovery, and mediation support, informational and clear.',
      tiers:[
        {name:'Legal notice',price:'₹2,999',billing:'per notice',features:['Drafted by the bench','Sent via registered post and email','One round of revisions']},
        {name:'Payment recovery',price:'₹4,999',billing:'starting',rec:true,features:['Demand notice drafting and dispatch','Structured follow-up cadence','Settlement negotiation support']},
        {name:'Mediation support',price:'Custom quote',billing:'engagement',features:['Mediation-readiness review','Documentation and evidence organisation','Referral to empanelled mediators']}
      ],
      steps:[['01','Describe the dispute; we confirm scope, documents needed, and cost.'],['02','Notices are drafted, reviewed with you, and dispatched.'],['03','Follow-up and negotiation are tracked with visible status.'],['04','For matters needing representation, we refer you to empanelled counsel.']],
      note:'Turn2Law is a technology platform, not a law firm, and does not provide courtroom representation.'},
    {code:'08 · Virtual GC',name:'Virtual general counsel',icon:'shield',tags:['RETAINER','PRIORITY SLA','MONTHLY'],
      desc:'A monthly retainer: your request queue, priority SLAs, one bench behind it, for teams that need ongoing legal support without a full-time hire.',
      tiers:[
        {name:'Starter',price:'₹14,999',billing:'/ month',features:['Up to 5 requests / month','48-hour turnaround SLA','Contract review and redlines','Email support']},
        {name:'Growth',price:'₹29,999',billing:'/ month',rec:true,features:['Up to 12 requests / month','24-hour turnaround SLA','Contract review, policy drafting, notices','Priority support channel']},
        {name:'Scale',price:'₹49,999',billing:'/ month',features:['Unlimited standard requests','Same-day turnaround SLA','Named lead counsel','Quarterly legal health review']}
      ],
      steps:[['01','Pick a tier based on your monthly request volume.'],['02','Requests are logged in a shared queue with visible status and owners.'],['03','The bench works to your SLA; escalations are flagged, not buried in email.'],['04','A quarterly review keeps the retainer scoped to what you actually need.']]}
  ];

  var $=function(s,c){return (c||root).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s))};
  var overlay=$('#svcOverlay'),content=$('#svcContent');

  function tierHTML(t){
    return '<div class="svc-tier'+(t.rec?' rec':'')+'">'+(t.rec?'<div class="stg">Recommended</div>':'')+'<div class="stn">'+t.name+'</div><div class="stp">'+t.price+'<small>'+t.billing+'</small></div><ul>'+t.features.map(function(f){return '<li>'+f+'</li>';}).join('')+'</ul></div>';
  }
  function renderTiers(tiers){return '<div class="svc-tiers">'+tiers.map(tierHTML).join('')+'</div>';}

  function render(svc,entityIdx){
    entityIdx=entityIdx||0;
    var tags=svc.tags.map(function(t){return '<span class="chip"><i></i>'+t+'</span>';}).join('');
    var tiersBlock;
    if(svc.entities){
      var tabs=svc.entities.map(function(e,i){return '<button class="svc-tab'+(i===entityIdx?' on':'')+'" data-e="'+i+'" type="button">'+e.name+'</button>';}).join('');
      tiersBlock='<div class="svc-sub">Pricing</div><div class="svc-tabs">'+tabs+'</div>'+renderTiers(svc.entities[entityIdx].tiers);
    }else{
      tiersBlock='<div class="svc-sub">Pricing</div>'+renderTiers(svc.tiers);
    }
    var noteBlock=svc.note?'<div class="svc-note">'+svc.note+'</div>':'';
    var stepsBlock=svc.steps?'<div class="svc-sub">How it works</div><div class="svc-steps">'+svc.steps.map(function(s){return '<div class="svc-step"><b>'+s[0]+'</b><div>'+s[1]+'</div></div>';}).join('')+'</div>':'';
    content.innerHTML=
      '<div class="svc-head"><div class="nglow"><svg><use href="#nmark"></use></svg></div><div class="svc-ico"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'+ICONS[svc.icon]+'</svg></div><div class="svc-code">'+svc.code+'</div><div class="svc-title">'+svc.name+'</div><div class="svc-tags">'+tags+'</div></div>'+
      '<div class="svc-body"><p class="svc-desc">'+svc.desc+'</p>'+tiersBlock+noteBlock+stepsBlock+
      '<div class="svc-foot"><a href="#page-signup" class="btn btn-gold">Get started<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></a><a href="#contact" class="btn btn-ghost">Talk to us</a></div></div>';
    if(svc.entities){
      $$('.svc-tab',content).forEach(function(btn){
        btn.addEventListener('click',function(){render(svc,parseInt(btn.getAttribute('data-e'),10));});
      });
    }
    content.parentNode.scrollTop=0;
  }

  function openSvc(idx){
    render(SERVICES[idx],0);
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeSvc(){
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeSvc();});
  $('#svcClose').addEventListener('click',closeSvc);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSvc();});
  $$('.cat[data-svc]').forEach(function(card){
    card.addEventListener('click',function(){openSvc(parseInt(card.getAttribute('data-svc'),10));});
    card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openSvc(parseInt(card.getAttribute('data-svc'),10));}});
  });
})();

/* ===================== DOC ENGINE ===================== */
(function(){'use strict';
  var root=document.getElementById('page-docengine');
  if(!root)return;
  var $=function(s,c){return (c||root).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s))};
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  $$('.reveal:not(.in)').forEach(function(el){io.observe(el);});
  $$('.faq-item').forEach(function(item){var btn=item.querySelector('.faq-q'),panel=item.querySelector('.faq-panel');btn.addEventListener('click',function(){var open=item.classList.contains('open');$$('.faq-item.open').forEach(function(o){o.classList.remove('open');o.querySelector('.faq-panel').style.maxHeight=null;});if(!open){item.classList.add('open');panel.style.maxHeight=panel.scrollHeight+'px';}});});
  /* ---- Hero prompt composer ---- */
  var deForm=$('.dec-form'),dePrompt=$('#dePrompt');
  if(dePrompt){
    var grow=function(){dePrompt.style.height='auto';dePrompt.style.height=Math.min(dePrompt.scrollHeight,172)+'px';};
    dePrompt.addEventListener('input',grow);
    dePrompt.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(dePrompt.value.trim())deForm.submit();}
    });
    $$('.dec-chip').forEach(function(c){c.addEventListener('click',function(){dePrompt.value=c.getAttribute('data-p');grow();dePrompt.focus();});});
  }
})();

/* ===================== INTROSPECTOR ===================== */
(function(){'use strict';
  var root=document.getElementById('page-introspector');
  if(!root)return;
  var $=function(s,c){return (c||root).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s))};
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* reveal */
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  $$('.reveal:not(.in)').forEach(function(el){io.observe(el);});

  /* faq */
  $$('.faq-item').forEach(function(item){var btn=item.querySelector('.faq-q'),panel=item.querySelector('.faq-panel');btn.addEventListener('click',function(){var open=item.classList.contains('open');$$('.faq-item.open').forEach(function(o){o.classList.remove('open');o.querySelector('.faq-panel').style.maxHeight=null;});if(!open){item.classList.add('open');panel.style.maxHeight=panel.scrollHeight+'px';}});});

  /* hero typing + answer reveal */
  var q=$('#heroQuery'),caret=$('#heroCaret'),ans=$('#heroAnswer');
  var text="Is anticipatory bail available for a non-bailable offence under the BNSS?";
  function typeHero(){
    if(reduce){q.textContent=text;caret.style.display='none';ans.classList.add('show','done');return;}
    var i=0;
    (function tick(){
      if(i<=text.length){q.textContent=text.slice(0,i);i++;setTimeout(tick,28+Math.random()*40);}
      else{caret.style.display='none';setTimeout(function(){ans.classList.add('show');setTimeout(function(){ans.classList.add('done');},2000);},350);}
    })();
  }
  var heroSeen=false;
  var hio=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting&&!heroSeen){heroSeen=true;setTimeout(typeHero,500);hio.disconnect();}});},{threshold:0.4});
  if(ans)hio.observe(ans);

  /* stat count-up */
  function countUp(el){
    var target=parseFloat(el.getAttribute('data-count')),suffix=el.getAttribute('data-suffix')||'';
    if(reduce){return;}
    var start=null,dur=1400;
    function frame(t){if(!start)start=t;var p=Math.min((t-start)/dur,1);var eased=1-Math.pow(1-p,3);var val=Math.round(target*eased);el.innerHTML='<b>'+val.toLocaleString('en-IN')+suffix+'</b>';if(p<1)requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  }
  var sio=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){var el=e.target;if(el.hasAttribute('data-count'))countUp(el);sio.unobserve(el);}});},{threshold:0.6});
  $$('.stat .v[data-count]').forEach(function(el){sio.observe(el);});

  /* workflow tabs */
  var tabs=$$('.wf-tab'),panels=$$('.panel'),stageLbl=$('#stageLbl');
  var labels=['research · legal query','search · judgments','discovery · similar cases','citations · treatment check','briefs · draft assembly','matter · case organisation','timeline · chronology'];
  var idx=0,timer=null,ADV=7000;
  function activate(i,manual){
    idx=i;
    tabs.forEach(function(t,j){t.classList.toggle('on',j===i);});
    panels.forEach(function(p,j){p.classList.toggle('on',j===i);});
    if(stageLbl)stageLbl.textContent=labels[i]||'';
    if(manual){restart();}
  }
  function next(){activate((idx+1)%tabs.length);}
  function restart(){if(timer)clearInterval(timer);if(!reduce)timer=setInterval(next,ADV);}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){activate(i,true);});});
  var showcase=$('.showcase');
  if(showcase){
    showcase.addEventListener('mouseenter',function(){document.body.classList.add('paused');if(timer){clearInterval(timer);timer=null;}});
    showcase.addEventListener('mouseleave',function(){document.body.classList.remove('paused');restart();});
    var wio=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){restart();}else if(timer){clearInterval(timer);timer=null;}});},{threshold:0.25});
    wio.observe(showcase);
  }
})();

/* ===================== RESOURCES ===================== */
(function(){'use strict';
  var root=document.getElementById('page-resources');
  if(!root)return;
  var $=function(s,c){return (c||root).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s))};
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* reveal */
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:0.1,rootMargin:'0px 0px -6% 0px'});
  function observeReveals(){$$('.reveal:not(.in)').forEach(function(el){io.observe(el);});}
  observeReveals();

  /* toast */
  var toast=$('#toast'),toastMsg=$('#toastMsg'),toastT;
  function showToast(msg){toastMsg.textContent=msg;toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toast.classList.remove('show');},2200);}

  /* ---------- Bookmarks (localStorage) ---------- */
  var BM_KEY='t2l_resources_bookmarks';
  function getBM(){try{return JSON.parse(localStorage.getItem(BM_KEY)||'[]');}catch(e){return [];}}
  function setBM(a){try{localStorage.setItem(BM_KEY,JSON.stringify(a));}catch(e){}}
  function syncBM(){var saved=getBM();$$('.iconbtn.bm').forEach(function(b){var id=b.getAttribute('data-bm');b.classList.toggle('saved',saved.indexOf(id)>-1);});}
  document.addEventListener('click',function(e){
    var bm=e.target.closest?e.target.closest('.iconbtn.bm'):null;
    if(bm){e.preventDefault();var id=bm.getAttribute('data-bm');var saved=getBM();var i=saved.indexOf(id);if(i>-1){saved.splice(i,1);bm.classList.remove('saved');showToast('Removed from saved');}else{saved.push(id);bm.classList.add('saved');showToast('Saved to your library');}setBM(saved);return;}
    var sh=e.target.closest?e.target.closest('.iconbtn.share'):null;
    if(sh){e.preventDefault();var title=sh.getAttribute('data-share')||document.title;var url=location.href;if(navigator.share){navigator.share({title:title,url:url}).catch(function(){});}else if(navigator.clipboard){navigator.clipboard.writeText(title+' - '+url).then(function(){showToast('Link copied to clipboard');});}else{showToast('Share: '+title);}return;}
    var cal=e.target.closest?e.target.closest('.iconbtn.cal'):null;
    if(cal){e.preventDefault();showToast('Added to calendar reminders');return;}
  });
  syncBM();

  /* ---------- Sticky subnav scrollspy ---------- */
  var subLinks=$$('#subnavTrack a');
  var sections=subLinks.map(function(a){return $(a.getAttribute('href'));}).filter(Boolean);
  var subnavTrackEl=$('#subnavTrack');
  var prevId='';
  function spy(){
    var pos=window.pageYOffset+160;var cur=sections[0];
    sections.forEach(function(s){if(s&&s.offsetTop<=pos)cur=s;});
    var curId=cur?cur.id:'';
    subLinks.forEach(function(a){var on=cur&&a.getAttribute('href')==='#'+cur.id;a.classList.toggle('on',on);});
    if(curId!==prevId){prevId=curId;subLinks.forEach(function(a){if(a.classList.contains('on')&&subnavTrackEl){var sl=a.offsetLeft-subnavTrackEl.offsetWidth/2+a.offsetWidth/2;subnavTrackEl.scrollTo({left:sl,behavior:'smooth'});}});}
  }
  window.addEventListener('scroll',spy,{passive:true});

  /* ---------- Global search ---------- */
  var searchInput=$('#globalSearch'),browse=$('#browse'),results=$('#searchResults'),resultsGrid=$('#searchResultsGrid'),srQuery=$('#srQuery'),srCount=$('#srCount'),srEmpty=$('#srEmpty'),subnav=$('#subnav');
  var items=$$('#browse [data-item]');
  function itemText(el){return ((el.getAttribute('data-title')||'')+' '+(el.getAttribute('data-cat')||'')+' '+(el.getAttribute('data-tags')||'')+' '+el.textContent).toLowerCase();}
  var cache=items.map(function(el){return {el:el,text:itemText(el),cat:el.getAttribute('data-cat')||''};});
  var searchT;
  function runSearch(q){
    q=q.trim().toLowerCase();
    if(!q){results.classList.remove('on');browse.style.display='';subnav.style.display='';return;}
    browse.style.display='none';subnav.style.display='none';results.classList.add('on');
    srQuery.textContent=q;
    resultsGrid.innerHTML='';
    var matches=cache.filter(function(c){return c.text.indexOf(q)>-1;});
    /* de-duplicate: skip items nested inside another matched item */
    matches=matches.filter(function(c){return !matches.some(function(o){return o!==c&&o.el!==c.el&&o.el.contains(c.el);});});
    srCount.textContent='· '+matches.length+' found';
    if(!matches.length){srEmpty.style.display='';return;}
    srEmpty.style.display='none';
    matches.slice(0,60).forEach(function(c){
      var clone=c.el.cloneNode(true);
      clone.classList.remove('hidden-row','hide','reveal');clone.classList.add('in');
      clone.style.display='';
      resultsGrid.appendChild(clone);
    });
    syncBM();
    window.scrollTo({top:results.offsetTop-120,behavior:reduce?'auto':'smooth'});
  }
  if(searchInput){
    searchInput.addEventListener('input',function(){clearTimeout(searchT);searchT=setTimeout(function(){runSearch(searchInput.value);},220);});
    searchInput.addEventListener('keydown',function(e){if(e.key==='Enter'){clearTimeout(searchT);runSearch(searchInput.value);}if(e.key==='Escape'){searchInput.value='';runSearch('');}});
  }
  $('#searchBtn').addEventListener('click',function(){runSearch(searchInput.value);});
  $('#srClear').addEventListener('click',function(){searchInput.value='';runSearch('');window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});});

  /* rotating placeholder */
  var phrases=['Search judgments...','Search legal templates...','Search startup compliance...','Search government resources...','Search legal events...','Search acts and regulations...'];
  var pi=0;
  if(searchInput&&!reduce){setInterval(function(){if(document.activeElement===searchInput||searchInput.value)return;pi=(pi+1)%phrases.length;searchInput.setAttribute('placeholder',phrases[pi]);},2600);}

  /* ---------- Event tabs + filters ---------- */
  var evCards=$$('#eventsGrid .eventcard');
  var evTabState='all';var evFilters={};
  function applyEvents(){
    evCards.forEach(function(card){
      var show=true;
      if(evTabState!=='all'){var groups=(card.getAttribute('data-groups')||'');show=groups.indexOf(evTabState)>-1;}
      Object.keys(evFilters).forEach(function(k){
        var vals=evFilters[k];if(!vals.length)return;
        var cardVal=(card.getAttribute(k==='cat'?'data-evcat':'data-'+k)||'');
        var ok=vals.some(function(v){return cardVal.indexOf(v)>-1;});
        if(!ok)show=false;
      });
      card.classList.toggle('hide',!show);
    });
  }
  $$('#evTabs .ev-tab').forEach(function(tab){tab.addEventListener('click',function(){$$('#evTabs .ev-tab').forEach(function(t){t.classList.remove('on');});tab.classList.add('on');evTabState=tab.getAttribute('data-evtab');expandEvents();applyEvents();});});
  $$('.ev-f[data-fk]').forEach(function(f){f.addEventListener('click',function(){
    var k=f.getAttribute('data-fk'),v=f.getAttribute('data-fv');
    f.classList.toggle('on');
    evFilters[k]=evFilters[k]||[];
    var i=evFilters[k].indexOf(v);if(i>-1)evFilters[k].splice(i,1);else evFilters[k].push(v);
    expandEvents();applyEvents();
  });});
  $('#evReset').addEventListener('click',function(){evFilters={};evTabState='all';$$('.ev-f.on').forEach(function(f){f.classList.remove('on');});$$('#evTabs .ev-tab').forEach(function(t){t.classList.remove('on');});$('#evTabs .ev-tab').classList.add('on');collapseEvents();applyEvents();});
  function expandEvents(){$$('#eventsGrid .ev-more').forEach(function(c){c.classList.remove('hidden-row');});var b=$('#eventsMore');if(b)b.parentElement.style.display='none';}
  function collapseEvents(){$$('#eventsGrid .ev-more').forEach(function(c){c.classList.add('hidden-row');c.classList.remove('hide');});var b=$('#eventsMore');if(b)b.parentElement.style.display='';}
  $('#eventsMore').addEventListener('click',function(){expandEvents();observeReveals();});

  /* ---------- generic load-more (id based) ---------- */
  $$('[data-loadmore]').forEach(function(btn){btn.addEventListener('click',function(){var grid=$('#'+btn.getAttribute('data-loadmore'));$$('.hidden-row.nm',grid).forEach(function(el){el.classList.remove('hidden-row');});btn.parentElement.style.display='none';observeReveals();});});
  $$('[data-loadmore-class]').forEach(function(btn){btn.addEventListener('click',function(){var cls=btn.getAttribute('data-loadmore-class');$$('.'+cls).forEach(function(el){el.classList.remove('hidden-row');});btn.parentElement.style.display='none';observeReveals();});});

  /* ---------- Glossary A-Z ---------- */
  var azWrap=$('#glossaryAZ'),terms=$$('#termsGrid .term');
  var present={};terms.forEach(function(t){present[t.getAttribute('data-letter')]=true;});
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function(L){
    var b=document.createElement('button');b.className='az';b.textContent=L;
    if(!present[L]){b.disabled=true;}
    b.addEventListener('click',function(){
      $$('.az.on',azWrap).forEach(function(x){x.classList.remove('on');});
      var already=b.classList.contains('on');
      if(already){terms.forEach(function(t){t.classList.remove('hide');});return;}
      b.classList.add('on');
      terms.forEach(function(t){t.classList.toggle('hide',t.getAttribute('data-letter')!==L);});
    });
    azWrap.appendChild(b);
  });

  /* ---------- Newsletter ---------- */
  $('#nlForm').addEventListener('submit',function(e){e.preventDefault();var email=$('#nlEmail');if(email.value&&/.+@.+\..+/.test(email.value)){showToast('You are subscribed. Watch your inbox.');email.value='';}else{showToast('Please enter a valid email');email.focus();}});
})();

/* ===================== LOGIN ===================== */
(function(){
  'use strict';
  var root=document.getElementById('page-login');
  if(!root)return;
  var $=function(s){return root.querySelector(s&&s.charAt(0)==='#'?'#lg-'+s.slice(1):s)};
  var pw=$('#password'),tog=$('#pwToggle');
  var eye='<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var eyeOff='<svg viewBox="0 0 24 24"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.6 6.6A13.5 13.5 0 0 0 2 11s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M14.12 14.12A3 3 0 1 1 9.88 9.88"></path><path d="M2 2l20 20"></path></svg>';
  tog.addEventListener('click',function(){
    var show=pw.type==='password';
    pw.type=show?'text':'password';
    tog.innerHTML=show?eyeOff:eye;
    tog.setAttribute('aria-pressed',show);
    tog.setAttribute('aria-label',show?'Hide password':'Show password');
    pw.focus();
  });
  var toast=$('#toast'),tt;
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show');},2600);}
  function setErr(id,msg){
    var el=$('#'+id),e=$('#'+id+'Err');
    if(msg){if(el)el.setAttribute('aria-invalid','true');if(e){e.textContent=msg;e.classList.add('show');}}
    else{if(el)el.removeAttribute('aria-invalid');if(e){e.textContent='';e.classList.remove('show');}}
  }
  var form=$('#loginForm');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var email=$('#email').value.trim(),pwv=$('#password').value;
    var okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var firstBad=null;
    setErr('email',email?(okEmail?'':'Enter a valid email address.'):'Please enter your email.');if(!email||!okEmail)firstBad=firstBad||'email';
    setErr('password',pwv?'':'Please enter your password.');if(!pwv)firstBad=firstBad||'password';
    if(firstBad){var f=$('#'+firstBad);if(f)f.focus();return;}
    var btn=form.querySelector('.submit');btn.disabled=true;btn.textContent='Logging in…';
    setTimeout(function(){$('#formOk').style.display='flex';setTimeout(function(){location.hash='#top';},1100);},700);
  });
  ['email','password'].forEach(function(id){$('#'+id).addEventListener('input',function(){setErr(id,'');});});
  $('.forgot').addEventListener('click',function(e){e.preventDefault();showToast('Password reset is coming soon.');});
  root.querySelectorAll('.soc').forEach(function(b){
    b.addEventListener('click',function(){showToast(b.getAttribute('data-soc')+' sign-in is coming soon.');});
  });
})();

/* ===================== SIGN UP ===================== */
(function(){
  'use strict';
  var root=document.getElementById('page-signup');
  if(!root)return;
  var $=function(s){return root.querySelector(s&&s.charAt(0)==='#'?'#su-'+s.slice(1):s)};
  var pw=$('#password'),tog=$('#pwToggle');
  var eye='<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var eyeOff='<svg viewBox="0 0 24 24"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.6 6.6A13.5 13.5 0 0 0 2 11s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M14.12 14.12A3 3 0 1 1 9.88 9.88"></path><path d="M2 2l20 20"></path></svg>';
  tog.addEventListener('click',function(){
    var show=pw.type==='password';
    pw.type=show?'text':'password';
    tog.innerHTML=show?eyeOff:eye;
    tog.setAttribute('aria-pressed',show);
    tog.setAttribute('aria-label',show?'Hide password':'Show password');
    pw.focus();
  });
  /* toast */
  var toast=$('#toast'),tt;
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show');},2600);}
  /* validation */
  function setErr(id,msg){
    var el=$('#'+id),e=$('#'+id+'Err');
    if(msg){if(el)el.setAttribute('aria-invalid','true');if(e){e.textContent=msg;e.classList.add('show');}}
    else{if(el)el.removeAttribute('aria-invalid');if(e){e.textContent='';e.classList.remove('show');}}
  }
  var form=$('#signupForm');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var name=$('#name').value.trim(),email=$('#email').value.trim(),pwv=$('#password').value,consent=$('#consent').checked;
    var okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var firstBad=null;
    setErr('name',name?'':'Please enter your full name.');if(!name)firstBad=firstBad||'name';
    setErr('email',email?(okEmail?'':'Enter a valid email address.'):'Please enter your email.');if(!email||!okEmail)firstBad=firstBad||'email';
    setErr('password',pwv?(pwv.length<8?'Use at least 8 characters.':''):'Please create a password.');if(!pwv||pwv.length<8)firstBad=firstBad||'password';
    setErr('consent',consent?'':'Please accept the Terms and Privacy Policy.');if(!consent)firstBad=firstBad||'consent';
    if(firstBad){var f=$('#'+firstBad);if(f)f.focus();return;}
    var btn=form.querySelector('.submit');btn.disabled=true;btn.textContent='Creating account…';
    setTimeout(function(){$('#formOk').style.display='flex';setTimeout(function(){location.hash='#top';},1100);},700);
  });
  ['name','email','password'].forEach(function(id){$('#'+id).addEventListener('input',function(){setErr(id,'');});});
  $('#consent').addEventListener('change',function(){setErr('consent','');});
  /* social placeholders */
  root.querySelectorAll('.soc').forEach(function(b){
    b.addEventListener('click',function(){showToast(b.getAttribute('data-soc')+' sign-up is coming soon.');});
  });
})();
