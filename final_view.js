/* Final-decision views for the existing local explorer. */
(() => {
  'use strict';
  // Decision 3 defines G01 as a four-answer count, not a single raw response.
  // Normalize this presentation classification without mutating the source bundle.
  const F = { ...window.FINAL_DECISION_DATA, features: window.FINAL_DECISION_DATA.features.map(row => {
    // Reader-facing wording omits internal approval/checking instructions.
    const cleanConstruction = text => String(text || '').replace(/; pending overlap review\./g, '.');
    row = { ...row, construction: cleanConstruction(row.construction),
      measureExplanation: { ...row.measureExplanation, alignment: '',
        items: (row.measureExplanation?.items || []).map(item => ({ ...item, operationalization: cleanConstruction(item.operationalization).replace('; no additional transformation is authorized.', '.') })),
        finalConstruction: cleanConstruction(row.measureExplanation?.finalConstruction),
        implementation: String(row.measureExplanation?.implementation || '').replace('; this display does not authorize a new transformation.', '.'),
      },
    };
    // The user's completed-review decision supersedes these legacy review flags.
    if (row.scientificRationale?.status.includes('detailed feature decision still pending')) {
      row = { ...row, caveat: ['Overlap review remains pending.', 'The source-coded entry remains pending review.'].includes(row.caveat) ? '' : row.caveat, scientificRationale: { ...row.scientificRationale,
        status: 'Retained in the measurement plan as specified.',
        why: 'Retained in the measurement plan as specified.',
        limits: row.scientificRationale.limits.filter(limit => ![
          'Do not interpret a place in the 244-measure inventory as a completed age-eligibility, redundancy, scoring, or model-pool approval.',
          'Overlap review remains pending.',
          'The source-coded entry remains pending review.',
        ].includes(limit)),
      } };
    }
    return row.entryId === 'lb:025' ? {
    ...row, outputType: 'project-derived', displayMethod: 'combined-answers',
    measureExplanation: { ...row.measureExplanation, implementation: 'Calculate the relationship-category count from the four original survey responses, following the recorded applicability and missing-response rules.' },
  } : row;
  }) };
  const D = window.FLOWER_DATA;
  const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ESCAPE[char]);
  // Presentation-only terminology; source paths, IDs and filter values stay unchanged.
  function presentationText(value) {
    const caseLike = (original, replacement) => original === original.toUpperCase()
      ? replacement.toUpperCase()
      : /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    return String(value ?? '')
      .replace(/\bmain[ -]interviews?\b/gi, word => caseLike(word, /s$/i.test(word) ? 'core sections' : 'core section'))
      .replace(/\b(?:leave[ -]behind\s+)?questionnaires?\b/gi, word => caseLike(word, /s$/i.test(word) ? 'leave behind sections' : 'leave behind section'));
  }
  function presentationMarkup(markup) {
    // Exact codebook wording/value labels must remain verbatim even when
    // surrounding navigation uses the project's simpler section vocabulary.
    const quotations = [];
    markup = markup.replace(/<span data-verbatim="true">[\s\S]*?<\/span>/g, quote => `__VERBATIM_${quotations.push(quote)-1}__`);
    return markup.replace(/(^|>)([^<]*)(?=<|$)/g, (_, prefix, text) => prefix + presentationText(text))
      .replace(/(aria-label|title|placeholder)="([^"]*)"/g, (_, attribute, text) => attribute + '="' + presentationText(text) + '"')
      .replace(/__VERBATIM_(\d+)__/g, (_, index) => quotations[Number(index)]);
  }
  const sectionTopic = collection => collection === 'Core' ? 'Core section topic' : 'Leave behind section topic';
  const number = value => Number(value).toLocaleString('en-US');
  const PAGE_SIZE = 50;
  const ORIGINS = ['Core', 'Leave-Behind'];
  const COLORS = ['#bad0ed', '#dbc3d1', '#d3dfc7', '#e8d9b7'];
  const RELATIONSHIP_LABELS = Object.freeze({
    'scoring/construction input': 'Used to calculate or create this measure',
    'selected raw output': 'This variable is the measure',
    'routing/eligibility support': 'Helps determine which responses apply',
    'verification support': 'Used to check the measure',
    'represented source/counterpart': 'Similar or corresponding item shown for comparison',
    'related substitute': 'Related item representing a different measure',
  });

  function relationshipLabel(role) {
    return String(role || '').split('; ').map(part => RELATIONSHIP_LABELS[part] || part).join('; ');
  }

  function outputLabel(value) {
    return ({ RAND: 'RAND-prepared measures', raw: 'Original survey responses', 'project-derived': 'Project-derived measures' })[value] || value;
  }

  function formLabel(value) {
    return ({
      'survey-answer': 'Survey answer',
      'regrouped-answers': 'Answers regrouped',
      'combined-answers': 'Several answers combined',
      'calculated-measurement': 'Calculated measurement',
      'RAND item or recode': 'RAND survey item or recoded value',
      'RAND scale or summary': 'RAND scale or summary value',
      'calculated quantity': 'Calculated quantity',
      'categorical recode': 'Recoded answer categories',
      'project composite or summary': 'Combined or summarized for this project',
      'single item': 'Single survey item',
    })[value] || value;
  }

  function availabilityLabel(value) {
    return ({ PRESENT: 'Present in the prepared data', MISSING_COLUMN: 'Not found in the prepared data', NOT_IN_PREPARED_DATA: 'To be calculated later' })[value] || value || 'Not checked';
  }

  function featureCollectionCode(collection) {
    return collection === 'Leave-Behind' ? 'LB' : collection;
  }

  const categoryLabel = value => ({represented:'Represented in planned measures',checking:'Used only for checking or interpretation','not-selected':'Not selected for planned measures'})[value] || value;
  const representedRows = origin => F.rawFields.filter(row => F.originalSources.find(source => source.id === row.id)?.analysisCategory === 'represented' && (!origin || row.origin === origin));
  function currentRows(state) {
    if (state.finalStep === 'sources') return F.originalSources.filter(row => row.origin === state.finalOrigin);
    if (state.finalStep === 'raw') return representedRows(state.finalOrigin);
    return F.features.filter(row => state.finalCollection === 'All' || row.collection === featureCollectionCode(state.finalCollection));
  }

  function valueForOrigin(collection, step) {
    const counts = F.counts;
    if (step === 'sources') return collection === 'Core' ? counts.originalCore : counts.originalLB;
    if (step === 'raw') return representedRows(collection).length;
    return collection === 'All' ? counts.featureEntryUnion : collection === 'Core' ? counts.featureCoreEntries : counts.featureLBEntries;
  }

  function sourceLinks(){ return ''; }

  function sourceRecordLink(reference,label){
    if(!reference?.path || !/^https:\/\//i.test(reference.path)) return '';
    return '<a href="'+esc(reference.path)+'" target="_blank" rel="noopener">'+esc(label)+'</a>';
  }

  function pathReferenceLink(pathValue, label) {
    if (!pathValue) return '';
    const match = String(pathValue).match(/^(.*):(\d+)$/);
    return sourceRecordLink({ path: match ? match[1] : pathValue, line: match ? Number(match[2]) : null }, label);
  }

  function cards() {
    const c=F.counts;
    return `<div class="final-counts">
      <button class="final-count-card" data-final-step="sources"><strong>${number(c.originalUnion)}</strong><span>Survey variables reviewed</span><small>211 Core · 375 Leave-Behind</small></button>
      <button class="final-count-card" data-final-step="raw"><strong>${number(c.represented)}</strong><span>Represented in planned measures</span><small>172 Core · 374 Leave-Behind</small></button>
      <button class="final-count-card" data-final-step="features"><strong>${number(c.featureEntryUnion)}</strong><span>Measures planned for analysis</span><small>126 Core entries · 118 Leave-Behind entries</small></button>
    </div><p class="additional-note">546 represented + <button class="variable-button" data-final-category="checking">3 checking-only</button> + <button class="variable-button" data-final-exclusions>37 not selected — view reasons</button> = 586 reviewed variables. There are 244 distinct provisional measures: 126 Core and 118 Leave behind. Life satisfaction is listed only in the Leave behind section. OLB001A was removed by the PI on 3 October 2026.</p>`;
  }

  function stepButtons(state) {
    const labels = [
      ['sources', 'Survey variables reviewed · 586'],
      ['raw', 'Represented in planned measures · 546'],
      ['features', 'Measures planned for analysis · 244 entries'],
    ];
    return `<nav class="final-step-tabs" aria-label="Measure and source-variable lists">${labels.map(([key, label]) => `<button data-final-step="${key}" class="${state.finalStep === key ? 'active' : ''}" aria-pressed="${state.finalStep === key}"><span>${label.split(' · ')[0]}</span><strong>${key==='sources'?'586':key==='raw'?'546':'244'}</strong></button>`).join('')}</nav><p class="inventory-accounting">546 represented + <button class="variable-button" data-final-category="checking">3 checking-only</button> + <button class="variable-button" data-final-exclusions>37 not selected — view reasons</button> = 586 reviewed variables.</p>`;
  }

  function collectionTabs(state, step) {
    const selectionKey = step === 'features' ? 'finalCollection' : 'finalOrigin';
    const selection = state[selectionKey];
    return `<div class="collection-tabs" aria-label="${step==='features'?'Measure collection':'Survey section'}">${(step==='features'?['All',...ORIGINS]:ORIGINS).map(origin => `<button data-final-origin="${origin}" class="${selection === origin ? 'active' : ''}" aria-pressed="${selection === origin}">${origin === 'All' ? 'All measures' : origin === 'Core' ? 'Core' : 'Leave-Behind'} · ${number(valueForOrigin(origin, step))}</button>`).join('')}</div>`;
  }

  function stablePetalSvg(state, rows, step) {
    const collection = state.finalOrigin;
    const baseGroups = F.groups.original[collection] || [];
    const rawGroups = baseGroups.map(group => ({...group,count:rows.filter(row=>row.group===group.name).length})).filter(group=>group.count);
    const groupSource = step === 'sources' ? baseGroups : rawGroups;
    const maxCount = Math.max(1, ...baseGroups.map(group => group.count), ...rawGroups.map(group => group.count));
    const marks = groupSource.map((group, index) => {
      const angle = 360 * index / groupSource.length;
      const size = Math.sqrt(group.count / maxCount) * 1.4;
      return `<g class="petal ${state.finalGroup === group.name ? 'selected' : ''}" role="button" tabindex="0" data-final-group="${esc(group.name)}" aria-label="${esc(group.name)}, ${group.count} variables" transform="translate(250 250) rotate(${angle})"><title>${esc(group.name)} · ${group.count} variables</title><path d="M0 -74 C-44 -99 -51 -166 0 -200 C51 -166 44 -99 0 -74Z" transform="translate(0 ${74 * (size - 1)}) scale(${size})" fill="${COLORS[index % COLORS.length]}" stroke="#718298" stroke-width="1"/><text x="0" y="-${90 + 68 * size}" text-anchor="middle" font-size="13" font-weight="800" transform="rotate(${-angle},0,-${90 + 68 * size})">${index + 1}</text></g>`;
    }).join('');
    return `<div class="flower-layout final-flower-layout"><div><svg class="flower-svg" viewBox="0 0 500 500" role="group" aria-label="${esc(collection)} ${step === 'raw' ? 'variables represented in planned measures' : 'survey variables reviewed'} groups">${marks}<g role="button" tabindex="0" data-final-group="" aria-label="Show all ${number(rows.length)} variables"><circle cx="250" cy="250" r="70" fill="#17223b"/><text x="250" y="232" text-anchor="middle" fill="white" font-size="14">${collection === 'Core' ? 'CORE' : 'LB'}</text><text x="250" y="269" text-anchor="middle" fill="white" font-size="29">${number(rows.length)}</text><text x="250" y="291" text-anchor="middle" fill="white" font-size="10">VARIABLES</text></g></svg></div><div class="flower-groups">${groupSource.map((group, index) => `<button class="group-button ${state.finalGroup === group.name ? 'selected' : ''}" data-final-group="${esc(group.name)}" aria-pressed="${state.finalGroup === group.name}"><span class="group-name">${index + 1}. ${esc(group.name)}</span><span class="group-count">${number(group.count)}</span></button>`).join('')}</div></div><p class="mode-note">Each petal represents a topic. Petal size shows how many variables are in that topic. The same size scale is used for both variable lists. Searching or filtering does not change petal size.</p>`;
  }

  function sankey() {
    return `<div class="branch-shortcuts"><button class="branch-button" data-final-category="mapped">546 represented in planned measures</button><button class="branch-button" data-final-category="checking">3 used only for checking or interpretation</button><button class="branch-button" data-final-exclusions>37 not selected for planned measures</button></div><p class="mode-note">These are survey-variable counts, not measure counts. Responses may be retained individually, represented by RAND, or combined into one measure. Checking-only variables are not separate measures or calculation inputs. Each variable appears in exactly one summary category. The list below shows the chosen collection: Core has 36 not-selected variables; Leave-Behind has one.</p>`;
  }

  function sourceGroupBreakdown(state) {
    const origin=state.finalOrigin, groups=F.groups.original[origin]||[], records=F.originalSources.filter(row=>row.origin===origin);
    const columns=[['represented','mapped'],['checking','checking'],['not-selected','outside']];
    const rows=groups.map(group=>{
      const variables=records.filter(row=>row.group===group.name);
      return `<tr><th scope="row"><button class="variable-button" data-final-group="${esc(group.name)}">${esc(group.name)}</button></th><td>${number(variables.length)}</td>${columns.map(([category,branch])=>`<td><button class="branch-count" data-final-flow-group="${esc(group.name)}" data-final-flow-branch="${branch}">${number(variables.filter(row=>row.analysisCategory===category).length)}</button></td>`).join('')}</tr>`;
    }).join('');
    return `<section class="source-group-breakdown"><h2>Survey variables reviewed by topic</h2><p class="subtle">Topics organize questions for browsing; sharing a topic does not mean combining the questions into a score. Select a count to see its variables and decisions.</p><div class="table-wrap"><table><thead><tr><th>${sectionTopic(state.finalOrigin)}</th><th>Variables reviewed</th><th>Represented in planned measures</th><th>Used only for checking or interpretation</th><th>Not selected for planned measures</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function sourceView(state) {
    let rows = currentRows(state);
    if (state.finalGroup) rows = rows.filter(row => row.group === state.finalGroup);
    rows = applySearch(rows, state, 'source');
    const list = listPanel(rows, state, 'source');
    const selected = F.originalSources.find(row => row.id === state.finalId);
    return `${collectionTabs(state, 'sources')}<p class="subtle">Review the survey-variable decisions. Core contains interview responses and measurements; the leave behind section is self-completed. Questions are grouped by topic for browsing. Questions in the same group are not necessarily combined into one measure.</p>${stablePetalSvg(state, F.originalSources.filter(row => row.origin === state.finalOrigin), 'sources')}<details class="topic-count-details"><summary>View counts and decisions by topic</summary>${sourceGroupBreakdown(state)}</details>${list}${selected ? sourceDisposition(selected) : ''}`;
  }

  function rawView(state) {
    let rows = currentRows(state);
    if (state.finalGroup) rows = rows.filter(row => row.group === state.finalGroup);
    rows = applySearch(rows, state, 'raw');
    const selected = F.rawFields.find(row => row.id === state.finalId);
    return `${collectionTabs(state, 'raw')}<p class="subtle">This list shows 546 survey variables represented in the planned measures: 172 Core and 374 Leave-Behind. These include individual responses, RAND representations, and combined-measure inputs. The three checking-only variables are listed separately in Survey variables reviewed.</p>${stablePetalSvg(state, representedRows(state.finalOrigin), 'raw')}${listPanel(rows, state, 'raw')}${selected ? rawDetail(selected) : ''}`;
  }

  function applySearch(rows, state, type) {
    const query = presentationText(state.finalSearch || '').toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(row => {
      if (type === 'feature') {
        const reason = row.scientificRationale;
        const papers = (reason?.publicationKeys || []).map(key => F.publications[key]).filter(Boolean).map(paper => `${paper.citation} ${paper.title} ${paper.doi}`).join(' ');
        const related = `${row.entryId} ${row.label} ${row.slot} ${row.outputColumn || ''} ${row.randOutput || ''} ${(row.randInputs || []).join(' ')} ${(row.rawReferences || []).map(ref => ref.id).join(' ')} ${reason?.why || ''} ${(reason?.basis || []).join(' ')} ${papers}`;
        return presentationText(related).toLowerCase().includes(query);
      }
      const relatedFeatures = (row.linkedEntryIds || []).map(id => F.features.find(feature => feature.entryId === id)?.label || '').join(' ');
      const randNames = (row.linkedEntryIds || []).map(id => F.features.find(feature => feature.entryId === id)).filter(Boolean).flatMap(feature => [feature.randOutput || '', ...(feature.randInputs || []), feature.outputColumn || '', feature.entryId]);
      return presentationText(`${row.id} ${row.label} ${row.group} ${row.roles?.join(' ')} ${row.decisionExplanation?.why || ''} ${row.reason || ''} ${relatedFeatures} ${randNames.join(' ')}`).toLowerCase().includes(query);
    });
  }

  function listPanel(rows, state, type) {
    const isFeature = type === 'feature';
    const records = isFeature ? state.finalCollection : state.finalOrigin;
    const total = valueForOrigin(records, isFeature ? 'features' : state.finalStep);
    const exclusions = type === 'source' && ['outside','checking'].includes(state.finalFilterMapping);
    const header = isFeature ? ['Measure number', 'Measure name', 'Where it comes from', 'How the measure is made'] : ['Variable name', 'Meaning', 'Topic', 'Decision'];
    if (exclusions) header.push('Reason', 'Decision record');
    const sortValues = isFeature ? ['entryId', 'label', 'outputType'] : ['id', 'label', 'group'];
    const groupNames = [...new Set(rows.map(row => row.group))].sort();
    const methods = ['survey-answer', 'regrouped-answers', 'combined-answers', 'calculated-measurement'].filter(value => F.features.some(row => (records==='All'||row.collection === featureCollectionCode(records)) && row.displayMethod === value));
    const featureControls = isFeature ? `<label>Where the measure comes from<select data-final-filter="output"><option value="">All sources</option>${['raw', 'RAND', 'project-derived'].map(value => `<option value="${value}" ${state.finalFilterOutput === value ? 'selected' : ''}>${esc(outputLabel(value))}</option>`).join('')}</select></label><label>How the measure is made<select data-final-filter="form"><option value="">All methods</option>${methods.map(value => `<option value="${value}" ${state.finalFilterForm === value ? 'selected' : ''}>${esc(formLabel(value))}</option>`).join('')}</select></label><label>Instructions or limitations<select data-final-filter="caveat"><option value="">All measures</option><option value="yes" ${state.finalFilterCaveat === 'yes' ? 'selected' : ''}>Has recorded instructions or limitations</option><option value="no" ${state.finalFilterCaveat === 'no' ? 'selected' : ''}>No instructions or limitations recorded</option></select></label>` : `<label>Topic<select data-final-filter="group"><option value="">All topics</option>${groupNames.map(name => `<option value="${esc(name)}" ${state.finalFilterGroup === name || state.finalGroup === name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>${type === 'source' ? `<label>Review decision<select data-final-filter="mapping"><option value="">All reviewed variables</option><option value="mapped" ${state.finalFilterMapping === 'mapped' ? 'selected' : ''}>Represented in planned measures</option><option value="checking" ${state.finalFilterMapping === 'checking' ? 'selected' : ''}>Used only for checking or interpretation</option><option value="outside" ${state.finalFilterMapping === 'outside' ? 'selected' : ''}>Not selected for planned measures</option></select></label>` : `<label>Available in the prepared data?<select data-final-filter="availability"><option value="">All variables</option><option value="PRESENT" ${state.finalFilterAvailability === 'PRESENT' ? 'selected' : ''}>Yes</option><option value="MISSING_COLUMN" ${state.finalFilterAvailability === 'MISSING_COLUMN' ? 'selected' : ''}>No</option></select></label>`}`;
    const sortControls = `<div class="final-filters"><label>Search variable or measure names<input type="search" data-final-search value="${esc(state.finalSearch)}" placeholder="Search names or descriptions…"></label>${featureControls}<label>Sort by<select data-final-filter="sort">${sortValues.map(value => `<option value="${value}" ${state.finalSort === value ? 'selected' : ''}>${value === 'entryId' ? 'Measure number' : value === 'outputType' ? 'Data source' : value === 'label' ? (isFeature ? 'Measure name, A–Z' : 'Meaning, A–Z') : value === 'group' ? 'Topic, A–Z' : 'Variable name'}</option>`).join('')}</select></label><button type="button" class="plain-button" data-final-reset>Clear filters</button></div>`;
    let filtered = rows;
    if (isFeature) {
      if (state.finalFilterOutput) filtered = filtered.filter(row => row.outputType === state.finalFilterOutput);
      if (state.finalFilterForm && methods.includes(state.finalFilterForm)) filtered = filtered.filter(row => row.displayMethod === state.finalFilterForm);
      if (state.finalFilterCaveat) filtered = filtered.filter(row => {
        const hasLimit = Boolean(row.caveat || row.scientificRationale?.limits.length);
        return state.finalFilterCaveat === 'yes' ? hasLimit : !hasLimit;
      });
    } else {
      if (state.finalFilterGroup) filtered = filtered.filter(row => row.group === state.finalFilterGroup);
      if (type === 'raw' && state.finalFilterAvailability) filtered = filtered.filter(row => row.availability === state.finalFilterAvailability);
      if (type === 'source' && state.finalFilterMapping) filtered = filtered.filter(row => row.analysisCategory === ({mapped:'represented',checking:'checking',outside:'not-selected'}[state.finalFilterMapping]));
    }
    const sortKey = sortValues.includes(state.finalSort) ? state.finalSort : sortValues[0];
    filtered = filtered.slice().sort((a, b) => String(a[sortKey] || a.id || '').localeCompare(String(b[sortKey] || b.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
    const searched = applySearch(filtered, state, type);
    const finalPageCount = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
    const finalPage = Math.min(Math.max(1, Number(state.finalPage) || 1), finalPageCount);
    const pageRows = searched.slice((finalPage - 1) * PAGE_SIZE, finalPage * PAGE_SIZE);
    const recordButton = row => isFeature
      ? `<button class="variable-button" data-final-entry="${esc(row.entryId)}">${esc(row.entryId)}</button>`
      : `<button class="variable-button" ${type === 'source' ? 'data-final-source' : 'data-final-raw'}="${esc(row.id)}">${esc(row.id)}</button>`;
    const rowsHtml = pageRows.length ? pageRows.map(row => `<tr class="${state.finalEntry===row.entryId||state.finalId===row.id?'selected':''}"><td>${recordButton(row)}</td><td>${esc(row.label)}</td><td>${isFeature ? esc(outputLabel(row.outputType)) : esc(row.group)}</td><td>${isFeature ? esc(formLabel(row.displayMethod)) : esc(type === 'source' ? categoryLabel(row.analysisCategory) : availabilityLabel(row.availability))}</td>${exclusions ? `<td>${esc(row.reason)}</td><td>${sourceRecordLink(row.reference, 'Read the decision')}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${header.length}" class="empty">No ${isFeature ? 'measures' : 'variables'} match these filters.</td></tr>`;
    const title = isFeature ? `${records} entries in the measure list` : exclusions ? 'Variables not selected for planned measures — reasons' : `${records} ${type === 'source' ? 'survey variables reviewed' : 'variables represented in planned measures'}`;
    return `<section class="inventory final-inventory"><div class="final-list-head"><div><h2>${title}</h2><p class="subtle">${number(searched.length)} shown / ${number(total)} in this group</p>${exclusions ? '<p class="subtle">Each row shows the documented decision. This includes explicit exclusions, alternatives set aside, and details not represented separately.</p>' : ''}</div></div>${sortControls}<div class="table-wrap"><table><thead><tr>${header.map(text => `<th scope="col">${esc(text)}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="pager"><button data-final-page="${finalPage - 1}" ${finalPage <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${finalPage} of ${finalPageCount} · 50 rows per page</span><button data-final-page="${finalPage + 1}" ${finalPage >= finalPageCount ? 'disabled' : ''}>Next</button></div></section>`;
  }

  function sourceDisposition(row) {
    const entries = row.linkedEntryIds.map(id => F.features.find(feature => feature.entryId === id)).filter(Boolean);
    const evidence = [pathReferenceLink(row.sourceRef, 'Survey documentation'), pathReferenceLink(row.crosswalkRef, 'Variable matching documentation'), sourceRecordLink(row.reference, 'Decision record')].filter(Boolean).join(' · ');
    return `<section class="detail-wrap final-detail"><div class="toolbar"><h2>${esc(row.id)} · ${esc(row.label)}</h2><button data-final-clear-selection>Close detail</button></div>${sourceReason(row)}<div class="detail-grid">${detailItem('Where it comes from / topic', esc(`${row.origin} · ${row.group}`))}${detailItem('What this variable contributes', esc(row.relationshipRoles.length ? row.relationshipRoles.map(relationshipLabel).join('; ') : 'No planned measure represents this variable'))}${detailItem('Decision and reason', esc(`${categoryLabel(row.analysisCategory)}. ${row.disposition}. ${row.reason}`))}${detailItem('Decision for planned measures', esc(categoryLabel(row.analysisCategory)))}${detailItem('Measures that use or reference this variable', entries.length ? entries.map(feature => `<button class="variable-button" data-final-entry="${esc(feature.entryId)}">${esc(feature.entryId)} · ${esc(feature.label)}</button>`).join('<br>') : 'No measure currently uses or references this variable.')}</div>${measureWhy(entries)}<p class="source-records">${evidence} · ${sourceLinks()}</p></section>`;
  }

  function rawDetail(row) {
    if (!row) return '';
    const featureList = row.linkedEntryIds.map(id => F.features.find(feature => feature.entryId === id)).filter(Boolean);
    const evidence = [pathReferenceLink(row.sourceRef, 'Survey documentation'), pathReferenceLink(row.crosswalkRef, 'Variable matching documentation'), pathReferenceLink(row.guideRef, 'Leave behind section instructions'), row.reference ? sourceRecordLink(row.reference, 'Measure documentation') : ''].filter(Boolean).join(' · ');
    return `<section class="detail-wrap final-detail"><div class="toolbar"><h2>${esc(row.id)} · ${esc(row.label)}</h2><button data-final-clear-selection>Close detail</button></div><div class="detail-grid">${detailItem('Where it comes from / topic', esc(`${row.origin} · ${row.group}`))}${detailItem('In the prepared data', esc(`${availabilityLabel(row.availability)}${row.datasetName ? ` · ${row.datasetName}` : ''}`))}${detailItem('What this variable contributes', esc(row.roles.map(relationshipLabel).join('; ')))}<div class="detail-item full"><div class="detail-key">Measures that use or reference this variable</div><div class="detail-value">${featureList.map(feature => `<p><button class="variable-button" data-final-entry="${esc(feature.entryId)}">${esc(feature.entryId)} · ${esc(feature.label)}</button><span class="chip">${esc(relationshipLabel(feature.rawReferences.find(ref => ref.id === row.id)?.role || 'documented relationship'))}</span></p>`).join('') || 'No measure currently uses or references this variable.'}</div></div></div>${measureWhy(featureList)}<p class="source-records">${evidence} · ${sourceLinks()}</p></section>`;
  }

  function detailItem(key, value) {
    return `<div class="detail-item"><div class="detail-key">${esc(key)}</div><div class="detail-value">${value}</div></div>`;
  }

  function scientificDetail(feature) {
    const reason = feature.scientificRationale;
    if (!reason) return '<p class="warning">Scientific explanation not supplied. Consult the decision record; do not infer approval from the inventory count.</p>';
    const papers = reason.publicationKeys.map(key => F.publications[key]).filter(Boolean);
    const paymentConstruction = reason.constructionExplanation ? `<div class="rationale-tradeoff"><h4>How this measure was constructed</h4><p>${esc(reason.constructionExplanation)}</p></div>` : '';
    const limits = reason.limits.length ? `<div class="rationale-limits"><h4>What remains uncertain or needs attention</h4><ul>${reason.limits.map(limit => `<li>${esc(limit)}</li>`).join('')}</ul></div>` : '';
    const comparisons = reason.sourceComparisons.length ? `<details class="rationale-sources"><summary>How the original question compares with the selected RAND measure</summary>${reason.sourceComparisons.map(row => `<p><strong>${esc(row.id)}:</strong> ${esc(row.meaning)}</p>`).join('')}<p class="subtle">Item-matching notes do not override the current PI construction or its stated limitations.</p></details>` : '';
    return `<section class="scientific-rationale" aria-label="Scientific rationale"><h3>Why this measure was chosen</h3><div class="rationale-basis">${reason.basis.map(basis => `<span class="chip">${esc(basis)}</span>`).join('')}</div><p class="rationale-why">${esc(reason.why)}</p><div class="rationale-tradeoff"><h4>${paymentConstruction ? 'What the measure captures' : 'What is retained or lost'}</h4><p>${esc(reason.informationLost)}</p></div>${reason.status.includes('pending')?`<p class="rationale-status"><strong>Detailed decision:</strong> ${esc(reason.status)}</p>`:''}${paymentConstruction}${limits}${comparisons}</section>`;
  }
  function publicationDetail(feature){
    const papers=(feature.scientificRationale?.publicationKeys||[]).map(key=>F.publications[key]).filter(Boolean);
    if(!papers.length)return '';
    return `<section class="publication-evidence"><h3>Publication evidence: how it relates to this measure</h3><div class="rationale-publications">${papers.map(paper=>`<article class="publication-card"><p class="publication-citation">${esc(paper.citation)}</p><p>${esc(paper.title)}</p><p class="doi-line"><a href="${esc(paper.doiUrl)}" target="_blank" rel="noopener">DOI: ${esc(paper.doi)}</a></p><p><strong>What it supports:</strong> ${esc(paper.support)}.</p><p>${esc(paper.limits)}</p></article>`).join('')}</div></section>`;
  }

  function measureItems(items, heading) {
    if (!items.length) return '';
    const rows=items.map(item=>{
      const responses=item.responses.length ? `<ul class="response-values">${item.responses.map(value=>`<li><code>${esc(value.value)}</code> = <span data-verbatim="true">${esc(value.meaning)}</span></li>`).join('')}</ul>` : '';
      return `<tr data-measure-item="${esc(item.id)}"><th scope="row" data-label="Variable and label"><button class="variable-button" data-final-raw="${esc(item.id)}">${esc(item.id)}</button><small><span data-verbatim="true">${esc(item.label)}</span></small></th><td data-label="Survey question wording"><span data-verbatim="true">${esc(item.wording)}</span></td><td data-label="Response values and meanings">${item.numericMeaning ? `<p>${esc(item.numericMeaning)}</p>` : ''}${responses}${item.responseNote ? `<p class="subtle">${esc(item.responseNote)}</p>` : ''}</td><td data-label="Planned operationalization">${esc(item.operationalization)}</td></tr>`;
    }).join('');
    return `<section class="measure-item-section"><h3>${esc(heading)}</h3><p class="subtle">Planned operationalization means how responses will be coded and used in the analysis. Survey wording and value labels below are reproduced from the 2014 codebook. Missing and inapplicable answers are not automatically zero.</p><div class="measure-item-table"><table><thead><tr><th scope="col">Variable and label</th><th scope="col">Survey question wording</th><th scope="col">Response values and meanings</th><th scope="col">Planned operationalization</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function sourceReason(row) {
    const reason = row?.decisionExplanation;
    if (!reason || row.analysisCategory === 'represented') return '';
    return `<section class="scientific-rationale source-rationale"><h3>Why this variable is not an independent planned measure</h3><span class="chip">${esc(reason.basis)}</span><p>${esc(reason.why)}</p>${reason.limits.length ? `<ul>${reason.limits.map(limit => `<li>${esc(limit)}</li>`).join('')}</ul>` : ''}<p class="source-records">${reason.references.map(ref => sourceRecordLink(ref, ref.label)).join(' · ')}</p></section>`;
  }

  function measureWhy(features, attribute = 'data-final-entry') {
    if (!features.length) return '';
    return `<section class="measure-rationale-links"><h3>Why the related measures were chosen</h3><p class="subtle">Open a measure for its scientific rationale, what is summarized or omitted, supporting publications and calculation rules.</p>${features.map(feature => `<article><button class="variable-button" ${attribute}="${esc(feature.entryId)}">${esc(feature.entryId)} · ${esc(feature.label)} — read the rationale</button><p>${esc(feature.scientificRationale?.why || 'See the decision record.')}</p></article>`).join('')}</section>`;
  }

  function measureComposition(state) {
    const total = F.features.length;
    const categories = ['raw', 'RAND', 'project-derived'].map(key => ({ key, count: F.features.filter(row => row.outputType === key).length }));
    const button = row => {
      const percent = (100 * row.count / total).toFixed(1);
      return `<button type="button" class="composition-label source-${row.key}" data-measure-source="${row.key}" aria-pressed="${state.finalFilterOutput === row.key}" aria-label="Show ${row.count} ${esc(outputLabel(row.key))}, ${percent} percent of ${total} measures"><span class="composition-name">${esc(outputLabel(row.key))}</span><span class="composition-count">${row.count} <small>(${percent}%)</small></span></button>`;
    };
    let angle = -Math.PI / 2;
    const point = (a,r) => [160 + r*Math.cos(a),160 + r*Math.sin(a)];
    const slices = categories.map(row => {
      const sweep = 2*Math.PI*row.count/total, end = angle+sweep;
      const a=point(angle,136), b=point(end,136), label=point(angle+sweep/2,84);
      const path=`M160 160 L${a[0]} ${a[1]} A136 136 0 ${sweep>Math.PI?1:0} 1 ${b[0]} ${b[1]} Z`;
      angle=end;
      const percent=(100*row.count/total).toFixed(1);
      return `<g class="composition-slice source-${row.key}" role="button" tabindex="0" data-measure-source="${row.key}" data-slice-count="${row.count}" data-slice-angle="${sweep}" aria-pressed="${state.finalFilterOutput===row.key}" aria-label="Show ${row.count} ${esc(outputLabel(row.key))}, ${percent} percent of ${total} measures"><title>${esc(outputLabel(row.key))}: ${row.count} (${percent}%)</title><path d="${path}"/><text x="${label[0]}" y="${label[1]}" text-anchor="middle" dominant-baseline="middle">${percent}%</text></g>`;
    }).join('');
    return `<section class="measure-composition" aria-labelledby="composition-title"><div class="composition-heading"><h2 id="composition-title">How the planned measures are obtained</h2><button type="button" class="plain-button" data-measure-source="" aria-pressed="${!state.finalFilterOutput && state.finalCollection==='All'}">All measures</button></div><p class="subtle">244 distinct planned measures · each counted once by how its final value is obtained.</p><div class="composition-layout"><svg class="composition-pie" viewBox="0 0 320 320" role="group" aria-label="Proportions of all 244 planned measures">${slices}</svg><div class="composition-labels">${categories.map(button).join("")}</div><div class="composition-explanation"><p class="composition-note">Original responses may be recoded. RAND-prepared measures use a delivered RAND variable. Project-derived measures combine answers or calculate a new value, including calculations using RAND inputs.</p><p class="composition-instruction">Click a slice or category to browse its measures. Proportions always describe all 244 measures.</p></div></div></section>`;
  }

  function featureView(state) {
    const collectionRows = F.features.filter(row => state.finalCollection==='All'||row.collection === featureCollectionCode(state.finalCollection));
    let rows = collectionRows;
    rows = applySearch(rows, state, 'feature');
    const selected = F.features.find(row => row.entryId === state.finalEntry);
    const graph = selected || state.finalId ? dependencyMap(selected, state.finalId) : '';
    return `${measureComposition(state)}${collectionTabs(state, 'features')}<p class="subtle">A measure is a value used to describe participants in the age analysis. RAND supplies standardized versions of Health and Retirement Study data. Select a measure to read its rationale, survey questions and calculation rules.</p>${listPanel(rows, state, 'feature')}${graph}${selected ? featureDetail(selected) : state.finalId ? rawDetail(F.rawFields.find(row => row.id === state.finalId)) : ''}`;
  }

  function collapsedMap(state) {
    const c = F.counts;
    return `<section class="dependency-card"><div class="card-head"><div><h2>Which survey variables are used for each measure?</h2><p class="subtle">Choose a measure to see its survey answers, calculation rules, and supporting information.</p></div></div><div class="collapsed-map"><div class="map-column"><h3>Survey variables represented in measures</h3><button data-final-used-origin="Core"><strong>172</strong><span>From core section</span></button><button data-final-used-origin="Leave-Behind"><strong>374</strong><span>From leave behind section</span></button></div><div class="map-arrow" aria-hidden="true">→</div><div class="map-column"><h3>Entries in the measure list</h3><button data-final-collection="Core"><strong>126</strong><span>Core section group</span></button><button data-final-collection="Leave-Behind"><strong>118</strong><span>Leave behind section group</span></button></div></div><div class="edge-legend"><span><i class="edge-solid"></i>Used to calculate the measure or is the measure</span><span><i class="edge-dash"></i>Helps identify, check, or show a corresponding variable</span><span><i class="edge-dot"></i>Related, but a different measure</span></div></section>`;
  }

  function dependencyMap(feature, rawId) {
    let rawRows = [];
    let features = [];
    if (feature) {
      rawRows = feature.rawReferences.map(ref => ({ ...F.rawFields.find(row => row.id === ref.id), role: ref.role })).filter(row => row.id);
      features = [feature];
    } else {
      const raw = F.rawFields.find(row => row.id === rawId);
      if (!raw) return '';
      rawRows = [{ ...raw, role: raw.roles.join('; ') }];
      features = raw.linkedEntryIds.map(id => F.features.find(item => item.entryId === id)).filter(Boolean);
    }
    const height = Math.max(230, Math.max(rawRows.length, features.length) * 36 + 90);
    const rawGap = (height - 70) / Math.max(1, rawRows.length);
    const featureGap = (height - 70) / Math.max(1, features.length);
    const rawNodes = rawRows.map((row, index) => {
      const y = 40 + index * rawGap + 8;
      return `<text x="22" y="${y}" class="map-node-label">${esc(row.id)}</text><text x="22" y="${y + 14}" class="map-node-sub">${esc(relationshipLabel(row.role))}</text>`;
    }).join('');
    const featureNodes = features.map((row, index) => {
      const y = 45 + index * featureGap + 8;
      return `<text x="600" y="${y}" class="map-feature-label">${esc(row.entryId)} · ${esc(row.label)}</text><text x="600" y="${y + 15}" class="map-node-sub">${esc(outputLabel(row.outputType))} · ${esc(formLabel(row.displayMethod))}</text>`;
    }).join('');
    const edges = rawRows.flatMap((raw, rawIndex) => features.map((featureRow, featureIndex) => {
      const role = feature ? raw.role : (featureRow.rawReferences.find(ref => ref.id === raw.id)?.role || 'represented source/counterpart');
      const rawY = 44 + rawIndex * rawGap;
      const featureY = 49 + featureIndex * featureGap;
      const style = role === 'scoring/construction input' || role === 'selected raw output' ? 'dependency-edge solid-edge' : role === 'related substitute' ? 'dependency-edge related-edge' : 'dependency-edge support-edge';
      return `<path class="${style}" d="M330 ${rawY} C430 ${rawY}, 490 ${featureY}, 580 ${featureY}"><title>${esc(raw.id)} → ${esc(featureRow.entryId)} · ${esc(relationshipLabel(role))}</title></path>`;
    })).join('');
    const heading = feature ? `${feature.entryId} · survey variables used or referenced` : `${rawId} · measures that use or reference it`;
    return `<section class="dependency-card expanded-map"><div class="card-head"><div><h2>${esc(heading)}</h2><p class="subtle">Each line shows how a survey variable contributes to a measure. ${rawRows.length} variables · ${features.length} measure entries.</p></div><button data-final-clear-selection class="plain-button">Close map</button></div><div class="map-scroll"><svg class="dependency-svg" viewBox="0 0 930 ${height}" role="img" aria-label="Survey variables used or referenced by planned measures"><text x="22" y="22" class="map-column-title">SURVEY VARIABLES</text><text x="600" y="22" class="map-column-title">PLANNED MEASURES</text>${edges}${rawNodes}${featureNodes}</svg></div><div class="edge-legend"><span><i class="edge-solid"></i>Used to calculate the measure or is the measure</span><span><i class="edge-dash"></i>Helps identify, check, or show a corresponding variable</span><span><i class="edge-dot"></i>Related, but a different measure</span></div></section>`;
  }

  function featureDetail(feature) {
    const explanation = feature.measureExplanation;
    const items = explanation?.items || [];
    const caveat = feature.caveat && !feature.scientificRationale?.limits.includes(feature.caveat) ? `<p class="warning">${esc(feature.caveat)}</p>` : '';
    const outputNote = feature.outputType === 'project-derived'
      ? `${feature.outputName || 'No project output name specified'} · planned for calculation; no saved column is listed yet.`
      : `${feature.outputColumn || 'Output name not specified'} · ${availabilityLabel(feature.outputAvailability)}`;
    const related = items.filter(item=>item.isComparison);
    const main = items.filter(item=>!item.isComparison);
    const lifeSummary = feature.entryId==='lb:001' ? '<p>A five-item measure of satisfaction with life. The score ranges from 1 to 7; higher means greater satisfaction. Use the delivered RAND score. The five original answers are not additional predictors.</p>' : `<p>${esc(feature.sourceDescription)}</p>`;
    const construction = explanation?.finalConstruction || feature.construction;
    return `<section class="detail-wrap final-detail"><div class="toolbar"><h2>${esc(feature.entryId)} · ${esc(feature.label)}</h2><button data-final-clear-selection>Close detail</button></div><section class="measure-summary"><h3>What this measure represents</h3>${lifeSummary}<div class="detail-grid">${detailItem('Selected analytical variable', esc(feature.outputColumn || feature.outputName || feature.label))}${detailItem('Where it comes from', esc(outputLabel(feature.outputType)))}${detailItem('Planned representation', esc(formLabel(feature.displayMethod)))}${detailItem('Availability', esc(outputNote))}</div></section>${scientificDetail(feature)}${caveat}${measureItems(main, 'Survey questions and planned operationalization')}<section class="construction-details"><h3>How the final measure is obtained</h3><p>${esc(explanation?.implementation || 'Follow the current decision record; no additional scoring rule is supplied.')}</p>${explanation?.itemTreatmentContext ? `<p>${esc(explanation.itemTreatmentContext)}</p>` : ''}<p class="measure-formula">${esc(construction || 'No separate calculation rule is recorded for this entry.')}</p>${feature.entryId==='lb:001' ? '<p><strong>Documented formula:</strong> mean of the valid OLB002A–OLB002E responses, with at least 3 of 5 valid. No item reversal. This explains RAND’s score; it is not a request to calculate a second score.</p>' : ''}${explanation?.additionalRules?.length ? `<ul>${explanation.additionalRules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul>` : ''}<p class="subtle">${esc(explanation?.alignment || '')}</p></section>${measureItems(related, 'Related Core question — not included in this score')}${publicationDetail(feature)}</section>`;
  }

  function featureStep(state, navigate) {
    return `<section class="final-map-shell">${featureView(state)}</section>`;
  }

  function render(state, navigate) {
    if (!F || !D) return '<p class="warning">The information for this view is missing. Rebuild it using <code>python3 -B build_metadata.py</code>.</p>';
    const step = ['sources', 'raw', 'features'].includes(state.finalStep) ? state.finalStep : 'sources';
    state.finalStep = step;
    const content = step === 'sources' ? sourceView(state) : step === 'raw' ? rawView(state) : featureStep(state, navigate);
    return presentationMarkup(`<header class="view-heading"><h1>Measures planned for analysis</h1><p class="lede">126 Core measures + 118 LB measures = 244 distinct measures to be used in the modeling analysis.</p></header>${stepButtons(state)}${content}`);
  }

  function wire(root, state, navigate) {
    const all = (selector, handler) => root.querySelectorAll(selector).forEach(element => element.addEventListener('click', handler));
    all('[data-measure-source]', event => navigate({ finalStep:'features', finalCollection:'All', finalFilterOutput:event.currentTarget.dataset.measureSource, finalSearch:'', finalFilterGroup:'', finalFilterForm:'', finalFilterCaveat:'', finalGroup:'', finalEntry:'', finalId:'', finalPage:1 }));
    const showExclusions = () => navigate({ view: 'final', finalStep: 'sources', finalOrigin: state.finalOrigin, finalGroup: '', finalId: '', finalEntry: '', finalPage: 1, finalSearch: '', finalFilterGroup: '', finalFilterMapping: 'outside' });
    all('[data-final-exclusions]', showExclusions);
    all('[data-final-category]', event => navigate({view:'final',finalStep:'sources',finalOrigin:state.finalOrigin,finalFilterMapping:event.currentTarget.dataset.finalCategory,finalGroup:'',finalFilterGroup:'',finalSearch:'',finalId:'',finalEntry:'',finalPage:1}));
    root.querySelectorAll('g[data-final-exclusions]').forEach(element => element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showExclusions(); } }));
    all('[data-final-used-origin]', event => navigate({ finalStep: 'raw', finalOrigin: event.currentTarget.dataset.finalUsedOrigin, finalGroup: '', finalId: '', finalEntry: '', finalPage: 1, finalSearch: '' }));
    all('[data-final-step]', event => navigate({ finalStep: event.currentTarget.dataset.finalStep, finalGroup: '', finalId: '', finalEntry: '', finalPage: 1, finalSearch: '', finalFilterGroup: '', finalFilterOutput: '', finalFilterForm: '', finalFilterRole: '', finalFilterCaveat: '', finalFilterAvailability: '', finalFilterAdditional: '', finalFilterMapping: '' }));
    all('[data-final-origin]', event => {
      const origin = event.currentTarget.dataset.finalOrigin;
      if (state.finalStep === 'features') navigate({ finalCollection: origin, finalEntry: '', finalId: '', finalPage: 1, finalSearch: '' });
      else navigate({ finalOrigin: origin, finalGroup: '', finalId: '', finalEntry: '', finalPage: 1, finalSearch: '', finalFilterMapping: '' });
    });
    all('[data-final-collection]', event => navigate({ finalCollection: event.currentTarget.dataset.finalCollection, finalEntry: '', finalId: '', finalPage: 1 }));
    all('[data-final-group]', event => navigate({ finalGroup: event.currentTarget.dataset.finalGroup === state.finalGroup ? '' : event.currentTarget.dataset.finalGroup, finalFilterMapping: '', finalId: '', finalEntry: '', finalPage: 1 }));
    all('[data-final-raw]', event => navigate({ finalId: event.currentTarget.dataset.finalRaw, finalEntry: '', finalStep: state.finalStep === 'features' ? 'features' : 'raw' }));
    all('[data-final-source]', event => navigate({ finalId: event.currentTarget.dataset.finalSource, finalEntry: '', finalStep: 'sources' }));
    all('[data-final-entry]', event => navigate({ finalEntry: event.currentTarget.dataset.finalEntry, finalId: '', finalStep: 'features' }));
    all('[data-final-flow-group]', event => navigate({ finalGroup: event.currentTarget.dataset.finalFlowGroup, finalFilterMapping: event.currentTarget.dataset.finalFlowBranch, finalId: '', finalEntry: '', finalPage: 1, finalSearch: '' }));
    all('[data-final-branch]', event => navigate({ finalGroup: '', finalFilterMapping: event.currentTarget.dataset.finalBranch, finalId: '', finalEntry: '', finalPage: 1 }));
    all('[data-final-clear-selection]', () => navigate({ finalId: '', finalEntry: '' }));
    all('[data-final-page]', event => navigate({ finalPage: Number(event.currentTarget.dataset.finalPage) }));
    all('[data-final-reset]', () => navigate({ finalSearch: '', finalFilterGroup: '', finalFilterOutput: '', finalFilterForm: '', finalFilterRole: '', finalFilterCaveat: '', finalFilterAvailability: '', finalFilterAdditional: '', finalFilterMapping: '', finalPage: 1, finalGroup: '' }));
    const search = root.querySelector('[data-final-search]');
    if (search) search.oninput = event => {
      const position = event.target.selectionStart;
      navigate({ finalSearch: event.target.value, finalPage: 1 }, true);
      const next = root.querySelector('[data-final-search]');
      if (next) { next.focus(); next.setSelectionRange(position, position); }
    };
    root.querySelectorAll('[data-final-filter]').forEach(element => element.addEventListener('change', event => {
      const key = event.currentTarget.dataset.finalFilter;
      const map = { group: 'finalFilterGroup', output: 'finalFilterOutput', form: 'finalFilterForm', role: 'finalFilterRole', caveat: 'finalFilterCaveat', availability: 'finalFilterAvailability', additional: 'finalFilterAdditional', mapping: 'finalFilterMapping', sort: 'finalSort' };
      navigate({ [map[key]]: event.currentTarget.value, finalPage: 1 });
    }));
    root.querySelectorAll('svg [role="button"]').forEach(element => element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); element.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    }));
  }

  window.FINAL_DECISION_VIEW = { render, wire, scientificDetail, sourceReason, measureWhy, presentationText, presentationMarkup };
})();
