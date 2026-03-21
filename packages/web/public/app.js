/**
 * Git Compass Dashboard - Core Logic
 */

// --- State Management ---
let state = {
    repoPath: localStorage.getItem('gc_repoPath') || '',
    branch: localStorage.getItem('gc_branch') || 'HEAD',
    window: localStorage.getItem('gc_window') || '30d',
    aiEnabled: localStorage.getItem('gc_aiEnabled') === 'true',
    aiProvider: localStorage.getItem('gc_aiProvider') || 'openai',
    aiApiKey: localStorage.getItem('gc_aiApiKey') || '',
    data: null,
    loading: false
};

// --- DOM Elements ---
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
    aiSettings: document.querySelector('.ai-settings')
};

// --- Charts ---
let churnChart = null;
let healthRadar = null;

// --- Initialize ---
async function init() {
    lucide.createIcons();
    setupEventListeners();
    populateSettingsForm();
    await fetchBranches();
    await refreshData();
}

function setupEventListeners() {
    DOM.settingsToggle.onclick = () => DOM.settingsSidebar.classList.toggle('translate-x-0');
    DOM.settingsClose.onclick = () => DOM.settingsSidebar.classList.remove('translate-x-0');
    
    DOM.settingsForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(DOM.settingsForm);
        state.repoPath = formData.get('repoPath');
        state.window = formData.get('window');
        state.aiEnabled = formData.get('aiEnabled') === 'on';
        state.aiProvider = formData.get('aiProvider');
        state.aiApiKey = formData.get('aiApiKey');
        
        localStorage.setItem('gc_repoPath', state.repoPath);
        localStorage.setItem('gc_window', state.window);
        localStorage.setItem('gc_aiEnabled', state.aiEnabled);
        localStorage.setItem('gc_aiProvider', state.aiProvider);
        localStorage.setItem('gc_aiApiKey', state.aiApiKey);
        
        DOM.settingsSidebar.classList.remove('translate-x-0');
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    analysisContext: state.data,
                    aiProvider: state.aiProvider,
                    aiApiKey: state.aiApiKey
                })
            });
            const { answer, error } = await res.json();
            
            DOM.queryResponse.classList.remove('hidden');
            DOM.queryText.innerText = error || answer;
        } catch (e) {
            console.error(e);
        } finally {
            DOM.queryBtn.disabled = false;
            DOM.queryBtn.innerText = 'Consult AI';
        }
    };

    DOM.settingsForm.querySelector('[name="aiEnabled"]').onchange = (e) => {
        DOM.aiSettings.classList.toggle('hidden', !e.target.checked);
    };
}

function populateSettingsForm() {
    const f = DOM.settingsForm;
    f.repoPath.value = state.repoPath;
    f.window.value = state.window;
    f.aiEnabled.checked = state.aiEnabled;
    f.aiProvider.value = state.aiProvider;
    f.aiApiKey.value = state.aiApiKey;
    DOM.aiSettings.classList.toggle('hidden', !state.aiEnabled);
}

async function fetchBranches() {
    try {
        const res = await fetch(`/api/branches?repoPath=${encodeURIComponent(state.repoPath)}`);
        const { branches } = await res.json();
        if (branches) {
            DOM.branchSelect.innerHTML = branches.map(b => 
                `<option value="${b}" ${b === state.branch ? 'selected' : ''}>${b}</option>`
            ).join('');
        }
    } catch (e) {
        console.error("Failed to fetch branches", e);
    }
}

async function refreshData() {
    DOM.loadingOverlay.classList.remove('opacity-0', 'hidden');
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repoPath: state.repoPath,
                branch: state.branch,
                window: state.window,
                ai: state.aiEnabled,
                aiProvider: state.aiProvider,
                aiApiKey: state.aiApiKey
            })
        });
        
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        state.data = data;
        renderDashboard(data);
    } catch (e) {
        alert("Analysis failed: " + e.message);
    } finally {
        DOM.loadingOverlay.classList.add('opacity-0');
        setTimeout(() => DOM.loadingOverlay.classList.add('hidden'), 500);
    }
}

function renderDashboard(data) {
    const { meta, hotspots, riskScores, churn, contributors, aiSummary, health } = data;
    
    // Header & Meta
    const folderName = meta.repoPath.split(/[\\/]/).filter(Boolean).pop() || 'Repository';
    DOM.repoName.innerText = folderName;
    DOM.repoMeta.innerText = `${meta.commitCount} commits analyzed • ${meta.window} window`;
    
    const avgHealth = Math.round((health.stability + health.velocity + health.simplicity + health.coverage + health.decoupling) / 5);
    DOM.healthScore.innerText = `${avgHealth}%`;
    
    // Metrics
    DOM.metricFiles.innerText = hotspots.length;
    DOM.metricAuthors.innerText = contributors.length;
    
    const totalLines = churn.reduce((acc, curr) => acc + curr.linesAdded, 0);
    DOM.metricChurn.innerText = totalLines >= 1000 ? `${(totalLines/1000).toFixed(1)}k` : totalLines;
    
    const avgRisk = Math.round(riskScores.reduce((acc, curr) => acc + curr.score, 0) / (riskScores.length || 1));
    DOM.metricRisk.innerText = avgRisk;
    DOM.metricRisk.className = `text-3xl font-black tracking-tighter ${avgRisk > 60 ? 'text-destructive' : avgRisk > 30 ? 'text-yellow-500' : 'text-primary'}`;

    // AI Summary
    DOM.aiSummary.innerText = aiSummary || "Analysis complete. Use AI Settings to enable deep insights.";
    
    // Risk List
    DOM.riskList.innerHTML = riskScores.slice(0, 5).map(risk => `
        <div class="flex items-center justify-between p-4 rounded-xl bg-card shadow-neumo-flat border border-white/5 hover:scale-[1.02] transition-all cursor-pointer group">
            <div class="overflow-hidden mr-4">
                <p class="text-xs font-bold truncate text-foreground/80 group-hover:text-primary">${risk.path.split(/[\\/]/).pop()}</p>
                <p class="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Impact Score: ${risk.score}</p>
            </div>
            <div class="h-2 w-2 rounded-full ${risk.score > 70 ? 'bg-destructive animate-pulse' : risk.score > 40 ? 'bg-yellow-500' : 'bg-green-500'}"></div>
        </div>
    `).join('');

    // Charts
    renderChurnChart(churn);
    renderHealthRadar(health);
}

function renderChurnChart(churnData) {
    if (churnChart) churnChart.destroy();
    
    const ctx = document.getElementById('churn-chart').getContext('2d');
    const addedGradient = ctx.createLinearGradient(0, 0, 0, 300);
    addedGradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
    addedGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    const deletedGradient = ctx.createLinearGradient(0, 0, 0, 300);
    deletedGradient.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
    deletedGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

    churnChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: churnData.map(d => d.date),
            datasets: [
                {
                    label: 'Lines Added',
                    data: churnData.map(d => d.linesAdded),
                    borderColor: '#4f46e5',
                    backgroundColor: addedGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#4f46e5',
                    borderWidth: 3
                },
                {
                    label: 'Lines Deleted',
                    data: churnData.map(d => d.linesDeleted),
                    borderColor: '#ef4444',
                    backgroundColor: deletedGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#ef4444',
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 10, weight: 'bold' },
                        usePointStyle: true,
                        boxWidth: 6
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#64748b',
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { 
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 9 } }
                },
                y: { 
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#64748b', font: { size: 10 } }
                }
            }
        }
    });
}

function renderHealthRadar(health) {
    if (healthRadar) healthRadar.destroy();
    
    const labels = Object.keys(health).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const values = Object.values(health);
    
    const ctx = document.getElementById('health-radar').getContext('2d');
    healthRadar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'Repository Health',
                data: values,
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderColor: '#4f46e5',
                borderWidth: 3,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#4f46e5',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false }
            },
            scales: {
                r: {
                    angleLines: { color: 'rgba(0,0,0,0.05)' },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    pointLabels: { 
                        color: '#0f172a', 
                        font: { size: 11, weight: '900' },
                        padding: 15
                    },
                    ticks: { 
                        display: false, 
                        stepSize: 20 
                    },
                    beginAtZero: true,
                    max: 100,
                    suggestedMin: 0
                }
            }
        }
    });

    // Legend
    DOM.healthLegend.innerHTML = Object.entries(health).map(([key, val]) => `
        <div class="p-3 rounded-lg bg-background/30 shadow-neumo-pressed border border-white/5">
            <p class="text-[9px] font-black uppercase text-muted-foreground mb-1">${key}</p>
            <p class="text-sm font-black">${val}%</p>
        </div>
    `).join('');
}

// Start
init();
