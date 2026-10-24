// Server-rendered UI. Zero build step, brand tokens per the PRD (gold on
// white, navy for dark product UI, Poppins/Inter/DM Mono, no em dashes).
// Pages call the same API the tests exercise. Portable: the production React
// app replaces these pages later; the API contract is the durable part.
export const TOKENS = `
  :root{--gold:#D8AB5B;--gold-deep:#B98F42;--ink:#111111;--gray:#6F6F6F;--line:#EAEAEA;--navy:#0A1628}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:var(--ink);font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.6}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1080px;margin:0 auto;padding:24px 20px}
  h1,h2,h3{font-family:Poppins,sans-serif;letter-spacing:-.01em;margin:0 0 8px}
  .mono{font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gray)}
  .nav{display:flex;gap:16px;align-items:center;border-bottom:1px solid var(--line);padding:12px 20px;flex-wrap:wrap}
  .nav b{font-family:Poppins}
  .nav a:hover{color:var(--gold-deep)}
  .grid{display:grid;gap:16px}
  .card{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff}
  .card h3{font-size:16px}
  .btn{display:inline-block;border:none;border-radius:100px;padding:10px 20px;font-weight:600;cursor:pointer;background:var(--ink);color:#fff;font-size:14px}
  .btn:hover{background:var(--gold-deep)}
  .btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
  input,select,textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;margin:4px 0 12px}
  label{font-size:12px;font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-family:'DM Mono';font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--gray);border-bottom:1px solid var(--line);padding:8px}
  td{border-bottom:1px solid var(--line);padding:8px;vertical-align:top}
  .tag{display:inline-block;font-family:'DM Mono';font-size:10px;letter-spacing:.08em;padding:3px 8px;border-radius:6px;background:#fff;border:1px solid var(--line);color:var(--gray)}
  .tag.ext{border-color:var(--navy);color:var(--navy)}
  .note{border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--gray);margin:12px 0}
  .warn{border-left-color:#B4231B}
  pre{background:var(--navy);color:#EAEAEA;padding:12px;border-radius:10px;overflow:auto;font-size:12px}
  .out{font-size:13px;white-space:pre-wrap;font-family:'DM Mono';monospace:monospace;color:var(--gray);min-height:20px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:800px){.cols{grid-template-columns:1fr}}
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CALL = `
async function call(method, path, body){
  const out = document.getElementById('out');
  try {
    const res = await fetch(path, { method, headers: {'Content-Type':'application/json'},
      body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    out.textContent = (res.status) + ' ' + JSON.stringify(data, null, 2).slice(0, 3000);
    if (data && data.__raw) delete data.__raw;
    return data;
  } catch (e) { out.textContent = 'ERROR ' + e.message; }
}`;

function layout({ title, ctx, active, body, script = '' }) {
  const links = ctx
    ? [['/', 'Dashboard'], ['/services', 'Services'], ['/matters', 'Matters'], ['/resources', 'Resources'],
       ['/research', 'Research'], ['/docengine', 'Doc Engine'], ['/editor', 'Editor'],
       ['/ops', 'Ops'], ['/admin', 'Admin']]
    : [['/resources', 'Resources'], ['/services', 'Services'], ['/login', 'Login']];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Turn2Law</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter&family=DM+Mono&display=swap" rel="stylesheet">
<style>${TOKENS}</style></head><body>
<nav class="nav"><b>Turn2Law</b><span class="tag">DEV SCAFFOLD</span>
${links.map(([href, label]) => `<a href="${href}"${href === active ? ' style="color:var(--gold-deep);font-weight:600"' : ''}>${label}</a>`).join('')}
${ctx ? `<span style="margin-left:auto" class="mono">${esc(ctx.email || '')} · ${esc((ctx.roles || [])[0] || '')}</span>
<a href="#" onclick="call('POST','/api/auth/logout').then(()=>location='/login');return false" class="btn ghost" style="padding:6px 14px">Logout</a>` : ''}
</nav><main class="wrap">${body}<div class="out" id="out"></div></main>
<script>${CALL}${script}</script></body></html>`;
}

const PAGE = {
  '/': (c) => layout({ title: 'Dashboard', ctx: c.ctx, active: '/', body: `
    <h1>Dashboard</h1>
    ${c.ctx ? `<div class="cols">
      <div class="card"><h3>Your org</h3><p class="mono">${esc(c.ctx.orgName || 'no org')}</p>
        <button class="btn" onclick="call('GET','/api/me')">Load /api/me</button></div>
      <div class="card"><h3>Matters</h3><button class="btn" onclick="call('GET','/api/matters')">Your matters</button>
        <button class="btn ghost" onclick="call('GET','/api/orders')">Your orders</button></div>
    </div>
    <div class="note">Dev adapters active: mail, payment (simulator), AI (unconfigured), storage (local).
    Nothing external is live (decision C1).</div>`
    : `<div class="note">Sign in to view your dashboard. <a href="/login" style="color:var(--gold-deep)">Login</a> or <a href="/signup" style="color:var(--gold-deep)">Sign up</a>.</div>`}` }),

  '/login': (c) => layout({ title: 'Login', ctx: c.ctx, active: '/login', body: `
    <h1>Login</h1><div class="card" style="max-width:420px">
    <label>Email</label><input id="email" value="dev-admin@turn2law.invalid">
    <label>Password</label><input id="password" type="password" value="dev-admin-password">
    <button class="btn" onclick="login()">Login</button></div>
    <div class="note">DEV bootstrap admin is prefilled (labelled .invalid). Change DEV_ADMIN_* env vars before any shared deployment.</div>`,
    script: `async function login(){const r=await call('POST','/api/auth/login',
      {email:email.value,password:password.value}); if(r&&r.ok)location='/';}` }),

  '/signup': (c) => layout({ title: 'Sign up', ctx: c.ctx, active: '/signup', body: `
    <h1>Sign up</h1><div class="card" style="max-width:420px">
    <label>Name</label><input id="name"><label>Email</label><input id="email">
    <label>Password (min 10 chars)</label><input id="password" type="password">
    <button class="btn" onclick="sign()">Create account</button></div>
    <div class="note">A verification email is recorded in the dev outbox (Admin, mail adapter unconfigured). Accounts work without verification in dev.</div>`,
    script: `async function sign(){const r=await call('POST','/api/auth/signup',
      {name:name.value,email:email.value,password:password.value}); if(r&&r.user) await call('POST','/api/auth/login',{email:email.value,password:password.value}).then(()=>location='/');}` }),

  '/services': (c) => layout({ title: 'Legal Services', ctx: c.ctx, active: '/services', body: `
    <h1>Legal Services</h1>
    <button class="btn" onclick="call('GET','/api/services')">Browse catalogue</button>
    ${c.ctx?.scopes?.includes('services.manage') ? `<div class="card" style="margin-top:14px"><h3>Create service (admin)</h3>
      <label>Name</label><input id="sname"><label>Category</label>
      <select id="scat"><option>incorporation</option><option>gst</option><option>trademark-ip</option><option>contracts</option><option>roc-compliance</option></select>
      <label>Description</label><input id="sdesc"><label>Professional fee (INR)</label><input id="sfee" type="number" value="4999">
      <button class="btn" onclick="createSvc()">Create draft, then publish</button></div>` : ''}`,
    script: `async function createSvc(){const r=await call('POST','/api/admin/services',
      {name:sname.value,category:scat.value,description:sdesc.value,professional_fee:+sfee.value,government_fee:0});
      if(r&&r.id){await call('POST','/api/admin/services/'+r.id+'/publish',{});call('GET','/api/services');}}` }),

  '/matters': (c) => layout({ title: 'Matters', ctx: c.ctx, active: '/matters', body: `
    <h1>Matters</h1>
    <button class="btn" onclick="call('GET','/api/matters')">Your matters</button>
    <div class="card" style="margin-top:14px"><h3>Open a matter</h3>
    <p class="mono">1. create order 2. dev payment 3. signed webhook verifies 4. matter opens</p>
    <label>Service slug (from catalogue response)</label><input id="slug" placeholder="paste slug">
    <label>Idempotency key (replay safe)</label><input id="idem" value="key-1">
    <button class="btn" onclick="order()">Create order</button></div>`,
    script: `async function order(){const r=await call('POST','/api/orders',
      {service_slug:slug.value,idempotency_key:idem.value}); if(r&&r.order) {
      const p=await call('POST','/api/orders/'+r.order.id+'/payments',{});
      out.textContent+='\\nDEV checkout: '+(p.checkout_url||'');}}` }),

  '/resources': (c) => layout({ title: 'Resources', ctx: c.ctx, active: '/resources', body: `
    <h1>Resources</h1>
    <p class="mono">Reads from the database. Never scrapes on request (RES-025).</p>
    <label>Search</label><input id="q" placeholder="e.g. GST"><button class="btn" onclick="call('GET','/api/resources?q='+encodeURIComponent(q.value))">Search</button>` }),

  '/editor': (c) => layout({ title: 'Editor', ctx: c.ctx, active: '/editor', body: `
    <h1>Editorial</h1><div class="cols">
    <div class="card"><h3>New resource</h3>
      <label>Title</label><input id="rt"><label>Summary</label><input id="rs">
      <label>Body</label><textarea id="rb" rows="4"></textarea>
      <label>Category</label><select id="rc"><option>news</option><option>guides</option><option>acts</option><option>case-law</option></select>
      <button class="btn" onclick="createRes()">Create draft</button></div>
    <div class="card"><h3>Workflow</h3><p class="mono">draft, in_review, approved, published. Authors cannot review their own (RES-012).</p>
      <label>Resource id</label><input id="rid">
      <button class="btn ghost" onclick="call('POST','/api/editor/resources/'+rid.value+'/submit',{})">Submit</button>
      <button class="btn ghost" onclick="call('POST','/api/editor/resources/'+rid.value+'/review',{decision:'approve'})">Approve (reviewer)</button>
      <button class="btn" onclick="call('POST','/api/editor/resources/'+rid.value+'/publish',{})">Publish (publisher)</button></div></div>`,
    script: `async function createRes(){call('POST','/api/editor/resources',
      {title:rt.value,summary:rs.value,body:rb.value,category:rc.value});}` }),

  '/ops': (c) => layout({ title: 'Operations', ctx: c.ctx, active: '/ops', body: `
    <h1>Internal ops</h1>
    <button class="btn" onclick="call('GET','/api/ops/matters')">All matters</button>
    <div class="card" style="margin-top:14px"><h3>Matter actions</h3>
    <label>Matter id</label><input id="mid"><label>Document id</label><input id="did">
    <label>Transition to</label><select id="to"><option>information_required</option><option>under_review</option><option>docs_verified</option><option>preparation</option><option>filing_ready</option><option>filed</option><option>govt_processing</option><option>approved</option><option>delivered</option></select>
    <button class="btn" onclick="call('POST','/api/matters/'+mid.value+'/transition',{to_state:to.value})">Transition</button>
    <button class="btn ghost" onclick="call('POST','/api/matters/'+mid.value+'/documents/'+did.value+'/verify',{decision:'verified'})">Verify doc</button>
    <button class="btn ghost" onclick="call('POST','/api/matters/'+mid.value+'/documents/'+did.value+'/verify',{decision:'rejected',reason:'Illegible scan'})">Reject doc</button></div>` }),

  '/admin': (c) => layout({ title: 'Admin', ctx: c.ctx, active: '/admin', body: `
    <h1>Admin</h1>
    <button class="btn" onclick="call('GET','/api/admin/overview')">Overview (real counts)</button>
    <button class="btn ghost" onclick="call('GET','/api/admin/users')">Users</button>
    <button class="btn ghost" onclick="call('GET','/api/admin/audit')">Audit</button>
    <button class="btn ghost" onclick="call('GET','/api/admin/outbox')">Dev mail outbox</button>
    <button class="btn ghost" onclick="call('GET','/api/admin/ingestion/jobs')">Ingestion jobs</button>
    <button class="btn ghost" onclick="call('GET','/api/docengine/status')">Doc Engine seam</button>
    <div class="cols" style="margin-top:14px">
    <div class="card"><h3>Sources (manual connector only, decision D2)</h3>
      <label>Name</label><input id="srcname"><label>URL</label><input id="srcurl" value="https://">
      <button class="btn" onclick="call('POST','/api/admin/sources',{name:srcname.value,url:srcurl.value})">Register source</button>
      <label>Stage item (title)</label><input id="ititle"><label>Summary</label><input id="isummary">
      <label>Source id</label><input id="isrc">
      <button class="btn ghost" onclick="stageItem()">Stage item</button>
      <button class="btn" onclick="call('POST','/api/admin/ingestion/run',{source_id:isrc.value})">Run ingestion (dedupes by hash)</button></div>
    <div class="card"><h3>Legal corpus (Introspector)</h3>
      <label>Title</label><input id="lt"><label>Citation</label><input id="lc" placeholder="Act s. 24">
      <label>Content</label><textarea id="lx" rows="3"></textarea>
      <button class="btn" onclick="call('POST','/api/admin/legal-documents',{title:lt.value,citation:lc.value,content:lx.value,doc_type:'act'})">Add document</button></div>
    </div>`,
    script: `async function stageItem(){const s=await call('POST','/api/admin/sources/'+isrc.value+'/items',
      {title:ititle.value,summary:isummary.value});}` }),

  '/research': (c) => layout({ title: 'Introspector', ctx: c.ctx, active: '/research', body: `
    <h1>Introspector</h1>
    <div class="note warn">Retrieval-only mode: AI provider unconfigured (decision D3). Answers return passages and citations from stored documents only. No generation, no invented authority.</div>
    <div class="card"><h3>Research session</h3>
    <label>Research matter title</label><input id="rm" value="General research">
    <button class="btn ghost" onclick="newMatter()">Create research matter</button>
    <label>Session id</label><input id="sid">
    <button class="btn ghost" onclick="call('POST','/api/research/matters/'+(sessionStorage.mrid||'')+'/sessions',{})">Open session</button></div>
    <div class="card" style="margin-top:14px"><h3>Ask</h3>
    <label>Question</label><input id="q" placeholder="What does the law say about ...">
    <button class="btn" onclick="ask()">Ask (retrieval first, INT-020)</button></div>`,
    script: `async function newMatter(){const r=await call('POST','/api/research/matters',{title:rm.value});
      if(r&&r.id){sessionStorage.mrid=r.id;const s=await call('POST','/api/research/matters/'+r.id+'/sessions',{});
      if(s&&s.id)sessionStorage.sid=s.id; sid.value=s?s.id:'';}}
    async function ask(){call('POST','/api/research/sessions/'+(sid.value||sessionStorage.sid||'')+'/queries',{question:q.value});}` }),

  '/docengine': (c) => layout({ title: 'Doc Engine', ctx: c.ctx, active: '/docengine', body: `
    <h1>Doc Engine</h1>
    <div class="note warn">Integration seam only. The live nine-step wizard (XeLaTeX, PKCS#12 signing) is preserved in the production codebase and is never rebuilt here (decision B1). Contract: scaffold/docs/docengine-seam.md</div>
    <button class="btn" onclick="call('GET','/api/docengine/status')">Seam status</button>
    ${c.ctx ? '<button class="btn ghost" onclick="call(\'GET\',\'/api/docengine/documents\')">Your documents</button>' : ''}` }),

  '/dev/payment': (c) => layout({ title: 'DEV Payment', ctx: c.ctx, active: '/matters', body: `
    <h1>DEV payment simulator</h1>
    <div class="note warn">This screen stands in for the payment provider (decision C1: Razorpay keys pending).
    It is a simulator only. Payment status changes EXCLUSIVELY through the signed webhook; browser pages never verify anything (LS-022).</div>
    <div class="card" style="max-width:520px">
    <label>Order id</label><input id="oid">
    <button class="btn" onclick="pay()">Simulate provider callback (signed)</button>
    <p class="mono" style="margin-top:10px">Tamper test: the button below flips one signature byte.</p>
    <button class="btn ghost" onclick="pay(true)">Send tampered signature</button></div>`,
    script: `async function pay(tamper){
      const r=await call('POST','/api/dev/payment/'+oid.value+'/sign',{});
      if(!r||!r.signature){out.textContent='no open payment (order already paid or not yours)';return;}
      const sig=tamper?r.signature.slice(0,-2)+'ff':r.signature;
      await call('POST',r.webhook_url+'?x=1',undefined);
      const res=await fetch(r.webhook_url,{method:'POST',headers:{'Content-Type':'application/json','x-t2l-signature':sig},
        body:JSON.stringify(r.payload)});
      const data=await res.json().catch(()=>({}));
      out.textContent=res.status+' '+JSON.stringify(data,null,2);
    }` }),
};

export function renderPage(page, props) { return page(props); }
export const ROUTES = PAGE;
