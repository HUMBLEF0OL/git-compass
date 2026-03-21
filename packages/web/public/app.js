/** Git Compass Dashboard - Core Logic */

let state = {
    repoPath:  localStorage.getItem('gc_repoPath')  || '',
    branch:    localStorage.getItem('gc_branch')    || 'HEAD',
    window:    localStorage.getItem('gc_window')    || '30d',
    aiEnabled: localStorage.getItem('gc_aiEnabled') === 'true',
    aiProvider:localStorage.getItem('gc_aiProvider')|| 'openai',
    aiApiKey:  localStorage.getItem('gc_aiApiKey')  || '',
    excludePatterns: localStorage.getItem('gc_excludePatterns') || '',
    data: null,
};


const DOM = {
    loadingOverlay:   document.getElementById('loading-overlay'),
    repoName:         document.getElementById('repo-name'),
    repoMeta:         document.getElementById('repo-meta'),
    healthScore:      document.getElementById('health-score'),
    branchSelect:     document.getElementById('branch-select'),
    metricFiles:      document.getElementById('metric-files'),
    metricAuthors:    document.getElementById('metric-authors'),
    metricChurn:      document.getElementById('metric-churn'),
    metricRisk:       document.getElementById('metric-risk'),
    aiSummary:        document.getElementById('ai-summary-content'),
    healthLegend:     document.getElementById('health-legend'),
    riskList:         document.getElementById('risk-list'),
    queryInput:       document.getElementById('query-input'),
    queryBtn:         document.getElementById('query-btn'),
    queryResponse:    document.getElementById('query-response'),
    queryText:        document.getElementById('query-text'),
    settingsToggle:   document.getElementById('settings-toggle'),
    settingsSidebar:  document.getElementById('settings-sidebar'),
    settingsClose:    document.getElementById('settings-close'),
    settingsForm:     document.getElementById('settings-form'),
    compassList:      document.getElementById('compass-list'),
    burnoutMetrics:   document.getElementById('burnout-metrics'),
    burnoutList:      document.getElementById('burnout-list'),
    knowledgeList:    document.getElementById('knowledge-list'),
    churnChart:       document.getElementById('churn-chart'),
    timelineChart:    document.getElementById('timeline-chart'),
    burnoutBody:      document.getElementById('burnout-body'),
    couplingList:     document.getElementById('coupling-list'),
    impactList:       document.getElementById('impact-list'),
    rotList:          document.getElementById('rot-list'),
    contributorsBody: document.getElementById('contributors-body'),
    compassComponents: document.getElementById('compass-components'),
    compassDoc:       document.getElementById('compass-doc'),
    compassHeatmap:   document.getElementById('compass-heatmap'),
    aiPulse:          document.getElementById('ai-pulse'),
    aiSuggest:        document.getElementById('ai-suggest'),
    healthRadar:      document.getElementById('health-radar'),
    excludePatterns:  document.getElementById('exclude-patterns'),
};


let churnChart = null, healthRadar = null, timelineChart = null;
const AUTHOR_COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1'];

async function init() {
    lucide.createIcons();
    setupEventListeners();
    populateSettingsForm();
    await fetchBranches();
    await refreshData();
}

function setupEventListeners() {
    DOM.settingsToggle.onclick = () => DOM.settingsSidebar.classList.toggle('open');
    DOM.settingsClose.onclick  = () => DOM.settingsSidebar.classList.remove('open');
    DOM.settingsForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(DOM.settingsForm);
        state.repoPath   = fd.get('repoPath');
        state.window     = fd.get('window');
        state.aiEnabled  = fd.get('aiEnabled') === 'on';
        state.aiProvider = fd.get('aiProvider');
        state.aiApiKey   = fd.get('aiApiKey');
        state.excludePatterns = fd.get('excludePatterns') || '';
        localStorage.setItem('gc_repoPath',   state.repoPath);
        localStorage.setItem('gc_window',     state.window);
        localStorage.setItem('gc_aiEnabled',  state.aiEnabled);
        localStorage.setItem('gc_aiProvider', state.aiProvider);
        localStorage.setItem('gc_aiApiKey',   state.aiApiKey);
        localStorage.setItem('gc_excludePatterns', state.excludePatterns);
        DOM.settingsSidebar.classList.remove('open');

        await fetchBranches();
        await refreshData();
    };
    DOM.branchSelect.onchange = async (e) => {
        state.branch = e.target.value;
        localStorage.setItem('gc_branch', state.branch);
        await refreshData();
    };
    DOM.queryBtn.onclick = async () => {
        const query = DOM.queryInput.value.trim();
        if (!query || !state.data) return;
        DOM.queryBtn.disabled = true;
        DOM.queryBtn.innerText = 'Asking...';
        try {
            const res = await fetch('/api/query', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ query, analysisContext: state.data, aiProvider: state.aiProvider, aiApiKey: state.aiApiKey })
            });
            const { answer, error } = await res.json();
            DOM.queryResponse.classList.remove('hidden');
            DOM.queryText.innerText = error || answer;
        } catch(err) { console.error(err); }
        finally { DOM.queryBtn.disabled = false; DOM.queryBtn.innerText = 'Consult AI'; }
    };
    document.querySelector('[name="aiEnabled"]').onchange = (e) => {
        document.querySelector('.ai-fields').classList.toggle('hidden', !e.target.checked);
    };
}

function populateSettingsForm() {
    const f = DOM.settingsForm;
    f.repoPath.value = state.repoPath; f.window.value = state.window;
    f.aiEnabled.checked = state.aiEnabled; f.aiProvider.value = state.aiProvider;
    f.aiApiKey.value = state.aiApiKey;
    if (f.excludePatterns) f.excludePatterns.value = state.excludePatterns;
    document.querySelector('.ai-fields').classList.toggle('hidden', !state.aiEnabled);
}


async function fetchBranches() {
    try {
        const res = await fetch('/api/branches?repoPath=' + encodeURIComponent(state.repoPath));
        const { branches } = await res.json();
        if (branches) {
            DOM.branchSelect.innerHTML = branches.map(b =>
                '<option value="' + b + '" ' + (b === state.branch ? 'selected' : '') + '>' + b + '</option>'
            ).join('');
        }
    } catch(e) { console.error(e); }
}

async function refreshData() {
    DOM.loadingOverlay.classList.remove('hidden', 'opacity-0');
    try {
        const payload = {
            repoPath: state.repoPath,
            branch: state.branch,
            window: state.window,
            ai: state.aiEnabled,
            aiProvider: state.aiProvider,
            aiApiKey: state.aiApiKey,
            excludePatterns: state.excludePatterns.split(',').map(s => s.trim()).filter(Boolean)
        };
        const res = await fetch('/api/analyze', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        state.data = data;
        renderDashboard(data);
    } catch(e) { alert('Analysis failed: ' + e.message); }
    finally {
        DOM.loadingOverlay.classList.add('opacity-0');
        setTimeout(() => DOM.loadingOverlay.classList.add('hidden'), 500);
    }
}

function renderDashboard(data) {
    const { meta, hotspots, riskScores, churn, contributors, contributorTimeline,
            burnout, coupling, knowledge, impact, rot, compass, aiSummary, health } = data;
    const folderName = meta.repoPath.split(/[/\\]/).filter(Boolean).pop() || 'Repository';
    DOM.repoName.innerText = folderName;
    DOM.repoMeta.innerText = meta.commitCount + ' commits analyzed - ' + meta.window + ' window';
    const avgHealth = Math.round((health.stability + health.velocity + health.simplicity + health.coverage + health.decoupling) / 5);
    DOM.healthScore.innerText = avgHealth + '%';
    DOM.metricFiles.innerText   = hotspots.length;
    DOM.metricAuthors.innerText = contributors.length;
    const totalLines = churn.reduce((a,c) => a + c.linesAdded, 0);
    DOM.metricChurn.innerText = totalLines >= 1000 ? (totalLines/1000).toFixed(1)+'k' : totalLines;
    const avgRisk = Math.round(riskScores.reduce((a,r) => a + r.score, 0) / (riskScores.length||1));
    DOM.metricRisk.innerText = avgRisk;
    DOM.metricRisk.className = 'metric-value ' + (avgRisk > 60 ? 'risk-high' : avgRisk > 30 ? 'risk-medium' : 'risk-low');
    if (data.aiSummary) {
        DOM.aiSummary.innerText = data.aiSummary;
        DOM.aiSuggest.style.display = 'none';
        DOM.aiPulse.classList.remove('active');
    } else {
        DOM.aiSummary.innerText = 'AI Insights are currently disabled. Configure AI in Settings to see behavioral patterns.';
        DOM.aiSuggest.style.display = 'block';
        DOM.aiPulse.classList.remove('active');
    }
    renderRiskList(riskScores);
    renderChurnChart(churn);
    renderHealthRadar(health);
    renderTimelineChart(contributorTimeline, contributors);
    renderCompass(compass);
    renderCompassHeatmap(hotspots, riskScores);
    renderBurnout(burnout);
    renderKnowledgeSilos(knowledge);
    renderCoupling(coupling);
    renderImpact(impact);
    renderRot(rot);
    renderContributorsTable(contributors);
}

function renderRiskList(riskScores) {
    if (!riskScores) return;
    DOM.riskList.innerHTML = riskScores.slice(0,5).map(r => {
        const dc = r.score > 70 ? 'high' : r.score > 40 ? 'medium' : 'low';
        const fn = r.path.split(/[/\\]/).pop();
        
        // Find corresponding hotspot to show lines impacted
        const hotspot = state.data?.hotspots?.find(h => h.path === r.path);
        const impactLabel = hotspot ? `<div class="metric-sub">${hotspot.linesImpacted.toLocaleString()} lines churned</div>` : '';

        return `
            <div class="risk-item">
                <div style="overflow:hidden; min-width:0; margin-right:0.75rem; flex-grow:1;">
                    <p class="risk-filename" title="${r.path}">${fn}</p>
                    <p class="risk-score-label" style="display:flex; align-items:center; gap:0.4rem;">
                        Impact Score: ${r.score}
                    </p>
                    ${impactLabel}
                </div>
                <div class="risk-dot ${dc}"></div>
            </div>
        `;
    }).join('');
}


function renderChurnChart(d) {
    if (churnChart) churnChart.destroy();
    const ctx = DOM.churnChart.getContext('2d');
    
    const labels = d.map(p => {
        const date = new Date(p.date);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const ag = ctx.createLinearGradient(0,0,0,260);
    ag.addColorStop(0,'rgba(79,70,229,0.18)'); ag.addColorStop(1,'rgba(79,70,229,0)');
    const dg = ctx.createLinearGradient(0,0,0,260);
    dg.addColorStop(0,'rgba(239,68,68,0.12)'); dg.addColorStop(1,'rgba(239,68,68,0)');
    churnChart = new Chart(ctx, {
        type: 'line',
        data: { labels: d.map(x => x.date), datasets: [
            { label:'Added', data:d.map(x=>x.linesAdded), borderColor:'#4f46e5', backgroundColor:ag, fill:true, tension:0.4, pointRadius:2, borderWidth:2.5 },
            { label:'Deleted', data:d.map(x=>x.linesDeleted||x.linesRemoved||0), borderColor:'#ef4444', backgroundColor:dg, fill:true, tension:0.4, pointRadius:2, borderWidth:2.5 }
        ]},
        options: { responsive:true, maintainAspectRatio:false,
            plugins: { legend:{display:true,position:'top',align:'end',labels:{color:'#64748b',font:{size:10,weight:'bold'},usePointStyle:true,boxWidth:6,padding:12}}, tooltip:{backgroundColor:'#fff',titleColor:'#0f172a',bodyColor:'#64748b',borderColor:'rgba(0,0,0,0.08)',borderWidth:1} },
            scales: { x:{grid:{display:false},ticks:{color:'#94a3b8',font:{size:10}}}, y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#94a3b8',font:{size:10}}} } }
    });
}

function renderHealthRadar(h) {
    if (healthRadar) healthRadar.destroy();
    const labels = Object.keys(h).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const ctx = document.getElementById('health-radar').getContext('2d');
    healthRadar = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets: [{ label:'Health', data:Object.values(h), backgroundColor:'rgba(79,70,229,0.1)', borderColor:'#4f46e5', borderWidth:2.5, pointBackgroundColor:'#4f46e5', pointBorderColor:'#f3f5f9', pointRadius:4 }]},
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
            scales: { r:{ angleLines:{color:'rgba(0,0,0,0.07)'}, grid:{color:'rgba(0,0,0,0.07)'}, pointLabels:{color:'#0f172a',font:{size:11,weight:'700'},padding:12}, ticks:{display:false,stepSize:25}, beginAtZero:true, max:100 } } }
    });
    DOM.healthLegend.innerHTML = Object.entries(h).map(([k,v]) =>
        '<div class="health-legend-item"><p class="health-legend-key">' + k + '</p><p class="health-legend-val">' + v + '%</p></div>'
    ).join('');
}

function renderTimelineChart(tl, contributors) {
    if (timelineChart) timelineChart.destroy();
    if (!tl || tl.length === 0) return;
    const authors = [...new Set(contributors.map(c => c.author))].slice(0,10);
    const ds = authors.map((a,i) => ({
        label: a.split(' ')[0],
        data: tl.map(p => p.impacts ? (p.impacts[a]||0) : 0),
        backgroundColor: AUTHOR_COLORS[i%AUTHOR_COLORS.length]+'bb',
        borderColor: AUTHOR_COLORS[i%AUTHOR_COLORS.length],
        borderWidth:1.5, fill:true, tension:0.4, pointRadius:0,
    }));
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: tl.map(d => d.date), datasets: ds },
        options: { responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
            plugins: { legend:{display:true,position:'top',align:'end',labels:{color:'#64748b',font:{size:10,weight:'bold'},usePointStyle:true,boxWidth:7,padding:14}}, tooltip:{backgroundColor:'#fff',titleColor:'#0f172a',bodyColor:'#64748b'} },
            scales: { x:{stacked:true,grid:{display:false},ticks:{color:'#94a3b8',font:{size:10}}}, y:{stacked:true,beginAtZero:true,grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#94a3b8',font:{size:10}}} } }
    });
}

function renderCompass(compass) {
    if (!compass) return;

    // 1. Architectural Overview
    if (DOM.compassDoc) {
        DOM.compassDoc.innerText = compass.documentation || 'Explore the codebase starting with essential files below.';
    }

    // 2. Component Maturity
    if (DOM.compassComponents && compass.components) {
        DOM.compassComponents.innerHTML = compass.components.map(c => {
            const m = c.maturity.toLowerCase();
            const statusLabel = m === 'evolving' ? 'ACTIVE' : m === 'stable' ? 'STABLE' : 'LEGACY';
            return `
                <div class="maturity-item" title="${c.name} is currently ${c.maturity}">
                    <div class="maturity-dot ${m}"></div>
                    <span>${c.name}</span>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:900; margin-left:1rem; opacity:0.8;">${statusLabel}</span>
                </div>
            `;
        }).join('');
    }


    // 3. Essential Files
    if (!compass.essentials || compass.essentials.length === 0) {
        DOM.compassList.innerHTML = '<p class="empty-state">No essential files identified.</p>';
        return;
    }
    
    DOM.compassList.innerHTML = compass.essentials.slice(0,9).map((e,i) => {
        const fn = e.path.split(/[/\\]/).pop();
        const icon = e.type === 'entry-point' ? 'play-circle' : 'file-code';
        const typeLabel = e.type === 'entry-point' ? 'CORE ENTRY' : 'CORE MODULE';
        
        return `
            <div class="compass-item">
                <div class="compass-rank">${i+1}</div>
                <div class="compass-details">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="compass-filename">${fn}</span>
                        <span class="web-badge" style="font-size:0.65rem; padding:0.1rem 0.3rem;">${typeLabel}</span>
                    </div>
                    <div class="compass-path">${e.path}</div>
                    <div class="compass-reason">${e.reason}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompassHeatmap(hotspots, riskScores) {
    if (!hotspots || hotspots.length === 0) {
        DOM.compassHeatmap.innerHTML = '<p class="empty-state">No activity data.</p>';
        return;
    }
    
    // Sort hotspots by change count (intensity)
    const sorted = [...hotspots].sort((a,b) => (b.changeCount||0) - (a.changeCount||0));
    const topFiles = sorted.slice(0, 200);
    const maxChanges = Math.max(...topFiles.map(f => f.changeCount || 1), 1);


    DOM.compassHeatmap.innerHTML = topFiles.map(file => {
        const changes = file.changeCount || 0;
        const ratio = changes / maxChanges;
        const lvl = ratio > 0.8 ? 4 : ratio > 0.5 ? 3 : ratio > 0.2 ? 2 : ratio > 0.05 ? 1 : 0;
        const filename = file.path.split(/[/\\]/).pop();
        
        return `<div class="heat-box heat-lvl-${lvl}" title="${filename} (${changes} changes)"></div>`;
    }).join('');
}


function renderBurnout(burnout) {
    if (!burnout) return;
    const flags = (burnout.flags||[]).map(f => '<div class="burnout-flag"><div class="burnout-flag-dot"></div><p class="burnout-flag-text">' + f + '</p></div>').join('');
    DOM.burnoutMetrics.innerHTML = '<div class="burnout-counters">' +
        '<div class="burnout-counter"><div class="burnout-counter-value">' + (burnout.afterHoursCommits||0) + '</div><div class="burnout-counter-label">After-hours</div></div>' +
        '<div class="burnout-counter"><div class="burnout-counter-value">' + (burnout.weekendCommits||0) + '</div><div class="burnout-counter-label">Weekend</div></div>' +
        '</div>' + flags;
    if (!burnout.contributors || burnout.contributors.length === 0) {
        DOM.burnoutList.innerHTML = '<p class="empty-state">No burnout signals detected.</p>'; return;
    }
    DOM.burnoutList.innerHTML = burnout.contributors.map(c =>
        '<div class="burnout-contributor"><div><div class="burnout-contributor-name">' + c.author + '</div>' +
        '<div class="burnout-contributor-meta">' + c.afterHoursPercent.toFixed(0) + '% after-hrs - ' + c.weekendPercent.toFixed(0) + '% wknd</div></div>' +
        '<span class="risk-badge ' + c.riskLevel + '">' + c.riskLevel + '</span></div>'
    ).join('');
}

function renderKnowledgeSilos(knowledge) {
    if (!knowledge || knowledge.length === 0) { DOM.knowledgeList.innerHTML = '<p class="empty-state">No knowledge silo data.</p>'; return; }
    DOM.knowledgeList.innerHTML = knowledge.slice(0,8).map(s => {
        const fn = s.path.split(/[/\\]/).pop();
        const bw = Math.min(100, s.authorshipPercent);
        const fc = s.authorshipPercent>70?'danger':s.authorshipPercent>40?'warning':'';
        return '<div class="analysis-item"><div class="analysis-item-header"><p class="analysis-filename">' + fn + '</p><div class="status-dot ' + s.riskLevel + '"></div></div>' +
            '<p class="analysis-meta">' + s.mainContributor + '</p>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill ' + fc + '" style="width:' + bw + '%"></div></div>' +
            '<p class="analysis-meta" style="margin-top:0.3rem">' + s.authorshipPercent.toFixed(0) + '% ownership</p></div>';
    }).join('');
}

function renderCoupling(coupling) {
    if (!coupling || coupling.length === 0) { DOM.couplingList.innerHTML = '<p class="empty-state">No coupling data.</p>'; return; }
    DOM.couplingList.innerHTML = coupling.slice(0,8).map(l => {
        const hf = l.head.split(/[/\\]/).pop(), tf = l.tail.split(/[/\\]/).pop();
        const st = Math.round(l.coupling*100);
        const fc = st>70?'danger':st>40?'warning':'';
        return '<div class="analysis-item"><div class="coupling-pair">' +
            '<span class="analysis-filename" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + hf + '</span>' +
            '<span class="coupling-arrow">&harr;</span>' +
            '<span class="analysis-filename" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + tf + '</span></div>' +
            '<div class="coupling-strength"><div class="progress-bar-track" style="flex:1;margin-top:0"><div class="progress-bar-fill ' + fc + '" style="width:' + st + '%"></div></div><span class="coupling-pct">' + st + '%</span></div>' +
            '<p class="coupling-shared">' + l.sharedCommits + ' shared commits</p></div>';
    }).join('');
}

function renderImpact(impact) {
    if (!impact || impact.length === 0) { DOM.impactList.innerHTML = '<p class="empty-state">No impact data.</p>'; return; }
    const mx = Math.max(...impact.map(i => i.blastRadius||0), 1);
    DOM.impactList.innerHTML = impact.slice(0,6).map(f => {
        const fn = f.path.split(/[/\\]/).pop(), r = f.blastRadius||0;
        const bw = Math.min(100, (r/mx)*100);
        return '<div class="analysis-item"><div class="analysis-item-header"><p class="analysis-filename">' + fn + '</p><span style="font-size:0.65rem;font-weight:900;color:var(--primary);flex-shrink:0">~' + r.toFixed(1) + '</span></div>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + bw + '%"></div></div>' +
            '<p class="analysis-meta" style="margin-top:0.3rem">avg ' + r.toFixed(1) + ' - max ' + (f.maxBlastRadius||Math.ceil(r)) + '</p></div>';
    }).join('');
}

function renderRot(rot) {
    if (!rot || rot.length === 0) { DOM.rotList.innerHTML = '<p class="empty-state">No stale files.</p>'; return; }
    DOM.rotList.innerHTML = rot.slice(0,8).map(fp => {
        const fn = fp.split(/[/\\]/).pop();
        return '<div class="rot-item"><div class="rot-dot"></div><p class="rot-file" title="' + fp + '">' + fn + '</p></div>';
    }).join('');
}

function renderContributorsTable(contributors) {
    if (!contributors || contributors.length === 0) {
        DOM.contributorsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--muted-fg);font-size:0.75rem">No contributors found.</td></tr>';
        return;
    }
    const sorted = [...contributors].sort((a,b) => b.commitCount - a.commitCount);
    DOM.contributorsBody.innerHTML = sorted.map((c,i) => {
        const col = AUTHOR_COLORS[i%AUTHOR_COLORS.length];
        const ini = c.author.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        return '<tr><td><div class="contrib-cell">' +
            '<div class="contrib-avatar" style="background:' + col + '">' + ini + '</div>' +
            '<div><div class="contrib-name">' + c.author + '</div><div class="contrib-email">' + c.email + '</div></div>' +
            '</div></td><td class="num">' + c.commitCount + '</td>' +
            '<td class="num positive">+' + c.linesAdded.toLocaleString() + '</td>' +
            '<td class="num negative">-' + c.linesRemoved.toLocaleString() + '</td>' +
            '<td class="num">' + c.filesChanged + '</td>' +
            '<td class="num" style="color:var(--muted-fg)">' + c.activeDays + '</td></tr>';
    }).join('');
}

init();