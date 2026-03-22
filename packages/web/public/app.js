/** Git Compass Dashboard - Core Logic */

const DEFAULT_EXCLUDE_PATTERNS = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'tsconfig.json', '.gitignore', '.npmignore', 'LICENSE', 'README.md',
    '*.config.js', '*.config.ts', '.eslintrc*', '.prettierrc*',
    '.pnp.cjs', '.pnp.loader.mjs', 'node_modules/**', '.git/**',
    '.turbo/**', 'release.yml', 'release.yaml'
];

/* Simple XOR-based obfuscation for localStorage API keys */
const _GC_SALT = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
function _xorEncode(str) {
    if (!str) return '';
    return btoa(str.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ _GC_SALT.charCodeAt(i % _GC_SALT.length))
    ).join(''));
}
function _xorDecode(encoded) {
    if (!encoded) return '';
    try {
        const decoded = atob(encoded);
        return decoded.split('').map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ _GC_SALT.charCodeAt(i % _GC_SALT.length))
        ).join('');
    } catch { return ''; }
}
function _loadApiKey() {
    const stored = localStorage.getItem('gc_aiApiKey') || '';
    // Migrate plaintext keys (start with sk- or similar)
    if (stored && (stored.startsWith('sk-') || stored.startsWith('gsk_') || stored.length < 20)) {
        const encrypted = _xorEncode(stored);
        localStorage.setItem('gc_aiApiKey', encrypted);
        return stored;
    }
    return _xorDecode(stored);
}

const savedExclude = localStorage.getItem('gc_excludePatterns');

let state = {
    repoPath: localStorage.getItem('gc_repoPath') || '',
    branch: localStorage.getItem('gc_branch') || 'HEAD',
    window: localStorage.getItem('gc_window') || '30d',
    maxCommits: parseInt(localStorage.getItem('gc_maxCommits') || '500', 10),
    aiEnabled: localStorage.getItem('gc_aiEnabled') === 'true',
    aiProvider: localStorage.getItem('gc_aiProvider') || 'openai',
    aiApiKey: _loadApiKey(),
    excludePatterns: savedExclude !== null ? savedExclude : DEFAULT_EXCLUDE_PATTERNS.join(', '),
    data: null,
};


const DOM = {
    loadingOverlay: document.getElementById('loading-overlay'),
    repoName: document.getElementById('repo-name'),
    repoMeta: document.getElementById('repo-meta'),
    healthScore: document.getElementById('health-score'),
    branchSelect: document.getElementById('branch-select'),
    metricFiles: document.getElementById('metric-files'),
    metricAuthors: document.getElementById('metric-authors'),
    metricChurn: document.getElementById('metric-churn'),
    metricRisk: document.getElementById('metric-risk'),
    aiSummary: document.getElementById('ai-summary-content'),
    healthLegend: document.getElementById('health-legend'),
    riskList: document.getElementById('risk-list'),
    queryInput: document.getElementById('query-input'),
    queryBtn: document.getElementById('query-btn'),
    queryResponse: document.getElementById('query-response'),
    queryText: document.getElementById('query-text'),
    settingsToggle: document.getElementById('settings-toggle'),
    settingsSidebar: document.getElementById('settings-sidebar'),
    settingsClose: document.getElementById('settings-close'),
    settingsForm: document.getElementById('settings-form'),
    compassList: document.getElementById('compass-list'),
    burnoutMetrics: document.getElementById('burnout-metrics'),
    burnoutList: document.getElementById('burnout-list'),
    knowledgeList: document.getElementById('knowledge-list'),
    churnChart: document.getElementById('churn-chart'),
    timelineChart: document.getElementById('timeline-chart'),
    burnoutBody: document.getElementById('burnout-body'),
    couplingList: document.getElementById('coupling-list'),
    impactList: document.getElementById('impact-list'),
    rotList: document.getElementById('rot-list'),
    contributorsBody: document.getElementById('contributors-body'),
    compassComponents: document.getElementById('compass-components'),
    compassDoc: document.getElementById('compass-doc'),
    compassHeatmap: document.getElementById('compass-heatmap'),
    aiPulse: document.getElementById('ai-pulse'),
    aiSuggest: document.getElementById('ai-suggest'),
    healthRadar: document.getElementById('health-radar'),
    excludePatterns: document.getElementById('exclude-patterns'),
};


let churnChart = null, healthRadar = null, timelineChart = null;
const AUTHOR_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

/** Converts AI summary text into formatted HTML */
function _formatAiText(text) {
    if (!text) return '';
    // Strip horizontal rules
    const clean = text.replace(/^(?:---|\*\*\*)\s*$/gm, '');
    // Sanitize
    const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const lines = safe.split('\n');
    let html = '';
    let currentList = [];

    const flushList = () => {
        if (currentList.length > 0) {
            html += '<ul class="ai-list">' + currentList.map(li => `<li>${_inlineFmt(li)}</li>`).join('') + '</ul>';
            currentList = [];
        }
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }

        // List item detection
        const listMatch = line.match(/^\s*[-•*]\s+(.*)/);
        if (listMatch) {
            currentList.push(listMatch[1]);
            return;
        }

        flushList();

        // Heading detection: ALL CAPS or ends with colon or very short line
        const isAllCaps = trimmed.length > 3 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !/^\d/.test(trimmed);
        const isShortLabel = trimmed.endsWith(':') && trimmed.length < 50;

        if (isAllCaps || isShortLabel) {
            html += `<p class="ai-heading">${_inlineFmt(trimmed)}</p>`;
        } else {
            html += `<p>${_inlineFmt(trimmed)}</p>`;
        }
    });

    flushList();
    return html;
}
function _inlineFmt(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            // Match potential file paths: 
            // - handle paths potentially enclosed in quotes or parentheses
            // - match strings like 'analyze.ts' or "packages/core/src/index.ts"
            .replace(/(['"(]?)((?:[\w.@/-]+)\.\w+)(['")]?)/g, (m, p1, p2, p3) => {
                const escaped = p2.replace(/'/g, "\\'");
                return `${p1}<a class="file-link" href="#" onclick="event.preventDefault();window._openFile('${escaped}')" title="Open ${p2}">${p2}</a>${p3}`;
            });
}

/** Make file path into a clickable link */
function _fileLink(fullPath, displayName) {
    const escaped = fullPath.replace(/'/g, "\\'");
    return `<a class="file-link" href="#" data-path="${fullPath}" title="${fullPath}" onclick="event.preventDefault();window._openFile('${escaped}')">${displayName || fullPath}</a>`;
}

/** Open a file — attempts vscode:// URI with fuzzy path matching */
window._openFile = function(path) {
    const repoPath = state.repoPath || '';
    let target = path;

    // AI might provide truncated paths (e.g. 'analyze.ts' instead of 'packages/cli/src/commands/analyze.ts')
    // We try to find a match in our processed hotspots data
    if (state.data && (state.data.hotspots || state.data.riskScores)) {
        const pool = state.data.hotspots || state.data.riskScores;
        const match = pool.find(item => {
            const p = item.path || '';
            return p === path || p.endsWith('/' + path) || (path.includes('/') && p.endsWith(path));
        });
        if (match) target = match.path;
    }

    const fullPath = target.startsWith('/') || target.includes(':') ? target : (repoPath ? repoPath + '/' + target : target);
    window.open('vscode://file/' + fullPath.replace(/\\/g, '/'), '_blank');
};

async function init() {
    lucide.createIcons();
    setupEventListeners();
    populateSettingsForm();
    await fetchBranches();
    await refreshData();
}

function setupEventListeners() {
    DOM.settingsToggle.onclick = () => DOM.settingsSidebar.classList.toggle('open');
    DOM.settingsClose.onclick = () => DOM.settingsSidebar.classList.remove('open');
    DOM.settingsForm.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(DOM.settingsForm);
        state.repoPath = fd.get('repoPath');
        state.window = fd.get('window');
        state.maxCommits = parseInt(fd.get('maxCommits') || '500', 10);
        state.aiEnabled = fd.get('aiEnabled') === 'on';
        state.aiProvider = fd.get('aiProvider');
        state.aiApiKey = fd.get('aiApiKey');
        state.excludePatterns = fd.get('excludePatterns') || '';
        localStorage.setItem('gc_repoPath', state.repoPath);
        localStorage.setItem('gc_window', state.window);
        localStorage.setItem('gc_maxCommits', state.maxCommits.toString());
        localStorage.setItem('gc_aiEnabled', state.aiEnabled);
        localStorage.setItem('gc_aiProvider', state.aiProvider);
        localStorage.setItem('gc_aiApiKey', _xorEncode(state.aiApiKey));
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query, 
                    analysisContext: state.data, 
                    aiProvider: state.aiProvider, 
                    aiApiKey: _xorEncode(state.aiApiKey) 
                })
            });
            const { answer, error } = await res.json();
            DOM.queryResponse.classList.remove('hidden');
            DOM.queryText.innerText = error || answer;
        } catch (err) { console.error(err); }
        finally { DOM.queryBtn.disabled = false; DOM.queryBtn.innerText = 'Consult AI'; }
    };
    document.querySelector('[name="aiEnabled"]').onchange = (e) => {
        document.querySelector('.ai-fields').classList.toggle('hidden', !e.target.checked);
    };
}

function populateSettingsForm() {
    const f = DOM.settingsForm;
    f.repoPath.value = state.repoPath; f.window.value = state.window;
    if (f.maxCommits) f.maxCommits.value = state.maxCommits;
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
    } catch (e) { console.error(e); }
}

async function refreshData() {
    DOM.loadingOverlay.classList.remove('hidden', 'opacity-0');
    try {
        const patterns = state.excludePatterns.split(',').map(s => s.trim()).filter(Boolean);
        const payload = {
            repoPath: state.repoPath,
            branch: state.branch,
            window: state.window,
            maxCommits: state.maxCommits,
            ai: state.aiEnabled,
            aiProvider: state.aiProvider,
            aiApiKey: _xorEncode(state.aiApiKey),
            excludePatterns: patterns.length > 0 ? patterns : undefined
        };
        const res = await fetch('/api/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        state.data = data;
        renderDashboard(data);
    } catch (e) { alert('Analysis failed: ' + e.message); }
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
    DOM.metricFiles.innerText = hotspots.length;
    DOM.metricAuthors.innerText = contributors.length;
    const totalLines = churn.reduce((a, c) => a + c.linesAdded, 0);
    DOM.metricChurn.innerText = totalLines >= 1000 ? (totalLines / 1000).toFixed(1) + 'k' : totalLines;
    const avgRisk = Math.round(riskScores.reduce((a, r) => a + r.score, 0) / (riskScores.length || 1));
    DOM.metricRisk.innerText = avgRisk;
    DOM.metricRisk.className = 'metric-value ' + (avgRisk > 60 ? 'risk-high' : avgRisk > 30 ? 'risk-medium' : 'risk-low');
    if (data.aiSummary) {
        DOM.aiSummary.innerHTML = _formatAiText(data.aiSummary);
        DOM.aiSuggest.style.display = 'none';
        DOM.aiPulse.classList.remove('active');
    } else {
        DOM.aiSummary.innerHTML = '<p>AI Insights are currently disabled. Configure AI in Settings to see behavioral patterns.</p>';
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
    DOM.riskList.innerHTML = riskScores.slice(0, 5).map(r => {
        const dc = r.score > 70 ? 'high' : r.score > 40 ? 'medium' : 'low';
        const fn = r.path.split(/[/\\]/).pop();

        // Find corresponding hotspot to show lines impacted
        const hotspot = state.data?.hotspots?.find(h => h.path === r.path);
        const impactLabel = hotspot ? `<div class="metric-sub">${hotspot.linesImpacted.toLocaleString()} lines churned</div>` : '';

        return `
            <div class="risk-item">
                <div style="overflow:hidden; min-width:0; margin-right:0.75rem; flex-grow:1;">
                    <p class="risk-filename">${_fileLink(r.path, fn)}</p>
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

    // Dynamic timestamp formatting based on date range
    const dates = d.map(p => new Date(p.date));
    const rangeMs = dates.length > 1 ? dates[dates.length - 1] - dates[0] : 0;
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
    const formatLabel = (dateStr) => {
        const dt = new Date(dateStr);
        if (rangeDays <= 30) return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (rangeDays <= 365) return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };
    const labels = d.map(p => formatLabel(p.date));

    const ag = ctx.createLinearGradient(0, 0, 0, 260);
    ag.addColorStop(0, 'rgba(79,70,229,0.18)'); ag.addColorStop(1, 'rgba(79,70,229,0)');
    const dg = ctx.createLinearGradient(0, 0, 0, 260);
    dg.addColorStop(0, 'rgba(239,68,68,0.12)'); dg.addColorStop(1, 'rgba(239,68,68,0)');
    churnChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Added', data: d.map(x => x.linesAdded), borderColor: '#4f46e5', backgroundColor: ag, fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5 },
                { label: 'Deleted', data: d.map(x => x.linesDeleted || x.linesRemoved || 0), borderColor: '#ef4444', backgroundColor: dg, fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#64748b', font: { size: 10, weight: 'bold' }, usePointStyle: true, boxWidth: 6, padding: 12 } }, tooltip: { backgroundColor: '#fff', titleColor: '#0f172a', bodyColor: '#64748b', borderColor: 'rgba(0,0,0,0.08)', borderWidth: 1 } },
            scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 } } } }
        }
    });
}

function renderHealthRadar(h) {
    if (healthRadar) healthRadar.destroy();
    const labels = Object.keys(h).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const ctx = document.getElementById('health-radar').getContext('2d');
    healthRadar = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets: [{ label: 'Health', data: Object.values(h), backgroundColor: 'rgba(79,70,229,0.1)', borderColor: '#4f46e5', borderWidth: 2.5, pointBackgroundColor: '#4f46e5', pointBorderColor: '#f3f5f9', pointRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { r: { angleLines: { color: 'rgba(0,0,0,0.07)' }, grid: { color: 'rgba(0,0,0,0.07)' }, pointLabels: { color: '#0f172a', font: { size: 11, weight: '700' }, padding: 12 }, ticks: { display: false, stepSize: 25 }, beginAtZero: true, max: 100 } }
        }
    });
    DOM.healthLegend.innerHTML = Object.entries(h).map(([k, v]) =>
        '<div class="health-legend-item"><p class="health-legend-key">' + k + '</p><p class="health-legend-val">' + v + '%</p></div>'
    ).join('');
}

function renderTimelineChart(tl, contributors) {
    if (timelineChart) timelineChart.destroy();
    if (!tl || tl.length === 0) return;
    const authors = [...new Set(contributors.map(c => c.author))].slice(0, 10);
    const ds = authors.map((a, i) => ({
        label: a.split(' ')[0],
        data: tl.map(p => p.impacts ? (p.impacts[a] || 0) : 0),
        backgroundColor: AUTHOR_COLORS[i % AUTHOR_COLORS.length] + 'bb',
        borderColor: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
        borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0,
    }));

    // Dynamic timestamp formatting based on date range
    const dates = tl.map(p => new Date(p.date));
    const rangeMs = dates.length > 1 ? dates[dates.length - 1] - dates[0] : 0;
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
    const formatLabel = (dateStr) => {
        const dt = new Date(dateStr);
        if (rangeDays <= 30) return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (rangeDays <= 365) return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };
    const labels = tl.map(d => formatLabel(d.date));

    const ctx = document.getElementById('timeline-chart').getContext('2d');
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: ds },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'top', align: 'end', labels: { color: '#64748b', font: { size: 10, weight: 'bold' }, usePointStyle: true, boxWidth: 7, padding: 14 } }, tooltip: { backgroundColor: '#fff', titleColor: '#0f172a', bodyColor: '#64748b' } },
            scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#94a3b8', font: { size: 10 } } } }
        }
    });
}

function renderCompass(compass) {
    if (!compass) return;

    // 1. Architectural Overview
    if (DOM.compassDoc) {
        DOM.compassDoc.innerHTML = _inlineFmt(compass.documentation || 'Explore the codebase starting with essential files below.');
    }

    // 2. Component Maturity — categorized groups
    if (DOM.compassComponents && compass.components) {
        const groups = { active: [], stable: [], legacy: [] };
        compass.components.forEach(c => {
            const m = c.maturity.toLowerCase();
            if (m === 'evolving') groups.active.push(c);
            else if (m === 'stable') groups.stable.push(c);
            else groups.legacy.push(c);
        });

        const renderGroup = (label, items, cls) => {
            if (items.length === 0) return '';
            const chips = items.map(c => `
                <div class="maturity-item maturity-${cls}" title="${c.name} — ${c.maturity}">
                    <div class="maturity-dot ${c.maturity.toLowerCase()}"></div>
                    <span>${_fileLink(c.name, c.name)}</span>
                </div>
            `).join('');
            return `
                <div class="maturity-group">
                    <div class="maturity-group-header maturity-header-${cls}">${label}<span class="maturity-count">${items.length}</span></div>
                    <div class="maturity-group-items">${chips}</div>
                </div>
            `;
        };

        DOM.compassComponents.innerHTML =
            renderGroup('Active', groups.active, 'active') +
            renderGroup('Stable', groups.stable, 'stable') +
            renderGroup('Legacy', groups.legacy, 'legacy');
    }


    // 3. Essential Files
    if (!compass.essentials || compass.essentials.length === 0) {
        DOM.compassList.innerHTML = '<p class="empty-state">No essential files identified.</p>';
        return;
    }

    DOM.compassList.innerHTML = compass.essentials.slice(0, 9).map((e, i) => {
        const fn = e.path.split(/[/\\]/).pop();
        const icon = e.type === 'entry-point' ? 'play-circle' : 'file-code';
        const typeLabel = e.type === 'entry-point' ? 'CORE ENTRY' : 'CORE MODULE';

        return `
            <div class="compass-item">
                <div class="compass-rank">${i + 1}</div>
                <div class="compass-details">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="compass-filename">${_fileLink(e.path, fn)}</span>
                        <span class="web-badge" style="font-size:0.65rem; padding:0.1rem 0.3rem;">${typeLabel}</span>
                    </div>
                    <div class="compass-path">${_fileLink(e.path, e.path)}</div>
                    <div class="compass-reason">${e.reason}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompassHeatmap(hotspots, riskScores) {
    const container = DOM.compassHeatmap;
    if (!hotspots || hotspots.length === 0) {
        container.innerHTML = '<p class="empty-state">No activity data.</p>';
        return;
    }

    // Build GitHub-style yearly heatmap from commit data
    // Create a 52-week × 7-day grid covering the past year
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Build per-day change counts from hotspot commit data
    const dayMap = {}; // 'YYYY-MM-DD' -> count
    if (state.data && state.data.churn) {
        state.data.churn.forEach(c => {
            const key = c.date ? c.date.slice(0, 10) : null;
            if (key) dayMap[key] = (dayMap[key] || 0) + (c.linesAdded || 0) + (c.linesDeleted || c.linesRemoved || 0);
        });
    }
    // Fallback: count file changes
    if (Object.keys(dayMap).length === 0 && state.data && state.data.meta) {
        hotspots.forEach(f => { dayMap['total'] = (dayMap['total'] || 0) + (f.changeCount || 0); });
    }

    const maxVal = Math.max(...Object.values(dayMap), 1);

    // Start from the Sunday before or on oneYearAgo
    const startDate = new Date(oneYearAgo);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Generate weeks and track months
    let html = '<div class="gh-heatmap-months">';
    const weeks = [];
    const monthLabels = [];
    let cursor = new Date(startDate);
    let currentWeek = [];
    let lastMonth = -1;

    while (cursor <= now) {
        const day = cursor.getDay();
        if (day === 0 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        const month = cursor.getMonth();
        if (month !== lastMonth && day === 0) {
            monthLabels.push({ weekIdx: weeks.length, label: cursor.toLocaleDateString(undefined, { month: 'short' }) });
            lastMonth = month;
        }
        const key = cursor.toISOString().slice(0, 10);
        const val = dayMap[key] || 0;
        const ratio = val / maxVal;
        const lvl = val === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
        const dateLabel = cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        currentWeek.push({ lvl, tooltip: `${dateLabel}: ${val} lines changed` });
        cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Month labels row
    const totalWeeks = weeks.length;
    let monthHtml = '';
    monthLabels.forEach((m, i) => {
        const nextIdx = i + 1 < monthLabels.length ? monthLabels[i + 1].weekIdx : totalWeeks;
        const span = nextIdx - m.weekIdx;
        monthHtml += `<span class="gh-month-label" style="grid-column: span ${span}">${m.label}</span>`;
    });
    html = `<div class="gh-heatmap-row"><div class="gh-heatmap-day-spacer"></div><div class="gh-heatmap-months" style="grid-template-columns:repeat(${totalWeeks},14px)">${monthHtml}</div></div>`;

    // Day labels + grid side by side
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    const dayHtml = dayLabels.map(d => `<span class="gh-day-label">${d}</span>`).join('');

    // Grid: 7 rows × N columns
    let gridHtml = '';
    for (let day = 0; day < 7; day++) {
        for (let w = 0; w < weeks.length; w++) {
            const cell = weeks[w][day];
            if (cell) {
                gridHtml += `<div class="heat-box heat-lvl-${cell.lvl}" title="${cell.tooltip}"></div>`;
            } else {
                gridHtml += `<div class="heat-box heat-lvl-empty"></div>`;
            }
        }
    }

    html += `<div class="gh-heatmap-row"><div class="gh-heatmap-days">${dayHtml}</div><div class="gh-heatmap-grid" style="grid-template-columns:repeat(${totalWeeks},14px);grid-template-rows:repeat(7,14px)">${gridHtml}</div></div>`;

    container.innerHTML = html;
}


function renderBurnout(burnout) {
    if (!burnout) return;
    const flags = (burnout.flags || []).map(f => '<div class="burnout-flag"><div class="burnout-flag-dot"></div><p class="burnout-flag-text">' + f + '</p></div>').join('');
    DOM.burnoutMetrics.innerHTML = '<div class="burnout-counters">' +
        '<div class="burnout-counter"><div class="burnout-counter-value">' + (burnout.afterHoursCommits || 0) + '</div><div class="burnout-counter-label">After-hours</div></div>' +
        '<div class="burnout-counter"><div class="burnout-counter-value">' + (burnout.weekendCommits || 0) + '</div><div class="burnout-counter-label">Weekend</div></div>' +
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
    DOM.knowledgeList.innerHTML = knowledge.slice(0, 8).map(s => {
        const fn = s.path.split(/[/\\]/).pop();
        const bw = Math.min(100, s.authorshipPercent);
        const fc = s.authorshipPercent > 70 ? 'danger' : s.authorshipPercent > 40 ? 'warning' : '';
        return '<div class="analysis-item"><div class="analysis-item-header"><p class="analysis-filename">' + _fileLink(s.path, fn) + '</p><div class="status-dot ' + s.riskLevel + '"></div></div>' +
            '<p class="analysis-meta">' + s.mainContributor + '</p>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill ' + fc + '" style="width:' + bw + '%"></div></div>' +
            '<p class="analysis-meta" style="margin-top:0.3rem">' + s.authorshipPercent.toFixed(0) + '% ownership</p></div>';
    }).join('');
}

function renderCoupling(coupling) {
    if (!coupling || coupling.length === 0) { DOM.couplingList.innerHTML = '<p class="empty-state">No coupling data.</p>'; return; }
    DOM.couplingList.innerHTML = coupling.slice(0, 8).map(l => {
        const hf = l.head.split(/[/\\]/).pop(), tf = l.tail.split(/[/\\]/).pop();
        const st = Math.round(l.coupling * 100);
        const fc = st > 70 ? 'danger' : st > 40 ? 'warning' : '';
        return '<div class="analysis-item"><div class="coupling-pair">' +
            '<span class="analysis-filename" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _fileLink(l.head, hf) + '</span>' +
            '<span class="coupling-arrow">&harr;</span>' +
            '<span class="analysis-filename" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _fileLink(l.tail, tf) + '</span></div>' +
            '<div class="coupling-strength"><div class="progress-bar-track" style="flex:1;margin-top:0"><div class="progress-bar-fill ' + fc + '" style="width:' + st + '%"></div></div><span class="coupling-pct">' + st + '%</span></div>' +
            '<p class="coupling-shared">' + l.sharedCommits + ' shared commits</p></div>';
    }).join('');
}

function renderImpact(impact) {
    if (!impact || impact.length === 0) { DOM.impactList.innerHTML = '<p class="empty-state">No impact data.</p>'; return; }
    const mx = Math.max(...impact.map(i => i.blastRadius || 0), 1);
    DOM.impactList.innerHTML = impact.slice(0, 6).map(f => {
        const fn = f.path.split(/[/\\]/).pop(), r = f.blastRadius || 0;
        const bw = Math.min(100, (r / mx) * 100);
        return '<div class="analysis-item"><div class="analysis-item-header"><p class="analysis-filename">' + _fileLink(f.path, fn) + '</p><span style="font-size:0.65rem;font-weight:900;color:var(--primary);flex-shrink:0">~' + r.toFixed(1) + '</span></div>' +
            '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + bw + '%"></div></div>' +
            '<p class="analysis-meta" style="margin-top:0.3rem">avg ' + r.toFixed(1) + ' - max ' + (f.maxBlastRadius || Math.ceil(r)) + '</p></div>';
    }).join('');
}

function renderRot(rot) {
    if (!rot || rot.length === 0) { DOM.rotList.innerHTML = '<p class="empty-state">No stale files.</p>'; return; }
    DOM.rotList.innerHTML = rot.slice(0, 8).map(fp => {
        const fn = fp.split(/[/\\]/).pop();
        return '<div class="rot-item"><div class="rot-dot"></div><p class="rot-file">' + _fileLink(fp, fn) + '</p></div>';
    }).join('');
}

function renderContributorsTable(contributors) {
    if (!contributors || contributors.length === 0) {
        DOM.contributorsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--muted-fg);font-size:0.75rem">No contributors found.</td></tr>';
        return;
    }
    const sorted = [...contributors].sort((a, b) => b.commitCount - a.commitCount);
    DOM.contributorsBody.innerHTML = sorted.map((c, i) => {
        const col = AUTHOR_COLORS[i % AUTHOR_COLORS.length];
        const ini = c.author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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