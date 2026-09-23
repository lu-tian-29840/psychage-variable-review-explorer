/* Local metadata explorer. No network calls or respondent-level data. */
(() => {
  'use strict';
  const D=window.FLOWER_DATA, J=window.JOURNEY_DATA, root=document.getElementById('app');
  if(!D || !J){root.textContent='Metadata payload missing. Rebuild with python3 -B build_metadata.py.';return;}
  const N=Object.fromEntries(J.nodes.map(n=>[n.id,n]));
  const defaults={view:'journey',stage:'universe',mode:'flow',collection:'Core',group:'',id:'',q:'',status:'',project:'',sort:'id',page:1,expanded:''};
  let state={...defaults};
  const remembered={journey:{...defaults},explore:{...defaults,view:'explore'}};
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=x=>Number(x).toLocaleString('en-US');
  const missing='Not documented in supplied sources';
  function readState(){
    const p=new URLSearchParams(location.hash.slice(1));state={...defaults};
    for(const k of Object.keys(defaults))if(p.has(k))state[k]=p.get(k);
    state.view=state.view==='explore'?'explore':'journey';
    state.status=simpleStatuses[state.status]||state.status;
    if(state.view==='explore'&&state.status==='Under review')state.status='Kept';
    if(!['','Under review','Kept','Set aside','Unclear'].includes(state.status))state.status='';
    if(!N[state.stage])state.stage='universe';
    if(!D.variables[state.collection])state.collection='Core';
    if(!D.groups[state.collection].some(g=>g.name===state.group))state.group='';
    if(!J.variables[state.id])state.id='';
    if(!['id','label','group','status'].includes(state.sort))state.sort='id';
    state.page=Math.max(1,parseInt(state.page,10)||1);
    state.mode=state.mode==='sankey'?'sankey':'flow';
  }
  function navigate(change,replace=false){
    const active=document.activeElement;
    const focusId=active?.id;
    const focusData=active?.dataset?Object.entries(active.dataset)[0]:null;
    remembered[state.view]={...state};
    state={...state,...change};
    const p=new URLSearchParams();Object.keys(defaults).forEach(k=>{if(state[k]!==defaults[k])p.set(k,state[k]);});
    history[replace?'replaceState':'pushState']({explorer:true},'',location.pathname+location.search+'#'+p.toString());
    render();
    if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
    else if(focusData){const [key,val]=focusData;const attr='data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());[...root.querySelectorAll('['+attr+']')].find(el=>el.dataset[key]===val)?.focus({preventScroll:true});}
  }
  function source(path){
    if(!path)return e(missing);
    const normalized=path.replace(/\\/g,'/');
    if(/(?:^|\/)process_record(?:\/|\.md(?:$|:))|(?:^|\/)scope_reconciliation\.json(?:$|:)/i.test(normalized))return '';
    let clean=path.replace(/^\/Users\/lutian\/LT\/bioage\/ml_age\/ml_age_work\//,'');
    const line=clean.match(/:(\d+)$/);clean=clean.replace(/:\d+$/,'');
    const href='../../../../'+clean.split('/').map(encodeURIComponent).join('/');
    return `<a class="source-link" href="${e(href)}" target="_blank" rel="noopener">${e(clean.split('/').pop())}${line?' · line '+line[1]:''}</a>`;
  }
  const readerStatuses=Object.freeze({
    universe:'Included in this review inventory',
    provisional:'Retained for further review',
    initial_out:'Excluded',
    round1:'Retained for further review',
    history_A:'Deferred',
    history_C:'Deferred',
    history_D:'Deferred',
    scope:'Included in this review inventory',
    efg:'Deferred',
    io:'Support only',
    screened:'Included in this review inventory',
    core_review:'Included in this review inventory',
    low:'Set aside after screening',
    no_den:'Disposition unresolved',
    other:'Disposition unresolved',
    c273:'Retained for further review',
    core:'Retained for further review',
    support:'Support only',
    deferred:'Deferred',
    excluded:'Excluded',
    lb381:'Included in this review inventory',
    lb:'Retained for further review',
    lb_out:'Deferred'
  });
  const readerDisposition=Object.freeze({
    stage:'Retained for further review',
    retained:'Retained for further review',
    coverage:'Set aside after screening',
    support:'Support only',
    held:'Deferred',
    unresolved:'Disposition unresolved',
    outside:'Excluded'
  });
  const recordedRecommendation=Object.freeze({
    SUPPORT_ONLY:'Support only',
    DEFER:'Deferred',
    RECOMMEND_EXCLUDE:'Excluded',
    RETAIN_CANDIDATE:'Retained for further review',
    MOVE_TO_POOL_OBJECTIVE:'Retained for further review',
    RETAIN_COMPONENT:'Retained for further review'
  });
  const simpleStatuses=Object.freeze({
    'Included in this review inventory':'Under review',
    'Retained for further review':'Kept',
    'Set aside after screening':'Set aside',
    'Support only':'Set aside',
    'Deferred':'Set aside',
    'Excluded':'Set aside',
    'Disposition unresolved':'Unclear'
  });
  function friendlyDisposition(stage,raw){return simpleStatuses[recordedRecommendation[raw]||readerStatuses[stage]||readerDisposition[raw]]||'Unclear';}
  function button(key,small=false){const n=N[key];return `<button type="button" class="${small?'branch-button':'stage-button'} ${n.kind} ${state.stage===key?'selected':''}" data-stage="${key}" aria-pressed="${state.stage===key}">${small?`${num(n.count)} · ${e(n.label)}`:`<strong>${num(n.count)}</strong>${e(n.label)}`}</button>`;}
  function children(key){return J.links.filter(l=>l.source===key).map(l=>N[l.target]);}
  function sideBranches(key,keys){
    if(keys.length<2)return keys.map(x=>button(x,true)).join('');
    const open=state.expanded.split(',').includes(key);
    return `<button class="branch-button" data-expand="${key}" aria-expanded="${open}" aria-controls="branches-${key}">${open?'−':'+'} ${num(keys.reduce((sum,k)=>sum+N[k].count,0))} variables held outside at this step · ${keys.length} decisions</button><div id="branches-${key}" class="side-list" ${open?'':'hidden'}>${keys.map(x=>button(x,true)).join('')}</div>`;
  }
  function flow(){
    const main=[['universe',[]],['provisional',['initial_out']],['round1',['history_A','history_C','history_D']],['scope',['efg','io']]];
    return `<p class="mode-note">Source-variable counts · box sizes are not proportional. Select a stage or decision.</p><div class="milestones">${main.map(([k,s],i)=>`<div class="stage-row"><div>${i?'<p class="connector" aria-hidden="true">↓</p>':''}${button(k)}</div><div class="side-list">${sideBranches(k,s)}</div></div>`).join('')}</div>
      <p class="connector" aria-hidden="true">↓ Core and Leave-Behind review</p><div class="lane-grid"><section class="lane"><h3>Core selection and review</h3>${button('core_review')}<p class="summary-line">273 retained · 4,338 outside the working pool · 170 without a respondent denominator</p>${button('outside_pool',true)}${button('no_den',true)}<p class="connector">↓</p>${button('c273')}${['support','deferred','excluded'].map(x=>button(x,true)).join('')}<p class="connector">↓</p>${button('core')}<button class="plain-button" data-collection="Core">Explore Core flower →</button></section><section class="lane"><h3>Leave-Behind review</h3>${button('lb381')}${button('lb_out',true)}<p class="connector">↓</p>${button('lb')}<button class="plain-button" data-collection="Leave-Behind">Explore LB flower →</button></section></div>`;
  }
  function sankey(){
    let parent=N[state.stage];if(!children(parent.id).length){const incoming=J.links.find(l=>l.target===parent.id);parent=incoming?N[incoming.source]:N.universe;}
    const ch=children(parent.id),scale=280/parent.count,gap=60,height=360+(ch.length-1)*gap;
    let y=45;const x0=145,x1=355;
    const startY=45+(ch.length-1)*gap/2;let offset=0;
    const bands=ch.map((n,i)=>{const h=n.count*scale,sy=startY+offset,ty=y;offset+=h;y+=h+gap;const color=n.kind==='stage'||n.kind==='retained'?'#789ac3':n.kind==='unresolved'?'#d5b06c':'#c3b5c6';
      return `<g role="button" tabindex="0" data-stage="${n.id}" aria-label="${e(n.label)}, ${num(n.count)} variables"><title>${e(n.label)}: ${num(n.count)} (${(100*n.count/parent.count).toFixed(2)}%)</title><path d="M${x0},${sy} C245,${sy} 255,${ty} ${x1},${ty} L${x1},${ty+h} C255,${ty+h} 245,${sy+h} ${x0},${sy+h} Z" fill="${color}" stroke="white" stroke-width=".5"/><rect x="${x1}" y="${ty}" width="12" height="${h}" fill="${color}"/><rect x="350" y="${ty+h/2-22}" width="275" height="44" fill="transparent"/><text x="380" y="${ty+h/2}" font-size="12" fill="#17223b">${num(n.count)} · ${e(n.label)}</text></g>`;}).join('');
    return `<p class="mode-note">Proportional flow for <strong>${e(parent.label)}</strong>. Band width represents variable count. Scale resets when you select another parent stage.</p><div class="sankey-scroll"><svg class="sankey-svg" viewBox="0 0 660 ${height}" role="group" aria-label="Count-proportional branches of ${e(parent.label)}"><rect x="133" y="${startY}" width="12" height="280" fill="#355a8a"/><text x="125" y="${startY+130}" text-anchor="end" font-size="24">${num(parent.count)}</text>${bands}</svg></div><div class="side-list">${button(parent.id,true)}${ch.map(n=>button(n.id,true)).join('')}</div><label class="control">Inspect another stage<select id="sankeyStage">${J.nodes.filter(n=>children(n.id).length).map(n=>`<option value="${n.id}" ${n.id===parent.id?'selected':''}>${e(n.label)}</option>`).join('')}</select></label>`;
  }
  function evidence(){const n=N[state.stage],ch=children(n.id),counts={};
    if(n.id==='initial_out')n.ids.forEach(id=>{const r=J.variables[id].history.find(h=>h.stage===n.id).rationale;counts[r]=(counts[r]||0)+1;});
    return `<aside class="evidence-panel"><p class="eyebrow">Selected stage / decision</p><h2>${e(n.label)}</h2><p style="font-size:32px;margin-bottom:8px">${num(n.count)} <span class="subtle">unique variables</span></p><p>${e(n.reason)}</p>${ch.length?`<h3>Count reconciliation</h3><p>${num(n.count)} = ${ch.map(x=>num(x.count)).join(' + ')}</p><div class="side-list">${ch.map(x=>button(x.id,true)).join('')}</div>`:''}${n.kind==='unresolved'?'<p class="warning">The variable identities are verified. The unresolved scientific or workflow decision remains visible.</p>':''}${n.id==='low'?`<p class="warning">Causal explanations remain unresolved. Assess conditional follow-up, restricted eligibility, repeated components, prior-wave availability, and eligible nonresponse using the individual codebook record.</p><p class="summary-line">${num(J.validation.lowCoverageCodebookEntries)} matched codebook entries; ${num(J.validation.conditionalWordingContextOnly)} with explicit conditional wording. No redundancy classifications have been inferred.</p>`:''}${n.collection?`<p><button class="plain-button" data-collection="${e(n.collection)}">Explore ${e(n.collection)} flower →</button></p>`:''}<div class="sources">${source(n.source)}</div>${Object.keys(counts).length?`<details><summary>Documentary rationale breakdown</summary>${Object.entries(counts).map(([r,c])=>`<p class="reason-counts"><strong>${c}</strong> · ${e(r)}</p>`).join('')}</details>`:''}<p class="summary-line" style="margin-top:18px">The searchable list below contains this stage's variables. Select an ID to see its history.</p></aside>`;
  }
  function flower(){const groups=D.groups[state.collection],total=D.variables[state.collection].length,max=Math.max(...groups.map(g=>g.count));
    // Similar petal paths, uniformly scaled by sqrt(count), preserve exact area ratios.
    const marks=groups.map((g,i)=>{const a=360*i/groups.length,s=Math.sqrt(g.count/max)*1.4;
      return `<g class="petal ${state.group===g.name?'selected':''}" role="button" tabindex="0" data-group="${e(g.name)}" aria-label="${e(g.name)}, ${g.count} variables, ${g.share}%" transform="translate(260 260) rotate(${a})"><title>${e(g.name)} · ${g.count} variables (${g.share}%)</title><path d="M0 -74 C-44 -99 -51 -166 0 -200 C51 -166 44 -99 0 -74Z" transform="translate(0 ${74*(s-1)}) scale(${s})" fill="${['#bad0ed','#dbc3d1','#d3dfc7','#e8d9b7'][i%4]}" stroke="#718298" stroke-width="1"/><circle cx="0" cy="-160" r="24" fill="transparent"/><text x="0" y="-${90+68*s}" text-anchor="middle" font-size="13" font-weight="800" transform="rotate(${-a},0,-${90+68*s})">${i+1}</text></g>`;}).join('');
    return `<div class="collection-tabs">${['Core','Leave-Behind'].map(c=>`<button data-collection="${c}" class="${c===state.collection?'active':''}" aria-pressed="${c===state.collection}">${c} · ${D.variables[c].length}</button>`).join('')}</div><p class="subtle">Petal area represents full-collection variable count, not importance. Each collection has its own scale; search and filters do not resize petals. Numbered petals match the group list.</p><div class="flower-layout"><div><svg class="flower-svg" viewBox="0 0 520 520" role="group" aria-label="${e(state.collection)} group flower">${marks}<g role="button" tabindex="0" data-group="" aria-label="Show all ${total} ${e(state.collection)} variables"><circle cx="260" cy="260" r="70" fill="#17223b"/><text x="260" y="240" fill="white" text-anchor="middle" font-size="14">${state.collection}</text><text x="260" y="274" fill="white" text-anchor="middle" font-size="30">${total}</text><text x="260" y="295" fill="white" text-anchor="middle" font-size="11">SHOW ALL</text></g></svg></div><div class="flower-groups">${groups.map((g,i)=>`<button class="group-button ${g.name===state.group?'selected':''}" data-group="${e(g.name)}" aria-pressed="${g.name===state.group}"><span class="group-name">${i+1}. ${e(g.name)}</span><span class="group-count">${g.count}</span></button>`).join('')}</div></div>`;
  }
  function listBase(){return state.view==='journey'?N[state.stage].ids.map(id=>J.variables[id]):D.variables[state.collection].map(r=>J.variables[r.id]);}
  function status(v){
    if(state.view==='explore')return 'Kept';
    const event=v.history.find(h=>h.stage===state.stage);
    return event?friendlyDisposition(event.stage,event.disposition):'Unclear';
  }
  function project(v){return v.current?(v.current.role||v.current.projectStatus||''):'';}
  function listRows(){const q=state.q.toLowerCase().trim();return listBase().filter(v=>(!q||`${v.id} ${v.label}`.toLowerCase().includes(q))&&(!state.status||status(v)===state.status)&&(!state.project||project(v)===state.project)&&(state.view!=='explore'||!state.group||v.current.group===state.group)).sort((a,b)=>String(state.sort==='status'?status(a):state.sort==='group'?a.current?.group||a.section:a[state.sort]).localeCompare(String(state.sort==='status'?status(b):state.sort==='group'?b.current?.group||b.section:b[state.sort]),undefined,{numeric:true}));}
  function options(values,selected){return '<option value="">All</option>'+[...new Set(values.filter(Boolean))].sort().map(v=>`<option ${v===selected?'selected':''} value="${e(v)}">${e(v)}</option>`).join('');}
  function table(){const all=listRows(),pages=Math.max(1,Math.ceil(all.length/50)),page=Math.min(state.page,pages),slice=all.slice((page-1)*50,page*50),base=listBase();
    return `<section class="inventory" aria-labelledby="inventoryTitle"><h2 id="inventoryTitle">${state.view==='journey'?e(N[state.stage].label):e(state.group||state.collection)} — variables</h2><div class="filter-grid"><label>Search ID or label<input id="search" type="search" value="${e(state.q)}" placeholder="Search variables…"></label><label>Status<select id="statusFilter">${options(base.map(status),state.status)}</select></label><label>${state.view==='journey'?'Current pool role/status':state.collection==='Core'?'Core role':'Project status'}<select id="projectFilter">${options(base.map(project),state.project)}</select></label><label>Sort<select id="sortFilter">${['id','label','group','status'].map(k=>`<option value="${k}" ${state.sort===k?'selected':''}>${k==='group'?'Group / section':k.toUpperCase()}</option>`).join('')}</select></label></div><p class="summary-line" aria-live="polite">${num(all.length)} visible / ${num(base.length)} source variables${state.view==='explore'&&state.group?' · Selected group: '+D.variables[state.collection].filter(v=>v.group===state.group).length+' variables':''}</p><table><thead><tr><th scope="col">Variable</th><th scope="col">Source label</th><th scope="col">Group / section</th><th scope="col">Status</th></tr></thead><tbody>${slice.length?slice.map(v=>`<tr class="${state.id===v.id?'selected':''}"><td><button class="variable-button" data-variable="${e(v.id)}">${e(v.id)}</button></td><td>${e(v.current?.label||v.label)}</td><td>${e(v.current?.group||v.section)}</td><td>${e(status(v)||missing)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">No variables match. Clear the search or filters to see more.</td></tr>'}</tbody></table><div class="pager"><button data-page="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>Page ${page} of ${pages} · up to 50 rows</span><button data-page="${page+1}" ${page>=pages?'disabled':''}>Next</button></div></section>`;
  }
  function item(k,v){return `<div class="detail-item"><div class="detail-key">${e(k)}</div><div class="detail-value">${e(v||missing)}</div></div>`;}
  function details(){if(!state.id)return '<section class="detail-wrap empty-detail"><h2>Variable evidence</h2><p>Select a variable ID to inspect its source documentation and audit history.</p></section>';
    const v=J.variables[state.id],r=v.current,c=v.codebookContext;
    let fields=[['Source ID',v.sourceFieldId],['Section',v.section]];
    if(r){fields.push(['Primary group',r.group],['Grouping evidence',r.groupEvidence]);if(r.collection==='Core')fields.push(['Core role',r.role],['Crosswalk status',r.crosswalkStatus],['RAND counterpart(s)',r.randCounterpart],['Meaning and limitations',r.matchMeaning],['Detailed source meaning',r.detailedMeaning],['Observed valid',r.observedValid],['Unobserved % (mechanical complement)',r.missingPct]);else fields.push(['Guide status',r.guideStatus],['Project status',r.projectStatus],['Guide rule type',r.guideRuleType],['Explicit instruction',r.explicitInstruction],['Target rule',r.targetRule],['Condition / boundary',r.conditionBoundary],['Guide Markdown source',r.guideSource],['PDF pages',r.pdfPages]);}
    return `<section class="detail-wrap" id="variableEvidence" aria-labelledby="variableTitle"><div class="toolbar"><h2 id="variableTitle">${e(v.id)} · ${e(r?.label||v.label)}</h2><button data-clear-variable="true">Close detail</button></div><div class="detail-grid">${fields.map(([k,val])=>item(k,val)).join('')}</div>${r?`<p>${source(r.sourceRef)} · ${source(r.crosswalkRef||r.guideRef)}</p>`:''}${v.coverage?`<h3>Recorded coverage evidence</h3><div class="detail-grid">${Object.entries(v.coverage).map(([k,val])=>item(k.replaceAll('_',' '),val)).join('')}</div><p>${source(v.coverageSource)}</p>`:''}${v.lowCoverageExplanation?`<p class="warning">${e(v.lowCoverageExplanation)}</p>`:''}${c?.excerpt?`<details><summary>Codebook context${c.conditionalCue?' · conditional wording present':''}</summary><p>${source(c.source+':'+c.line)}</p>${c.conditionalCue?`<p><strong>Conditional wording:</strong> ${e(c.conditionalCue)}</p>`:''}<pre class="codebook-excerpt">${e(c.excerpt)}</pre></details>`:''}<h3>Recorded selection history</h3><ol class="audit-history">${v.history.map(h=>`<li><button class="variable-button" data-stage="${h.stage}">${e(h.label)}</button> <span class="subtle">${e(friendlyDisposition(h.stage,h.disposition))}</span><br>${e(h.rationale)}<br>${source(h.source)}</li>`).join('')}</ol></section>`;
  }
  function render(){const isJourney=state.view==='journey';
    root.innerHTML=`<p class="eyebrow">HRS PsychAge · source inventory and audit history</p><nav class="page-nav" aria-label="Main views"><button data-view="journey" ${isJourney?'aria-current="page"':''}>Selection journey</button><button data-view="explore" ${!isJourney?'aria-current="page"':''}>Explore current variables</button></nav><nav class="breadcrumbs" aria-label="Breadcrumb"><button id="back">← Back</button><button data-view="${state.view}">${isJourney?'Selection journey':'Explore current variables'}</button><span>› ${e(isJourney?N[state.stage].label:state.collection)}${!isJourney&&state.group?' › '+e(state.group):''}${state.id?' › '+e(state.id):''}</span></nav><header class="view-heading"><h1>${isJourney?'From 6,502 source variables to the current pools.':'Find the structure inside the variable universe.'}</h1><p class="lede">${isJourney?'Trace the recorded decisions to 202 Core and 371 Leave-Behind provisional source variables. Select any stage to inspect its variable identities, rationale, and evidence.':'Explore the 202 Core and 371 Leave-Behind source variables by group, then inspect each variable and its selection history.'}</p></header>${isJourney?`<div class="toolbar"><button data-mode="flow" class="${state.mode==='flow'?'active':''}">Readable flow</button><button data-mode="sankey" class="${state.mode==='sankey'?'active':''}">Proportional flow</button><span class="subtle">All branch counts reconcile by source ID.</span></div><div class="journey-layout"><section class="journey-graphic" aria-label="Selection flow">${state.mode==='flow'?flow():sankey()}</section>${evidence()}</div>`:flower()}${table()}${details()}<footer class="footer"><p>573 current provisional source variables. Final independent predictor count remains undetermined. Coverage-screen outcomes and later scientific explanations are recorded separately.</p><p><a href="transition_ledger.csv">Transition ledger</a> · <a href="grouping_manifest.csv">Grouping manifest</a> · <a href="journey_validation.json">Journey validation</a> · <a href="README.md">Documentation</a></p></footer>`;
    wire();
  }
  function wire(){
    const all=(q,fn)=>root.querySelectorAll(q).forEach(el=>el.addEventListener('click',fn));
    all('[data-view]',ev=>{const view=ev.currentTarget.dataset.view;if(view!==state.view)navigate({...remembered[view]});});
    all('[data-mode]',ev=>navigate({mode:ev.currentTarget.dataset.mode}));
    all('[data-expand]',ev=>{const key=ev.currentTarget.dataset.expand,open=new Set(state.expanded.split(',').filter(Boolean));if(open.has(key))open.delete(key);else open.add(key);navigate({expanded:[...open].join(',')});});
    all('[data-stage]',ev=>navigate({view:'journey',stage:ev.currentTarget.dataset.stage,id:'',q:'',status:'',project:'',page:1}));
    all('[data-collection]',ev=>{const c=ev.currentTarget.dataset.collection;navigate({view:'explore',collection:c,group:c===state.collection?state.group:'',id:'',status:'',project:'',q:'',page:1});});
    all('[data-group]',ev=>navigate({group:ev.currentTarget.dataset.group===state.group?'':ev.currentTarget.dataset.group,id:'',page:1}));
    all('[data-variable]',ev=>{navigate({id:ev.currentTarget.dataset.variable});document.getElementById('variableEvidence')?.scrollIntoView({block:'start'});document.getElementById('variableTitle')?.setAttribute('tabindex','-1');document.getElementById('variableTitle')?.focus({preventScroll:true});});
    all('[data-clear-variable]',()=>navigate({id:''}));
    all('[data-page]',ev=>navigate({page:Number(ev.currentTarget.dataset.page)}));
    root.querySelectorAll('svg [role="button"]').forEach(el=>el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}));
    document.getElementById('back').onclick=()=>{if(history.state?.explorer)history.back();else navigate({...defaults});};
    const search=document.getElementById('search');search.oninput=ev=>{const pos=ev.target.selectionStart;navigate({q:ev.target.value,page:1},true);const next=document.getElementById('search');next.focus();next.setSelectionRange(pos,pos);};
    ['status','project','sort'].forEach(k=>document.getElementById(k+'Filter').onchange=ev=>navigate({[k]:ev.target.value,page:1}));
    const stage=document.getElementById('sankeyStage');if(stage)stage.onchange=ev=>navigate({stage:ev.target.value,id:'',q:'',status:'',project:'',page:1});
  }
  addEventListener('popstate',()=>{readState();render();});
  addEventListener('hashchange',()=>{readState();render();});
  readState();render();
})();
