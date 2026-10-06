/* Local metadata explorer. No network calls or respondent-level data. */
(() => {
  'use strict';
  const D=window.FLOWER_DATA, J=window.JOURNEY_DATA, root=document.getElementById('app');
  if(!D || !J){root.textContent='Metadata payload missing. Rebuild with python3 -B build_metadata.py.';return;}
  const N=Object.fromEntries(J.nodes.map(n=>[n.id,n]));
  // Omit redundant counting commentary from the reader-facing source summary.
  for(const node of Object.values(N)) if(typeof node.reason==='string') node.reason=node.reason.replace(/\s*Shared RAND Fat File representations count once\./g,'');
  const F=window.FINAL_DECISION_DATA;
  const currentIds=new Set(F.originalSources.map(row=>row.id));
  const reviewedById=Object.fromEntries(F.originalSources.map(row=>[row.id,row]));
  for(const collection of ['Core','Leave-Behind']){
    const previous=Object.fromEntries(D.variables[collection].map(row=>[row.id,row]));
    D.variables[collection]=F.originalSources.filter(row=>row.origin===collection).map(row=>({ ...previous[row.id], ...row, collection, reviewedDecision: row.disposition, role: row.relationshipRoles.join('; '), projectStatus: row.inCorrespondence ? 'Used or referenced by measures' : row.disposition }));
    D.groups[collection]=F.groups.original[collection].map(group=>({ ...group, share: (100*group.count/D.variables[collection].length).toFixed(2) }));
    for(const row of D.variables[collection]) if(J.variables[row.id]) J.variables[row.id].current=row;
  }
  const reviewNode=(id,label,rows,reason,kind='stage',collection=null)=>({id,label,ids:rows.map(row=>typeof row==='string'?row:row.id).sort(),count:rows.length,reason,kind,collection,source:'05_outputs/98_audits_2/process_record/decision_3_core_164_lb_142_144_composites.md'});
  const currentNodes=[
    reviewNode('measure_review','Survey variables reviewed',F.originalSources,'211 Core section variables + 375 LB section variables = 586 reviewed variables.'),
    reviewNode('reviewed_core','Core section variables reviewed',D.variables.Core,'These 211 Core variables include survey answers and information needed to calculate, interpret, or check measures.','stage','Core'),
    reviewNode('reviewed_lb','LB section variables reviewed',D.variables['Leave-Behind'],'These 375 LB variables supply individual answers, scores, and supporting information.','stage','Leave-Behind'),
    reviewNode('used_core','Core variables represented in planned measures',F.originalSources.filter(row=>row.origin==='Core'&&row.analysisCategory==='represented'),'172 Core variables are represented in at least one planned measure.','retained','Core'),
    reviewNode('used_lb','LB variables represented in planned measures',F.originalSources.filter(row=>row.origin==='Leave-Behind'&&row.analysisCategory==='represented'),'374 LB variables are represented in at least one planned measure.','retained','Leave-Behind'),
    reviewNode('checking_only','Used only for checking or interpretation',F.originalSources.filter(row=>row.analysisCategory==='checking'),'Three variables support checking; none is a separate planned measure.','stage','Core'),
    reviewNode('measure_out','Not selected for planned measures',F.originalSources.filter(row=>row.analysisCategory==='not-selected'),'37 reviewed variables are not selected for planned measures. Open the reasons list for the individual decisions.','outside','Core'),
    reviewNode('outside_measure_review','Outside the current reviewed list',N.universe.ids.filter(id=>!currentIds.has(id)),'6,502 − 586 = 5,916 variables outside the current reviewed list. Their recorded decisions include exclusions, deferrals, supporting information, and unresolved reviews. Being outside this list is not itself a scientific exclusion reason. Read the individual recorded reasons below.','unresolved'),
  ];
  currentNodes.push(reviewNode('core_not_selected','Core variables not selected',F.originalSources.filter(row=>row.origin==='Core'&&row.analysisCategory==='not-selected'),'36 Core variables are not selected for planned measures.','outside','Core'));
  currentNodes.push(reviewNode('lb_not_selected','LB variable not selected',F.originalSources.filter(row=>row.origin==='Leave-Behind'&&row.analysisCategory==='not-selected'),'OLB001A was removed by the PI on 3 October 2026.','outside','Leave-Behind'));
  currentNodes.push(reviewNode('creating_measures','Creating the measures',F.originalSources.filter(row=>row.analysisCategory==='represented'),'546 survey variables are represented in 244 distinct measures. Some remain individual answers, some are represented by RAND, and others contribute to combined or calculated measures. A variable can contribute to more than one measure. This is a change of representation, not additional scientific exclusions.'));
  for(const [id,label,collection] of [['core_measures','Core measure entries','Core'],['lb_measures','LB measure entries','LB'],['planned_measures','Measures listed for analysis',null]]){
    const entries=F.features.filter(row=>!collection||row.collection===collection);
    currentNodes.push({...reviewNode(id,label,[],collection?'These are the current numbered measure entries from PI Decisions 3. Open an entry below to read its inputs, construction, and limitations.':'126 Core + 118 LB = 244 measure entries. R12LBSATWLF is listed and counted only in the Leave behind section. All 244 entries are distinct measures. These are planned measures, not predictors selected by a finished model.'),count:entries.length,unit:'measure entries',entries});
  }
  currentNodes.forEach(node=>{N[node.id]=node;});
  const currentLinks=[['universe','measure_review'],['universe','outside_measure_review'],['measure_review','reviewed_core'],['measure_review','reviewed_lb'],['reviewed_core','used_core'],['reviewed_core','checking_only'],['reviewed_core','core_not_selected'],['reviewed_lb','used_lb'],['reviewed_lb','lb_not_selected']].map(([source,target])=>({source,target,count:N[target].count}));
  const currentStageIds=new Set(['universe',...currentNodes.map(node=>node.id)]);
  const outsideEvents=Object.fromEntries(N.outside_measure_review.ids.map(id=>[id,J.variables[id]?.history.at(-1)]));
  const outsideReasonLabels={initial_out:'Documented initial exclusions',io:'Reserved for supporting information',history_A:'Core Section A review decisions',history_C:'Core Section C held outside this workflow',history_D:'Core Section D held outside this workflow',outside_pool:'Outside the Core working pool',deferred:'Not moved into the Core pool',excluded:'Core exclusion recommendations',efg:'Core Sections E/F/G deferred',support:'Reserved for Core supporting information',no_den:'Respondent denominator unavailable',lb_out:'LB items held outside the earlier pool'};
  const outsideReasonCounts={};
  for(const event of Object.values(outsideEvents)){const key=event?.stage||'undocumented';outsideReasonCounts[key]=(outsideReasonCounts[key]||0)+1;}
  const defaults={view:'journey',stage:'universe',mode:'flow',collection:'Core',group:'',topic:'',reason:'',id:'',q:'',status:'',project:'',sort:'id',page:1,expanded:'',finalStep:'features',finalOrigin:'Core',finalCollection:'All',finalGroup:'',finalId:'',finalEntry:'',finalSearch:'',finalPage:1,finalFilterGroup:'',finalFilterOutput:'',finalFilterForm:'',finalFilterRole:'',finalFilterCaveat:'',finalFilterAvailability:'',finalFilterAdditional:'',finalFilterMapping:'',finalSort:'entryId'};
  let state={...defaults};
  const remembered={journey:{...defaults},explore:{...defaults,view:'explore'},final:{...defaults,view:'final'}};
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sectionTopic=collection=>collection==='Core'?'Core section topic':'Leave behind section topic';
  const num=x=>Number(x).toLocaleString('en-US');
  const missing='Not documented in supplied sources';
  function readState(){
    const p=new URLSearchParams(location.hash.slice(1));state={...defaults};
    for(const k of Object.keys(defaults))if(p.has(k))state[k]=p.get(k);
    state.view=['explore','final'].includes(state.view)?state.view:'journey';
    state.status=simpleStatuses[state.status]||state.status;
    if(state.view==='explore'&&state.status==='Under review')state.status='Kept';
    if(state.view==='explore'&&state.status==='Set aside')state.status='Not used in planned measures';
    if(!['','Under review','Kept','Set aside','Not used in planned measures','Used only for checking or interpretation','Unclear'].includes(state.status))state.status='';
    if(state.view==='explore'&&!['','individual','rand','combined'].includes(state.project))state.project='';
    if(!N[state.stage])state.stage='universe';
    if(state.reason&&!outsideReasonCounts[state.reason])state.reason='';
    if(state.stage==='core')state.stage='reviewed_core';
    if(state.stage==='lb')state.stage='reviewed_lb';
    if(!D.variables[state.collection])state.collection='Core';
    if(/^Guide family/.test(state.group))state.group=topicLabel(state.group).replace(/ \(Q[^)]*\)$/,'');
    if(state.collection==='Leave-Behind'){
      const legacyTopic=state.group;
      if(legacyTopic&&!D.groups[state.collection].some(g=>g.name===legacyTopic)){
        const match=D.variables[state.collection].find(row=>row.topic===legacyTopic||topicLabel(row.topic)===topicLabel(legacyTopic));
        if(match){state.group=match.group;state.topic=match.topic;}
      }
      if(!D.groups[state.collection].some(g=>g.name===state.group))state.group='';
      const topics=new Set(D.variables[state.collection].filter(row=>!state.group||row.group===state.group).map(row=>row.topic));
      if(state.topic&&!topics.has(state.topic))state.topic='';
    }else{if(!D.groups[state.collection].some(g=>g.name===state.group))state.group='';state.topic='';}
    if(/^Guide family/.test(state.finalGroup))state.finalGroup=topicLabel(state.finalGroup).replace(/ \(Q[^)]*\)$/,'');
    if(/^Guide family/.test(state.finalFilterGroup))state.finalFilterGroup=topicLabel(state.finalFilterGroup).replace(/ \(Q[^)]*\)$/,'');
    if(/^Display grouping/.test(state.finalGroup))state.finalGroup='';
    if(/^Display grouping/.test(state.finalFilterGroup))state.finalFilterGroup='';
    if(!J.variables[state.id])state.id='';
    if(!['id','label','group','status'].includes(state.sort))state.sort='id';
    state.page=Math.max(1,parseInt(state.page,10)||1);
    state.mode=state.mode==='sankey'?'sankey':'flow';
    if(!['sources','raw','features'].includes(state.finalStep))state.finalStep='sources';
    if(!['Core','Leave-Behind'].includes(state.finalOrigin))state.finalOrigin='Core';
    if(!['All','Core','Leave-Behind'].includes(state.finalCollection))state.finalCollection='All';
    if(!['','mapped','checking','outside'].includes(state.finalFilterMapping))state.finalFilterMapping='';
    state.finalPage=Math.max(1,parseInt(state.finalPage,10)||1);
    if(!window.FINAL_DECISION_DATA?.originalSources.some(row=>row.id===state.finalId)&&!window.FINAL_DECISION_DATA?.rawFields.some(row=>row.id===state.finalId))state.finalId='';
    // Keep old links working without retaining a duplicate Core entry.
    const entryAlias=F.entryAliases?.[state.finalEntry];
    if(entryAlias){state.finalEntry=entryAlias;state.finalCollection='Leave-Behind';state.finalStep='features';state.finalSearch='';state.finalFilterGroup='';state.finalFilterOutput='';state.finalFilterForm='';state.finalFilterCaveat='';}
    if(!window.FINAL_DECISION_DATA?.features.some(row=>row.entryId===state.finalEntry))state.finalEntry='';
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
  function source(path){ return ''; }

  function decisionLink(path,label){ return ''; }

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
  function children(key){return (currentStageIds.has(key)?currentLinks:J.links).filter(l=>l.source===key).map(l=>N[l.target]);}
  function sideBranches(key,keys){
    if(keys.length<2)return keys.map(x=>button(x,true)).join('');
    const open=state.expanded.split(',').includes(key);
    return `<button class="branch-button" data-expand="${key}" aria-expanded="${open}" aria-controls="branches-${key}">${open?'−':'+'} ${num(keys.reduce((sum,k)=>sum+N[k].count,0))} variables held outside at this step · ${keys.length} decisions</button><div id="branches-${key}" class="side-list" ${open?'':'hidden'}>${keys.map(x=>button(x,true)).join('')}</div>`;
  }
  function flow(){
    return `<p class="mode-note">Select a stage to read its explanation below.</p>
      <div class="flow-review"><section class="flow-step"><h2 class="journey-step">1. Choose survey variables for review</h2><div class="milestones"><div class="stage-row"><div>${button('universe')}</div><div class="side-list">${button('outside_measure_review',true)}${outsideReasonsLink()}</div></div><p class="connector" aria-hidden="true">↓</p>${button('measure_review')}</div></section>
      <p class="connector between-steps" aria-hidden="true">↓</p><section class="flow-step"><h2 class="journey-step">2. Decide how each variable is used</h2><div class="lane-grid"><section class="lane core-lane"><h3>Core section</h3>${button('reviewed_core')}<p class="connector" aria-hidden="true">↓</p>${button('used_core')}<div class="side-list">${button('checking_only',true)}${button('core_not_selected',true)}</div></section><section class="lane lb-lane"><h3>LB section</h3>${button('reviewed_lb')}<p class="connector" aria-hidden="true">↓</p>${button('used_lb')}${button('lb_not_selected',true)}</section></div><p class="summary-line">546 represented + 3 checking-only + 37 not selected = 586 reviewed survey variables.</p></section></div><p class="connector between-steps" aria-hidden="true">↓</p>
      <section class="flow-step flow-construction"><h2 class="journey-step">3. Construct the planned measures</h2><div class="measure-transition">${button('creating_measures',true)}<p>Retain individual answers, use RAND representations, or combine answers into scores.</p><p class="count-boundary"><strong>Survey variables → planned measures</strong><br>This changes how information is represented; it is not another exclusion step.</p></div><div class="lane-grid"><section class="lane core-lane"><h3>Core section</h3>${button('core_measures')}</section><section class="lane lb-lane"><h3>LB section</h3>${button('lb_measures')}</section></div><p class="connector" aria-hidden="true">↓</p><div class="journey-endpoint">${button('planned_measures')}<p>126 Core + 118 LB = 244 distinct measures. Life satisfaction is counted only in the LB section.</p><button class="plain-button" data-open-measures="all">Browse all 244 measure entries →</button></div></section>`;
  }
  function outsideReasonsLink(){return `<a class="journey-reasons-link" href="#stage=outside_measure_review" data-outside-reasons>See recorded decisions and reasons for the ${num(N.outside_measure_review.count)} variables →</a>`;}
  function sankey(){
    // One diagram; source-variable ribbons conserve counts. Measure ribbons have a
    // separate, explicitly labelled scale beyond the representation boundary.
    const sourceScale=430/N.universe.count,measureScale=280/N.planned_measures.count;
    const coreColor='#789ac3',lbColor='#7c927b',otherColor='#aeb6c4';
    const geometry={universe:[20,120,N.universe.count*sourceScale],measure_review:[250,120,N.measure_review.count*sourceScale],outside_measure_review:[250,225,N.outside_measure_review.count*sourceScale],reviewed_core:[460,125,N.reviewed_core.count*sourceScale],reviewed_lb:[460,310,N.reviewed_lb.count*sourceScale],used_core:[665,125,N.used_core.count*sourceScale],used_lb:[665,310,N.used_lb.count*sourceScale],checking_only:[665,208,N.checking_only.count*sourceScale],measure_out:[665,278,N.measure_out.count*sourceScale],creating_measures:[865,185,N.creating_measures.count*sourceScale],core_measures:[1100,120,N.core_measures.count*measureScale],lb_measures:[1100,350,N.lb_measures.count*measureScale],planned_measures:[1330,230,N.planned_measures.count*measureScale]};
    const links=[
      ['universe','measure_review',N.measure_review.count,0,0,coreColor],
      ['universe','outside_measure_review',N.outside_measure_review.count,N.measure_review.count,0,otherColor],
      ['measure_review','reviewed_core',N.reviewed_core.count,0,0,coreColor],
      ['measure_review','reviewed_lb',N.reviewed_lb.count,N.reviewed_core.count,0,lbColor],
      ['reviewed_core','used_core',N.used_core.count,0,0,coreColor],
      ['reviewed_core','checking_only',N.checking_only.count,N.used_core.count,0,otherColor],
      ['reviewed_core','measure_out',N.core_not_selected.count,N.used_core.count+N.checking_only.count,0,otherColor],
      ['reviewed_lb','used_lb',N.used_lb.count,0,0,lbColor],
      ['reviewed_lb','measure_out',N.lb_not_selected.count,N.used_lb.count,N.core_not_selected.count,otherColor],
      ['used_core','creating_measures',N.used_core.count,0,0,coreColor],
      ['used_lb','creating_measures',N.used_lb.count,0,N.used_core.count,lbColor],
      ['core_measures','planned_measures',N.core_measures.count,0,0,coreColor],
      ['lb_measures','planned_measures',N.lb_measures.count,0,N.core_measures.count,lbColor]
    ];
    const ancestors=new Set([state.stage]);let changed=true;
    const logical=[...links.map(l=>[l[0],l[1]]),['creating_measures','core_measures'],['creating_measures','lb_measures']];
    while(changed){changed=false;for(const [a,b] of logical)if(ancestors.has(b)&&!ancestors.has(a)){ancestors.add(a);changed=true;}}
    const bands=links.map(([a,b,count,fromOffset,toOffset,color])=>{
      const scale=N[a].unit?measureScale:sourceScale,[ax,ay]=geometry[a],[bx,by]=geometry[b],x0=ax+16,x1=bx,sy=ay+fromOffset*scale,ty=by+toOffset*scale,h=count*scale,m=(x0+x1)/2;
      return `<g role="button" tabindex="0" data-stage="${b}" aria-label="${e(N[a].label)} to ${e(N[b].label)}: ${num(count)} ${N[a].unit||'survey variables'}"><title>${e(N[a].label)} → ${e(N[b].label)}: ${num(count)} ${N[a].unit||'survey variables'}</title><path class="journey-ribbon ${ancestors.has(a)&&ancestors.has(b)?'on-path':''}" d="M${x0} ${sy} C${m} ${sy} ${m} ${ty} ${x1} ${ty} L${x1} ${ty+h} C${m} ${ty+h} ${m} ${sy+h} ${x0} ${sy+h}Z" fill="${color}"/></g>`;
    }).join('');
    const bars=Object.entries(geometry).map(([id,[x,y,h]])=>`<rect x="${x}" y="${y}" width="16" height="${h}" fill="${id==='planned_measures'?'#355a8a':id.includes('lb')?lbColor:id.includes('core')?coreColor:otherColor}"/>`).join('');
    const card=(id,x,y,w,lines)=>`<g class="journey-sankey-card ${id.includes('lb')?'lb-node':''} ${state.stage===id?'selected':''}" role="button" tabindex="0" data-stage="${id}" aria-pressed="${state.stage===id}" aria-label="${e(N[id].label)}, ${num(N[id].count)} ${N[id].unit||'survey variables'}"><rect x="${x}" y="${y}" width="${w}" height="${42+lines.length*18}" rx="8"/><text x="${x+12}" y="${y+25}" class="journey-sankey-count">${num(N[id].count)}</text>${lines.map((line,i)=>`<text x="${x+12}" y="${y+46+i*18}" class="journey-sankey-label">${e(line)}</text>`).join('')}</g>`;
    const cards=[card('universe',10,35,205,['Survey variables']),card('measure_review',240,35,195,['Reviewed variables']),card('outside_measure_review',240,635,280,['Outside this reviewed list']),card('reviewed_core',450,35,180,['Core section']),card('reviewed_lb',450,225,180,['LB section']),card('used_core',650,35,205,['Core represented']),card('used_lb',650,350,205,['LB represented']),card('checking_only',650,145,205,['Checking only']),card('measure_out',650,225,205,['Not selected: 36 Core + 1 LB']),card('core_measures',1090,35,205,['Core measures']),card('lb_measures',1090,500,205,['LB measures']),card('planned_measures',1320,130,240,['Planned measures'])].join('');
    return `<p class="mode-note">Select a count or ribbon to read its explanation below. Band width represents variable count on the left and measure-entry count on the right; each counting unit has its own scale.</p><div class="sankey-scroll" tabindex="0" role="region" aria-label="Proportional flow diagram; scroll horizontally on narrow screens"><svg class="journey-sankey" viewBox="0 0 1580 725" role="group" aria-label="Complete selection pathway from ${num(N.universe.count)} survey variables to ${num(N.planned_measures.count)} measure entries"><text x="10" y="20" class="sankey-head">Survey-variable counts</text><text x="1090" y="20" class="sankey-head">Measure-entry counts</text>${bands}${bars}<g class="journey-transition-card ${state.stage==='creating_measures'?'selected':''}" role="button" tabindex="0" data-stage="creating_measures" aria-label="Creating measures: ${num(N.creating_measures.count)} survey variables represented in ${num(N.planned_measures.count)} measure entries"><rect x="905" y="90" width="165" height="380" rx="8"/><text x="917" y="128" class="sankey-head">Creating measures</text><text x="917" y="168" class="journey-sankey-label"><tspan x="917">Retain answers,</tspan><tspan x="917" dy="21">use RAND, or</tspan><tspan x="917" dy="21">combine answers.</tspan><tspan x="917" dy="48">${num(N.creating_measures.count)} variables</tspan><tspan x="917" dy="26" class="journey-count-arrow">↓</tspan><tspan x="917" dy="26">${num(N.planned_measures.count)} measure entries</tspan><tspan x="917" dy="48">Counting unit</tspan><tspan x="917" dy="21">and scale change.</tspan><tspan x="917" dy="34">Not an exclusion.</tspan></text></g><path class="journey-construction-link" d="M881 203H905 M1070 240H1080V192H1100 M1080 240V417H1100"/>${cards}<text x="1320" y="550" class="journey-sankey-label"><tspan x="1320">126 Core + 118 LB</tspan><tspan x="1320" dy="22">244 distinct measures</tspan><tspan x="1320" dy="22">Life satisfaction: LB only</tspan></text></svg></div><div class="journey-links">${outsideReasonsLink()}<button class="plain-button" data-open-measures="all">Browse all 244 measure entries →</button></div><p class="summary-line">Thin ribbons show genuine small counts. Dashed connectors indicate measure construction, not exclusion.</p>`;
  }
  function rationaleExamples(){
    const examples=[['lb:001','Why use RAND?','Five life-satisfaction answers are represented by one RAND scale.'],['lb:026','Why use a guide-defined score?','The HRS guide specifies a positive-support mean for one relationship group.'],['core:009','Why use a published construction?','Three physical-activity frequencies become one weighted index.'],['core:067','Why combine a screen and its follow-up?','Usual-place presence and type become one categorical measure.']];
    return `<section class="journey-rationales"><h3>The scientific reasons behind the counts</h3><p>Combining answers is not simply deleting variables. Read why a representation was selected, what it loses, and whether its rule comes from the HRS guide, a publication or a project decision.</p><div class="rationale-example-grid">${examples.map(([id,title,text])=>`<article><h4>${e(title)}</h4><p>${e(text)}</p><button class="variable-button" data-open-rationale="${id}">Read the rationale and evidence →</button></article>`).join('')}</div><p class="subtle">Every measure entry has an explanation or an explicit evidence gap. A DOI supports the stated part of a decision, not necessarily its exact formula. Counts remain provisional measurement entries, not final fitted-model predictors.</p></section>`;
  }
  function evidence(){const n=N[state.stage],ch=children(n.id),counts={};
    if(n.id==='measure_out')return `<aside class="evidence-panel" aria-live="polite"><p class="eyebrow">Selected decision</p><h2>Not selected for planned measures</h2><p class="evidence-count">${num(n.count)} <span class="subtle">reviewed survey variables</span></p><p>36 Core + 1 LB = 37 not selected within the 586-variable reviewed list. This is separate from the 5,916 variables outside that list.</p><p>Read each current PI decision and its reason:</p><div class="side-list"><button class="plain-button" data-show-exclusions>Read the 36 Core decisions and reasons →</button><button class="plain-button" data-show-lb-exclusions>Read the LB decision for OLB001A →</button></div><p>The list below names all 37 variables. The linked reasons do not imply that raw data columns were deleted.</p></aside>`;
    if(n.unit||n.id==='creating_measures'||n.id==='outside_measure_review'){
      const equation=n.id==='planned_measures'?'126 Core + 118 LB = 244 distinct measures. Life satisfaction is counted only in the LB section.':n.id==='creating_measures'?'172 Core + 374 LB = 546 represented survey variables. The resulting inventory lists 126 Core + 118 LB = 244 measure entries.':n.id==='outside_measure_review'?'6,502 survey variables − 586 in the current reviewed list = 5,916.':null;
      return `<aside class="evidence-panel" aria-live="polite"><p class="eyebrow">Selected stage / decision</p><h2>${e(n.label)}</h2><p class="evidence-count">${num(n.count)} <span class="subtle">${n.unit||'survey variables'}</span></p><p>${e(n.reason)}</p>${equation?`<p class="summary-line">${e(equation)}</p>`:''}${n.id==='creating_measures'?'<p class="journey-example">Example: five LB life-satisfaction answers (OLB002A–OLB002E) are represented by R12LBSATWLF. Their information is summarized, not discarded.</p>':''}${n.id==='outside_measure_review'?outsideReasonsLink():decisionLink(n.source)}${n.unit?'<p>Select a measure entry below to open its scientific rationale, evidence and detailed construction instructions. Pending instructions and data-availability limitations remain visible.</p>':'<p>The searchable list below preserves each variable and its recorded decisions.</p>'}</aside>`;
    }
    if(n.id==='initial_out')n.ids.forEach(id=>{const r=J.variables[id].history.find(h=>h.stage===n.id).rationale;counts[r]=(counts[r]||0)+1;});
    return `<aside class="evidence-panel"><p class="eyebrow">Selected stage / decision</p><h2>${e(n.label)}</h2><p style="font-size:32px;margin-bottom:8px">${num(n.count)} <span class="subtle">unique variables</span></p><p>${e(n.reason)}</p>${ch.length?`<h3>Count reconciliation</h3><p>${num(n.count)} = ${ch.map(x=>num(x.count)).join(' + ')}</p><div class="side-list">${ch.map(x=>button(x.id,true)).join('')}</div>`:''}${n.kind==='unresolved'?'<p class="warning">The variable identities are verified. The unresolved scientific or workflow decision remains visible.</p>':''}${n.id==='low'?`<p class="warning">Causal explanations remain unresolved. Assess conditional follow-up, restricted eligibility, repeated components, prior-wave availability, and eligible nonresponse using the individual codebook record.</p><p class="summary-line">${num(J.validation.lowCoverageCodebookEntries)} matched codebook entries; ${num(J.validation.conditionalWordingContextOnly)} with explicit conditional wording. No redundancy classifications have been inferred.</p>`:''}${n.collection?`<p><button class="plain-button" data-collection="${e(n.collection)}">Explore ${e(n.collection)} flower →</button></p>`:''}<div class="sources">${source(n.source)}</div>${Object.keys(counts).length?`<details><summary>Documentary rationale breakdown</summary>${Object.entries(counts).map(([r,c])=>`<p class="reason-counts"><strong>${c}</strong> · ${e(r)}</p>`).join('')}</details>`:''}<p class="summary-line" style="margin-top:18px">The searchable list below contains this stage's variables. Select an ID to see its history.</p></aside>`;
  }
  function stageExplanation(){
    const n=N[state.stage];
    if(!currentStageIds.has(n.id))return evidence();
    let action='';
    if(n.id==='outside_measure_review')action=outsideReasonsLink();
    else if(n.unit)action='<button class="plain-button" data-open-measures="all">Browse all 244 measure entries →</button>';
    else if(n.id==='core_not_selected'||n.id==='measure_out')action='<button class="plain-button" data-show-exclusions>Read the 36 Core decisions and reasons →</button>';
    else if(n.id==='lb_not_selected')action='<button class="plain-button" data-show-lb-exclusions>Read the decision for OLB001A →</button>';
    else if(n.collection)action=`<button class="plain-button" data-collection="${e(n.collection)}">Browse ${n.collection==='Core'?'Core':'LB'} variables →</button>`;
    else if(n.id==='creating_measures')action='<button class="variable-button" data-open-rationale="lb:001">Example: five life-satisfaction answers become one RAND score →</button>';
    if(n.id==='measure_out')action+='<button class="plain-button" data-show-lb-exclusions>Read the LB decision →</button>';
    return `<aside class="evidence-panel" aria-live="polite"><div class="stage-explanation-title"><div><p class="eyebrow">Selected stage</p><h2>${e(n.label)}</h2></div><p class="evidence-count">${num(n.count)} <span>${n.unit||'survey variables'}</span></p></div><p>${e(n.reason)}</p><div class="stage-actions">${action}</div></aside>`;
  }
  function flower(){const groups=D.groups[state.collection],total=D.variables[state.collection].length,max=Math.max(...groups.map(g=>g.count));
    // Similar petal paths, uniformly scaled by sqrt(count), preserve exact area ratios.
    // Use the same full-width proportions for Core and Leave-Behind petals.
    const aspect=1;
    const marks=groups.map((g,i)=>{const a=360*i/groups.length,s=Math.sqrt(g.count/max)*1.4;
      return `<g class="petal ${state.group===g.name?'selected':''}" role="button" tabindex="0" data-group="${e(g.name)}" aria-label="${e(topicLabel(g.name))}, ${g.count} variables, ${g.share}%" transform="translate(260 260) rotate(${a})"><title>${e(topicLabel(g.name))} · ${g.count} variables (${g.share}%)</title><path d="M0 -74 C-44 -99 -51 -166 0 -200 C51 -166 44 -99 0 -74Z" transform="translate(0 ${74*(s-1)}) scale(${s*aspect} ${s})" fill="${['#bad0ed','#dbc3d1','#d3dfc7','#e8d9b7'][i%4]}" stroke="#718298" stroke-width="1"/><circle cx="0" cy="-160" r="${state.collection==='Leave-Behind'?17:24}" fill="transparent"/><text x="0" y="-${90+68*s}" text-anchor="middle" font-size="13" font-weight="800" transform="rotate(${-a},0,-${90+68*s})">${i+1}</text></g>`;}).join('');
    return `<div class="collection-tabs">${['Core','Leave-Behind'].map(c=>`<button data-collection="${c}" class="${c===state.collection?'active':''}" aria-pressed="${c===state.collection}">${c} · ${D.variables[c].length}</button>`).join('')}</div><p class="subtle">Petal area represents full-collection variable count, not importance. Each collection has its own scale; search and filters do not resize petals. Numbered petals match the group list.</p>${state.collection==='Leave-Behind'?'<p class="subtle">The Leave-Behind flower groups related topics under broader subject headings. Select a group, then use the Leave behind section topic menu to narrow the list to one of its original topics.</p>':''}<div class="flower-layout"><div><svg class="flower-svg" viewBox="0 0 520 520" role="group" aria-label="${e(state.collection)} group flower">${marks}<g role="button" tabindex="0" data-group="" aria-label="Show all ${total} ${e(state.collection)} variables"><circle cx="260" cy="260" r="70" fill="#17223b"/><text x="260" y="240" fill="white" text-anchor="middle" font-size="14">${state.collection}</text><text x="260" y="274" fill="white" text-anchor="middle" font-size="30">${total}</text><text x="260" y="295" fill="white" text-anchor="middle" font-size="11">SHOW ALL</text></g></svg></div><div class="flower-groups">${groups.map((g,i)=>`<button class="group-button ${g.name===state.group?'selected':''}" data-group="${e(g.name)}" aria-pressed="${g.name===state.group}"><span class="group-name">${i+1}. ${e(topicLabel(g.name))}</span><span class="group-count">${g.count}</span></button>`).join('')}</div></div>`;
  }
  function listBase(){return state.view==='journey'?N[state.stage].ids.map(id=>J.variables[id]):D.variables[state.collection].map(r=>J.variables[r.id]);}
  function status(v){
    if(state.view==='explore'||['measure_review','reviewed_core','reviewed_lb','used_core','used_lb','measure_out','checking_only','lb_not_selected','core_not_selected'].includes(state.stage))return reviewedById[v.id]?.analysisCategory==='checking'?'Used only for checking or interpretation':reviewedById[v.id]?.analysisCategory==='represented'?'Kept':state.view==='explore'?'Not used in planned measures':'Set aside';
    const event=v.history.find(h=>h.stage===state.stage);
    return event?friendlyDisposition(event.stage,event.disposition):'Unclear';
  }
  const useLabels={
    individual:'Used as an individual measure',
    rand:'Represented by a RAND measure',
    combined:'Combined to create a measure'
  };
  function uses(v){
    const row=reviewedById[v.id];
    if(!row?.inCorrespondence)return [];
    const result=new Set();
    if(row.relationshipRoles.includes('selected raw output'))result.add('individual');
    for(const edge of F.relationships.filter(edge=>edge.rawId===v.id)){
      const feature=F.features.find(feature=>feature.entryId===edge.entryId);
      if(!feature||!['scoring/construction input','represented source/counterpart','related substitute'].includes(edge.role))continue;
      // A comparison mention alone is not a RAND replacement or a scoring input.
      if(feature.randOutput||feature.randInputs.length)result.add('rand');
      const inputs=feature.rawReferences.filter(input=>input.role==='scoring/construction input');
      if(edge.role==='scoring/construction input'&&(new Set(inputs.map(input=>input.id)).size>1||feature.randInputs.length>1))result.add('combined');
    }
    return [...result];
  }
  function topicLabel(name){
    const ranges=String(name||'').match(/^Display grouping — Q0?(\d+)–Q0?(\d+)/);
    if(ranges)return 'Questions '+Number(ranges[1])+'–'+Number(ranges[2]);
    const topics={
      'Loneliness':'Loneliness (Q19)',
      'Guide family — Q18F Q18K optimism pessimism':'Optimism and pessimism (Q18)',
      'Guide family — Q19 loneliness':'Loneliness (Q19)',
      'Guide family — Q20 neighborhood disorder neighborhood social cohesion':'Neighborhood conditions and social cohesion (Q20)',
      'Guide family — Q26 positive and negative affect':'Positive and negative emotions (Q26)',
      'Guide family — Q28 self perceptions of aging subjective age satisfaction with aging attitudes toward own':'Perceptions of aging (Q28)',
      'Guide family — Q29 Q30 perceived everyday discrimination':'Everyday discrimination (Q29–30)',
      'Guide family — Q3 Q17 social network social integration relationship quality social support':'Social relationships and support (Q3–17)',
      'Guide family — Q30 attributions of everyday discrimination':'Reasons for perceived discrimination (Q30)',
      'Guide family — Q31 the big 5 personality traits':'Personality traits (Q31)',
      'Guide family — Q32A need for cognition':'Enjoyment of thinking (Q32A)',
      'Guide family — Q33 purpose in life psychological well being eudaimonic well being':'Purpose in life (Q33)',
      'Guide family — Q34 domain specific satisfaction':'Satisfaction with different areas of life (Q34)'
    };
    return topics[name]||name;
  }

  function listRows(){const q=state.q.toLowerCase().trim();return listBase().filter(v=>(!q||`${v.id} ${v.label} ${state.view==='journey'&&state.stage==='outside_measure_review'?outsideEvents[v.id]?.rationale||'':''}`.toLowerCase().includes(q))&&(!state.status||status(v)===state.status)&&(!state.project||uses(v).includes(state.project))&&(state.view!=='journey'||state.stage!=='outside_measure_review'||!state.reason||outsideEvents[v.id]?.stage===state.reason)&&(state.view!=='explore'||!state.group||v.current.group===state.group)&&(state.view!=='explore'||state.collection!=='Leave-Behind'||!state.topic||v.current.topic===state.topic)).sort((a,b)=>String(state.sort==='status'?status(a):state.sort==='group'?a.current?.topic||a.current?.group||a.section:a[state.sort]).localeCompare(String(state.sort==='status'?status(b):state.sort==='group'?b.current?.topic||b.current?.group||b.section:b[state.sort]),undefined,{numeric:true}));}
  function options(values,selected){return '<option value="">All</option>'+[...new Set(values.filter(Boolean))].sort().map(v=>`<option ${v===selected?'selected':''} value="${e(v)}">${e(v)}</option>`).join('');}
  function journeyMeasureTable(){
    const n=N[state.stage],q=state.q.toLowerCase().trim(),rows=n.entries.filter(row=>!q||`${row.entryId} ${row.label} ${row.sourceDescription} ${row.construction}`.toLowerCase().includes(q)),pages=Math.max(1,Math.ceil(rows.length/50)),page=Math.min(state.page,pages),slice=rows.slice((page-1)*50,page*50);
    return `<section class="inventory journey-measure-list"><h2>${e(n.label)} — ${num(n.count)} entries</h2><label class="control">Search measures and inputs<input id="search" type="search" value="${e(state.q)}" placeholder="Search a measure or survey variable…"></label><p class="summary-line">${num(rows.length)} visible / ${num(n.count)} measure entries. 126 Core + 118 LB = 244 distinct measures, each listed once.</p><table><thead><tr><th>Entry</th><th>Measure</th><th>Survey variables represented</th><th>How it is made</th></tr></thead><tbody>${slice.length?slice.map(row=>`<tr><td><button class="variable-button" data-open-measure="${e(row.entryId)}">${e(row.entryId)}</button></td><td>${e(row.label)}</td><td>${e(row.sourceDescription)}</td><td>${e(row.construction)}${row.caveat?`<p class="summary-line">${e(row.caveat)}</p>`:''}</td></tr>`).join(''):'<tr><td colspan="4">No measures match this search.</td></tr>'}</tbody></table><div class="pager"><button data-page="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>Page ${page} of ${pages} · up to 50 entries</span><button data-page="${page+1}" ${page>=pages?'disabled':''}>Next</button></div><button class="plain-button" data-open-measures="all">Open the full measure inventory →</button></section>`;
  }
  function outsideReasonsTable(){
    const rows=listRows(),pages=Math.max(1,Math.ceil(rows.length/50)),page=Math.min(state.page,pages),slice=rows.slice((page-1)*50,page*50);
    return `<section class="inventory outside-reasons" id="outsideReasons" aria-labelledby="outsideReasonsTitle"><h2 id="outsideReasonsTitle" tabindex="-1">Recorded decisions and reasons for ${num(N.outside_measure_review.count)} variables</h2><p>These variables are outside the current 586-variable reviewed list. They were <strong>not all excluded for the same reason</strong>: the records also contain deferrals, supporting information, and unresolved decisions. Each row shows the latest recorded historical review step; open a variable for its full history.</p><div class="filter-grid"><label>Search variable, label, or reason<input id="search" type="search" value="${e(state.q)}" placeholder="Search the recorded reasons…"></label><label>Recorded review decision<select id="reasonFilter"><option value="">All ${num(N.outside_measure_review.count)} variables</option>${Object.entries(outsideReasonCounts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>`<option value="${key}" ${state.reason===key?'selected':''}>${e(outsideReasonLabels[key]||'No decision supplied')} · ${num(count)}</option>`).join('')}</select></label><label>Sort<select id="sortFilter">${['id','label','group'].map(key=>`<option value="${key}" ${state.sort===key?'selected':''}>${key==='group'?'Section':key==='id'?'Variable name':'Label A–Z'}</option>`).join('')}</select></label></div><p class="summary-line" aria-live="polite">${num(rows.length)} visible / ${num(N.outside_measure_review.count)} variables. The decision-group counts are calculated from these exact variables, not copied from earlier full-stage totals.</p><div class="reason-table-scroll"><table><thead><tr><th>Variable</th><th>Label / section</th><th>Recorded decision</th><th>Recorded reason and evidence</th></tr></thead><tbody>${slice.length?slice.map(v=>{const event=outsideEvents[v.id];return `<tr><td><button class="variable-button" data-variable="${e(v.id)}">${e(v.id)}</button></td><td>${e(v.label)}<br><small>${e(v.section==='LB'?'LB section':'Core section '+v.section)}</small></td><td>${e(outsideReasonLabels[event?.stage]||event?.label||'No decision supplied')}</td><td>${e(event?.rationale||'No variable-level reason was supplied; no reason is inferred.')}<p>${decisionLink(event?.source)}</p></td></tr>`;}).join(''):'<tr><td colspan="4">No variables match. Clear the search or decision filter.</td></tr>'}</tbody></table></div><div class="pager"><button data-page="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>Page ${page} of ${pages} · up to 50 variables</span><button data-page="${page+1}" ${page>=pages?'disabled':''}>Next</button></div></section>`;
  }
  function table(){
    if(state.view==='journey'&&N[state.stage].unit)return journeyMeasureTable();
    if(state.view==='journey'&&state.stage==='outside_measure_review')return outsideReasonsTable();
    const all=listRows(),pages=Math.max(1,Math.ceil(all.length/50)),page=Math.min(state.page,pages),slice=all.slice((page-1)*50,page*50),base=listBase(),scope=state.view==='explore'&&state.group?base.filter(v=>v.current.group===state.group):base,topicScope=state.topic?scope.filter(v=>v.current?.topic===state.topic):scope,topicRows=scope.filter(v=>v.current?.topic).map(v=>v.current.topic),topicFilter=state.view==='explore'&&state.collection==='Leave-Behind'?`<label>Leave behind section topic<select id="topicFilter">${options(topicRows,state.topic)}</select></label>`:'';
    return `<section class="inventory" aria-labelledby="inventoryTitle"><h2 id="inventoryTitle">${state.view==='journey'?e(N[state.stage].label):e(topicLabel(state.group)||state.collection)}${state.topic?' · '+e(topicLabel(state.topic)):''} — variables</h2><div class="filter-grid"><label>Search ID or label<input id="search" type="search" value="${e(state.q)}" placeholder="Search variables…"></label><label>Status<select id="statusFilter">${options(base.map(status),state.status)}</select></label><label>Use in the planned analysis<select id="projectFilter"><option value="">All variables</option>${Object.entries(useLabels).map(([key,label])=>`<option value="${key}" ${state.project===key?'selected':''}>${e(label)}</option>`).join('')}</select></label>${topicFilter}<label>Sort<select id="sortFilter">${['id','label','group','status'].map(k=>`<option value="${k}" ${state.sort===k?'selected':''}>${k==='group'?sectionTopic(state.collection):k.toUpperCase()}</option>`).join('')}</select></label></div><p class="summary-line" aria-live="polite">${num(all.length)} visible / ${num(topicScope.length)} variables in this ${state.topic?'leave behind section topic':state.group?'browse group':'collection'}${state.topic?' · '+e(state.topic):''}</p><table><thead><tr><th scope="col">Variable</th><th scope="col">Source label</th><th scope="col">${sectionTopic(state.collection)}</th><th scope="col">Status</th></tr></thead><tbody>${slice.length?slice.map(v=>`<tr class="${state.id===v.id?'selected':''}"><td><button class="variable-button" data-variable="${e(v.id)}">${e(v.id)}</button></td><td>${e(v.current?.label||v.label)}</td><td>${e(topicLabel(v.current?.topic||v.current?.group||v.section))}</td><td>${e(status(v)||missing)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">No variables match. Clear the search or filters to see more.</td></tr>'}</tbody></table><div class="pager"><button data-page="${page-1}" ${page<=1?'disabled':''}>Previous</button><span>Page ${page} of ${pages} · up to 50 rows</span><button data-page="${page+1}" ${page>=pages?'disabled':''}>Next</button></div></section>`;
  }
  function item(k,v){return `<div class="detail-item"><div class="detail-key">${e(k)}</div><div class="detail-value">${e(v||missing)}</div></div>`;}
  function details(){if(!state.id)return '<section class="detail-wrap empty-detail"><h2>Variable evidence</h2><p>Select a variable ID to inspect its source documentation and audit history.</p></section>';
    const v=J.variables[state.id],r=v.current,c=v.codebookContext;
    const reviewed=reviewedById[v.id],measureRows=(reviewed?.linkedEntryIds||[]).map(id=>F.features.find(row=>row.entryId===id)).filter(Boolean);
    const currentRationale=window.FINAL_DECISION_VIEW.sourceReason(reviewed)+window.FINAL_DECISION_VIEW.measureWhy(measureRows,'data-open-measure');
    let fields=[['Source ID',v.sourceFieldId],['Section',v.section]];
    if(r){if(r.collection==='Leave-Behind')fields.push(['Broader browsing group',r.group],[sectionTopic(r.collection),topicLabel(r.topic||r.group)],['How this group is used','Questions are grouped here to make browsing easier. The broader group does not define a combined score.']);else fields.push([sectionTopic(r.collection),topicLabel(r.group)],['How these questions are organized',r.assignmentStatus==='DISPLAY_GROUPING_Q_RANGE'||r.assignmentStatus==='DISPLAY_GROUP_ONLY'?'Listed together by question number. These questions do not necessarily measure the same topic or form a combined score.':r.groupEvidence]);fields.push(['Use in the planned analysis',uses(v).map(key=>useLabels[key]).join('; ')|| (reviewedById[v.id]?.inCorrespondence?'Used to check or interpret responses; see the measure details.':'Not used in planned measures')]);if(r.collection==='Core')fields.push(['Crosswalk status',r.crosswalkStatus],['RAND counterpart(s)',r.randCounterpart],['Meaning and limitations',r.matchMeaning],['Detailed source meaning',r.detailedMeaning],['Observed valid',r.observedValid],['Unobserved % (mechanical complement)',r.missingPct]);else fields.push(['Guide status',r.guideStatus],['Guide rule type',r.guideRuleType],['Explicit instruction',r.explicitInstruction],['Target rule',r.targetRule],['Condition / boundary',r.conditionBoundary],['PDF pages',r.pdfPages]);}
    return `<section class="detail-wrap" id="variableEvidence" aria-labelledby="variableTitle"><div class="toolbar"><h2 id="variableTitle">${e(v.id)} · ${e(r?.label||v.label)}</h2><button data-clear-variable="true">Close detail</button></div>${currentRationale}<div class="detail-grid">${fields.map(([k,val])=>item(k,val)).join('')}</div>${r?`<p>${source(r.sourceRef)} · ${source(r.crosswalkRef||r.guideRef)}</p>`:''}${v.coverage?`<h3>Recorded coverage evidence</h3><div class="detail-grid">${Object.entries(v.coverage).map(([k,val])=>item(k.replaceAll('_',' '),val)).join('')}</div><p>${source(v.coverageSource)}</p>`:''}${v.lowCoverageExplanation?`<p class="warning">${e(v.lowCoverageExplanation)}</p>`:''}${c?.excerpt?`<details><summary>Codebook context${c.conditionalCue?' · conditional wording present':''}</summary><p>${source(c.source+':'+c.line)}</p>${c.conditionalCue?`<p><strong>Conditional wording:</strong> ${e(c.conditionalCue)}</p>`:''}<pre class="codebook-excerpt">${e(c.excerpt)}</pre></details>`:''}<h3>Recorded selection history</h3><ol class="audit-history">${v.history.map(h=>`<li><button class="variable-button" data-stage="${h.stage}">${e(h.label)}</button> <span class="subtle">${e(friendlyDisposition(h.stage,h.disposition))}</span><br>${e(h.rationale)}<br>${source(h.source)}</li>`).join('')}</ol></section>`;
  }
  function mainNavigation(view){
    const tabs=[['journey','How we chose the variables','Review counts and reasons for decisions'],['explore','Browse survey variables','Read questions, meanings, and decisions'],['final','Measures planned for analysis','See measures and how they are calculated']];
    return `<nav class="page-nav" aria-label="Main views">${tabs.map(([key,title,description])=>`<button data-view="${key}" title="${description}" ${view===key?'aria-current="page"':''}><span>${title}</span></button>`).join('')}</nav>`;
  }
  function projectHeading(){
    return '<header class="project-heading"><p class="project-title"><span class="project-prefix">HRS 2014 ·</span> Biopsychosocial Characteristics:<span class="project-subtitle">Variable Selection and Measurement Plan</span></p></header>';
  }
  function detailBreadcrumb(){
    const id=state.finalEntry||state.finalId||state.id;
    const group=state.view==='explore'?state.group:state.view==='final'?state.finalGroup:'';
    if(!id&&!group)return '';
    return `<nav class="breadcrumbs" aria-label="Breadcrumb"><button id="back">← Back</button><span>${e(topicLabel(group)||'Selected item')}${id?' › '+e(id):''}</span></nav>`;
  }
  function render(){
    const isJourney=state.view==='journey';
    if(state.view==='final'){
      root.innerHTML=window.FINAL_DECISION_VIEW.presentationMarkup(`${projectHeading()}${mainNavigation(state.view)}${detailBreadcrumb()}${window.FINAL_DECISION_VIEW.render(state,navigate)}`);
      wire();
      return;
    }
    root.innerHTML=window.FINAL_DECISION_VIEW.presentationMarkup(`${projectHeading()}${mainNavigation(state.view)}${detailBreadcrumb()}<header class="view-heading"><h1>${isJourney?'How we chose the variables':'Browse survey variables'}</h1><p class="lede">${isJourney?'Follow the review decisions and see how survey answers become planned measures. These are measurement plans, not predictors selected by a finished model.':'Browse 211 Core and 375 LB survey variables. Select a topic or variable to read its meaning and review decision.'}</p></header>${isJourney?`<div class="toolbar flow-mode-tabs" aria-label="Flow views"><button data-mode="flow" class="${state.mode==='flow'?'active':''}" aria-pressed="${state.mode==='flow'}">Selection flowchart</button><button data-mode="sankey" class="${state.mode==='sankey'?'active':''}" aria-pressed="${state.mode==='sankey'}">Proportional flow</button><span class="subtle">${state.mode==='flow'?'Review steps and decisions':'Relative counts along the same pathway'}</span></div><div class="journey-layout ${state.mode==='sankey'?'journey-proportional':''}"><section class="journey-graphic" aria-label="Selection flow">${state.mode==='flow'?flow():sankey()}</section>${stageExplanation()}</div>`:flower()}${isJourney?`<details class="rationale-overview"><summary>Examples: why we replace or combine variables</summary>${rationaleExamples()}</details>`:''}${table()}${state.id?details():''}`);
    wire();
  }
  function wire(){
    const inventoryHeading=document.getElementById('inventoryTitle');
    if(inventoryHeading&&state.view==='journey'&&state.stage==='universe')inventoryHeading.setAttribute('data-keep-size','true');
    const all=(q,fn)=>root.querySelectorAll(q).forEach(el=>el.addEventListener('click',fn));
    all('[data-outside-reasons]',ev=>{ev.preventDefault();navigate({view:'journey',stage:'outside_measure_review',reason:'',id:'',q:'',status:'',project:'',page:1});document.getElementById('outsideReasons')?.scrollIntoView({block:'start'});document.getElementById('outsideReasonsTitle')?.focus({preventScroll:true});});
    all('[data-open-measures]',()=>navigate({...defaults,view:'final',finalStep:'features',finalCollection:'All'}));
    all('[data-open-measure]',ev=>{const row=F.features.find(row=>row.entryId===ev.currentTarget.dataset.openMeasure);if(row)navigate({...defaults,view:'final',finalStep:'features',finalCollection:row.collection==='LB'?'Leave-Behind':'Core',finalEntry:row.entryId});});
    all('[data-open-rationale]',ev=>{const row=F.features.find(row=>row.entryId===ev.currentTarget.dataset.openRationale);if(row)navigate({...defaults,view:'final',finalStep:'features',finalCollection:row.collection==='LB'?'Leave-Behind':'Core',finalEntry:row.entryId});});
    all('[data-show-lb-exclusions]',()=>navigate({view:'final',finalStep:'sources',finalOrigin:'Leave-Behind',finalFilterMapping:'outside',finalGroup:'',finalFilterGroup:'',finalSearch:'',finalPage:1,finalId:'',finalEntry:''}));
    all('[data-show-exclusions]',()=>navigate({view:'final',finalStep:'sources',finalOrigin:'Core',finalFilterMapping:'outside',finalGroup:'',finalFilterGroup:'',finalSearch:'',finalPage:1,finalId:'',finalEntry:''}));
    all('[data-view]',ev=>{const view=ev.currentTarget.dataset.view;if(view!==state.view)navigate({...remembered[view]});});
    const backButton=document.getElementById('back');
    if(backButton)backButton.onclick=()=>{if(history.state?.explorer)history.back();else navigate({...defaults});};
    if(state.view==='final'){
      window.FINAL_DECISION_VIEW.wire(root,state,navigate);
      return;
    }
    all('[data-mode]',ev=>navigate({mode:ev.currentTarget.dataset.mode}));
    all('[data-expand]',ev=>{const key=ev.currentTarget.dataset.expand,open=new Set(state.expanded.split(',').filter(Boolean));if(open.has(key))open.delete(key);else open.add(key);navigate({expanded:[...open].join(',')});});
    all('[data-stage]',ev=>navigate({view:'journey',stage:ev.currentTarget.dataset.stage,reason:'',id:'',q:'',status:'',project:'',page:1}));
    all('[data-collection]',ev=>{const c=ev.currentTarget.dataset.collection;navigate({view:'explore',collection:c,group:c===state.collection?state.group:'',topic:c===state.collection?state.topic:'',id:'',status:'',project:'',q:'',page:1});});
    all('[data-group]',ev=>navigate({group:ev.currentTarget.dataset.group===state.group?'':ev.currentTarget.dataset.group,topic:'',id:'',page:1}));
    all('[data-variable]',ev=>{navigate({id:ev.currentTarget.dataset.variable});document.getElementById('variableEvidence')?.scrollIntoView({block:'start'});document.getElementById('variableTitle')?.setAttribute('tabindex','-1');document.getElementById('variableTitle')?.focus({preventScroll:true});});
    all('[data-clear-variable]',()=>navigate({id:''}));
    all('[data-page]',ev=>navigate({page:Number(ev.currentTarget.dataset.page)}));
    root.querySelectorAll('svg [role="button"]').forEach(el=>el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}));
    const search=document.getElementById('search');search.oninput=ev=>{const pos=ev.target.selectionStart;navigate({q:ev.target.value,page:1},true);const next=document.getElementById('search');next.focus();next.setSelectionRange(pos,pos);};
    ['status','project','sort','topic','reason'].forEach(k=>{const control=document.getElementById(k+'Filter');if(control)control.onchange=ev=>navigate({[k]:ev.target.value,page:1});});
  }
  addEventListener('popstate',()=>{readState();render();});
  addEventListener('hashchange',()=>{readState();render();});
  readState();render();
})();
