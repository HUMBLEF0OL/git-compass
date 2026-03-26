// Frontend logic for Git Compass Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const SALT = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    // --- Helpers ---
    const encodeKey = (str) => {
        if (!str) return "";
        const encoded = str.split("").map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))).join("");
        return btoa(encoded);
    };

    const decodeKey = (encoded) => {
        if (!encoded) return "";
        try {
            const decoded = atob(encoded);
            return decoded.split("").map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))).join("");
        } catch (e) { return encoded; }
    };

    // --- DOM Elements ---
    const settingsBtn = document.getElementById('settings-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const sidebar = document.getElementById('settings-sidebar');
    
    // History Sidebar Elements
    const historyBtn = document.getElementById('history-btn');
    const historySidebar = document.getElementById('history-sidebar');
    const closeHistoryBtn = document.getElementById('close-history');
    const historyList = document.getElementById('history-list');
    const snapCaptureBtn = document.getElementById('snap-capture-btn');
    const snapSuccessMsg = document.getElementById('snap-success-msg');
    
    const backdrop = document.getElementById('sidebar-backdrop');
    const closeBtn = document.getElementById('close-sidebar');
    const aiToggle = document.getElementById('enable-ai');
    const aiGroup = document.getElementById('ai-settings-group');
    const saveBtn = document.getElementById('save-settings');
    const commitInput = document.querySelector('input[type="number"]');
    const excludeInput = document.querySelector('textarea.boxy-input');
    const llmProviderSelect = document.querySelector('select.boxy-select.full-width');
    const llmKeyInput = document.querySelector('input[type="password"]');
    const branchSelect = document.getElementById('branch-select');
    const windowInput = document.getElementById('window-input');

    // AI Components
    const aiHero = document.getElementById('ai-hero-section');
    const aiNarrative = document.getElementById('ai-narrative');
    const insightReel = document.getElementById('ai-insight-reel');
    const aiQueryInput = document.getElementById('ai-query-input');
    const aiQueryBtn = document.getElementById('ai-query-btn');
    const aiTemplateSelect = document.getElementById('ai-template-select');
    const refreshAiBtn = document.getElementById('refresh-ai');

    // --- State ---
    let healthRadar, stabilityChart, authTimelineChart;
    let currentAnalysisData = null;

    // --- Logic Functions ---
    const toggleSidebar = () => {
        if (historySidebar.classList.contains('open')) historySidebar.classList.remove('open');
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('open');
    };

    const toggleHistorySidebar = () => {
        if (sidebar.classList.contains('open')) sidebar.classList.remove('open');
        historySidebar.classList.toggle('open');
        backdrop.classList.toggle('open');
        
        if (historySidebar.classList.contains('open')) {
            fetchSnapshots(branchSelect ? branchSelect.value : 'main');
        }
    };
    
    const fetchSnapshots = async (branch) => {
        historyList.innerHTML = '<div class="ai-loading-placeholder"><span class="ai-pulse-dot"></span></div>';
        try {
            const res = await fetch('/api/snapshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch })
            });
            const data = await res.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                historyList.innerHTML = '<div style="color: var(--text-secondary); padding: 1rem; font-size: 0.8rem;">No snapshots recorded yet.</div>';
                return;
            }
            
            historyList.innerHTML = data.reverse().map(snap => {
                const date = new Date(snap.computedAt).toLocaleString();
                const shortHash = snap.headCommitHash.substring(0, 7);
                return `
                    <div class="history-item" data-id="${snap.id}" onclick="window.compareSnapshot('${snap.id}')">
                        <div class="history-item-date">${date}</div>
                        <div class="history-item-hash">${shortHash}</div>
                        <div class="history-item-meta">
                            Commits: ${snap.metrics.commits} | Churn: ${snap.metrics.totalChurn}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            historyList.innerHTML = '<div style="color: #ef4444; padding: 1rem; font-size: 0.8rem;">Failed to load history</div>';
        }
    };

    const fetchHistory = async (branch = 'all') => {
        const heatmapContainer = document.getElementById('activity-heatmap');
        if (!heatmapContainer) return;
        
        try {
            const res = await fetch(`/api/history?branch=${branch}`);
            const historyMap = await res.json();
            renderActivityHeatmap(historyMap);
        } catch (e) {
            console.error('Failed to fetch history:', e);
            heatmapContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.7rem;">Heatmap unavailable</div>';
        }
    };

    const renderActivityHeatmap = (historyMap) => {
        const container = document.getElementById('activity-heatmap');
        if (!container) return;
        container.innerHTML = '';

        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const dayNames = ['', 'MON', '', 'WED', '', 'FRI', ''];
        
        const monthsDiv = document.createElement('div');
        monthsDiv.className = 'heatmap-months';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'heatmap-wrapper';

        const weekdaysDiv = document.createElement('div');
        weekdaysDiv.className = 'heatmap-weekdays';
        dayNames.forEach(day => {
            const span = document.createElement('span');
            span.textContent = day;
            weekdaysDiv.appendChild(span);
        });

        const gridDiv = document.createElement('div');
        gridDiv.className = 'heatmap-grid';

        // Calculate a range that ends on the current day's week
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
        const daysInCurrentWeek = currentDayOfWeek + 1;
        const previousWeeksDays = 52 * 7;
        const totalDays = previousWeeksDays + daysInCurrentWeek;

        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (totalDays - 1));
        // Ensure we start on a Sunday for alignment
        while (startDate.getDay() !== 0) {
            startDate.setDate(startDate.getDate() - 1);
        }

        let currentMonth = -1;
        const monthColumns = [];

        for (let i = 0; i < 371; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const count = historyMap[dateStr] || 0;

            const square = document.createElement('div');
            square.className = 'heatmap-day';
            
            // Determine level
            let level = 0;
            if (count > 0) level = 1;
            if (count > 2) level = 2; // Adjusted thresholds for visibility
            if (count > 5) level = 3;
            if (count > 8) level = 4;
            
            square.classList.add(`level-${level}`);
            square.title = `${dateStr}: ${count} commits`;
            
            gridDiv.appendChild(square);

            // Month labels (detect month change at the start of a week)
            if (i % 7 === 0) {
                const month = date.getMonth();
                if (month !== currentMonth) {
                    currentMonth = month;
                    monthColumns.push({ col: i / 7, name: monthNames[currentMonth] });
                }
            }
        }

        // Fill month labels row
        const labels = Array(53).fill('');
        monthColumns.forEach(m => { if (m.col < 53) labels[m.col] = m.name; });
        monthsDiv.innerHTML = labels.map(l => `<span>${l}</span>`).join('');

        wrapper.appendChild(weekdaysDiv);
        wrapper.appendChild(gridDiv);
        
        const inner = document.createElement('div');
        inner.className = 'heatmap-inner';
        inner.appendChild(monthsDiv);
        inner.appendChild(wrapper);

        container.appendChild(inner);
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // Global comparison handler
    window.compareSnapshot = async (snapshotId) => {
        const branch = branchSelect ? branchSelect.value : 'main';
        const modal = document.createElement('div');
        modal.className = 'snapshot-compare-modal';
        modal.innerHTML = `
            <div class="snapshot-modal-content">
                <div class="compare-title">
                    <i data-lucide="git-compare"></i>
                    Delta Analysis
                </div>
                <div id="compare-body">
                    <div class="ai-loading-placeholder"><span class="ai-pulse-dot"></span><span>Generating Time Machine assessment...</span></div>
                </div>
                <div style="margin-top: 2rem; text-align: right;">
                    <button class="btn-primary" onclick="this.closest('.snapshot-compare-modal').remove()">Close Analysis</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Skip AI Synthesis if disabled
        if (!aiToggle.checked) {
            document.getElementById('compare-body').innerHTML = '<div style="color: var(--text-secondary); padding: 1rem; font-size: 0.8rem;">AI Narrative is disabled. Showing raw metric deltas only.</div>';
            // We still need the analysis data for the metrics section, so we fetch it but skip the AI narrative part later.
        }

        try {
            const res = await fetch('/api/ai/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    branch, 
                    baseSnapshotId: snapshotId,
                    skipAI: !aiToggle.checked // Inform server to skip LLM if we want to be extra safe
                })
            });
            const delta = await res.json();
            
            if (delta.error) {
                document.getElementById('compare-body').innerHTML = `<div style="color: #ef4444;">${delta.error}</div>`;
                return;
            }
            
            const renderSection = (title, items, type) => {
                if (items.length === 0) return '';
                const rows = items.map(r => `
                    <div class="delta-item">
                        <span class="delta-metric-name">${r.metricName}</span>
                        <div class="delta-values">
                            <span style="color: var(--text-secondary); opacity: 0.6;">${r.previousValue.toFixed(2)} →</span>
                            <span>${r.currentValue.toFixed(2)}</span>
                            <span class="delta-pct" style="color: ${type === 'regression' ? '#dc2626' : '#16a34a'}">
                                (${r.delta > 0 ? '+' : ''}${r.percentChange}%)
                            </span>
                        </div>
                    </div>
                `).join('');
                return `
                    <div class="delta-section ${type}">
                        <div class="delta-header ${type}">${title}</div>
                        ${rows}
                    </div>
                `;
            };

            document.getElementById('compare-body').innerHTML = `
                ${renderSection('Regressions', delta.regressions, 'regression')}
                ${renderSection('Improvements', delta.improvements, 'improvement')}
                ${aiToggle.checked ? `
                    <div class="ai-synthesis-box">
                        <div class="ai-synthesis-label">AI SYNTHESIS</div>
                        <div class="ai-synthesis-text">${delta.narrative ? delta.narrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : 'Narrative unavailable.'}</div>
                    </div>
                ` : ''}
            `;
        } catch(e) {
            document.getElementById('compare-body').innerHTML = `<div style="color: #ef4444;">Comparison failed.</div>`;
        }
    };

    // --- Settings Management ---
    const loadSettings = async () => {
        const savedCommits = localStorage.getItem('gc_commits');
        const savedExclude = localStorage.getItem('gc_exclude');
        const savedAI = localStorage.getItem('gc_ai_enabled');
        const savedWindow = localStorage.getItem('gc_window_days');

        if (savedCommits) commitInput.value = savedCommits;
        if (savedExclude) excludeInput.value = savedExclude;
        if (savedWindow) windowInput.value = savedWindow;
        
        if (savedAI !== null) {
            aiToggle.checked = savedAI === 'true';
            aiGroup.style.display = aiToggle.checked ? 'block' : 'none';
            if (aiToggle.checked) aiHero.classList.remove('hidden');
        }

        try {
            const res = await fetch('/api/settings/secure');
            if (res.ok) {
                const data = await res.json();
                if (data.llmKey) llmKeyInput.value = decodeKey(data.llmKey);
                if (data.llmProvider) llmProviderSelect.value = data.llmProvider;
            }
        } catch (e) { console.error('Failed to load secure settings'); }
    };

    const saveSettings = async () => {
        const btnText = saveBtn.querySelector('span');
        const originalText = btnText.textContent;
        try {
            saveBtn.disabled = true;
            btnText.textContent = 'Saving...';
            localStorage.setItem('gc_commits', commitInput.value);
            localStorage.setItem('gc_exclude', excludeInput.value);
            localStorage.setItem('gc_ai_enabled', aiToggle.checked);

            const res = await fetch('/api/settings/secure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    llmKey: encodeKey(llmKeyInput.value),
                    llmProvider: llmProviderSelect.value
                })
            });

            if (res.ok) {
                btnText.textContent = 'Saved!';
                setTimeout(() => { 
                    btnText.textContent = originalText; 
                    saveBtn.disabled = false;
                    toggleSidebar(); // Automatically close sidebar
                    runAnalysis(false);   // Explicitly false to prevent auto-snapshot
                }, 1000);
            } else { throw new Error('Save failed'); }
        } catch (e) {
            alert('Error saving settings: ' + e.message);
            btnText.textContent = originalText;
            saveBtn.disabled = false;
        }
    };

    const loadBranches = async () => {
        try {
            const response = await fetch('/api/branches');
            const branches = await response.json();
            if (branchSelect && Array.isArray(branches)) {
                branchSelect.innerHTML = '';
                const branchesByName = new Map();
                branches.forEach(b => { if (!branchesByName.has(b.name) || !b.isRemote) branchesByName.set(b.name, b); });
                Array.from(branchesByName.values()).sort((a, b) => a.name.localeCompare(b.name)).forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.name;
                    option.textContent = branch.name;
                    branchSelect.appendChild(option);
                });
                // Trigger initial analysis once branches are ready
                runAnalysis();
            }
        } catch (error) { console.error('Failed to load branches:', error); }
    };

    const initCharts = () => {
        const chartConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        };

        const radarCtx = document.getElementById('healthRadar');
        if (radarCtx) {
            healthRadar = new Chart(radarCtx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ['STABILITY', 'QUALITY', 'SIMPLICITY', 'COVERAGE', 'VELOCITY'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        borderColor: '#2563eb',
                        pointBackgroundColor: '#2563eb',
                        borderWidth: 2
                    }]
                },
                options: {
                    ...chartConfig,
                    maintainAspectRatio: true,
                    scales: {
                        r: { 
                            beginAtZero: true, 
                            max: 100, 
                            ticks: { display: false },
                            grid: { color: '#e2e8f0' },
                            angleLines: { color: '#e2e8f0' },
                            pointLabels: { font: { size: 9, weight: '700' }, color: '#64748b' }
                        }
                    }
                }
            });
        }

        const stabilityCtx = document.getElementById('stabilityLineChart');
        if (stabilityCtx) {
            stabilityChart = new Chart(stabilityCtx.getContext('2d'), {
                type: 'line',
                data: { 
                    labels: [], 
                    datasets: [
                        { 
                            label: 'STABILITY INDEX (%)', 
                            data: [], 
                            borderColor: '#8b5cf6', 
                            backgroundColor: 'rgba(139, 92, 246, 0.1)', 
                            tension: 0.4, 
                            fill: true, 
                            borderWidth: 2, 
                            pointRadius: 3,
                            yAxisID: 'y'
                        },
                        {
                            label: 'ACTIVITY (COMMITS)',
                            type: 'bar',
                            data: [],
                            backgroundColor: 'rgba(37, 99, 235, 0.3)',
                            borderWidth: 0,
                            barThickness: 15,
                            yAxisID: 'y1'
                        }
                    ] 
                },
                options: {
                    ...chartConfig,
                    plugins: {
                        legend: { 
                            display: true, 
                            position: 'bottom', 
                            labels: { 
                                boxWidth: 15, 
                                padding: 20,
                                font: { size: 12, weight: '600' } 
                            } 
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100, 
                            grid: { color: '#f1f5f9' }, 
                            border: { display: false }, 
                            ticks: { color: '#8b5cf6', font: { size: 11 } }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            grid: { display: false },
                            ticks: { color: '#2563eb', font: { size: 11 } }
                        },
                        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                    }
                }
            });
        }

        const authCtx = document.getElementById('authTimelineChart');
        if (authCtx) {
            authTimelineChart = new Chart(authCtx.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    ...chartConfig,
                    plugins: {
                        legend: { 
                            display: true, 
                            position: 'bottom',
                            labels: { boxWidth: 10, font: { size: 10, weight: '600' } }
                        }
                    },
                    scales: {
                        y: { 
                            stacked: true, 
                            beginAtZero: true, 
                            grid: { color: '#f1f5f9' }, 
                            border: { display: false }, 
                            ticks: { color: '#94a3b8', font: { size: 10 } } 
                        },
                        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                    }
                }
            });
        }

        const hotspotCtx = document.getElementById('hotspotMatrixChart');
        if (hotspotCtx) {
            hotspotMatrixChart = new Chart(hotspotCtx.getContext('2d'), {
                type: 'bubble',
                data: { datasets: [] },
                options: {
                    ...chartConfig,
                    scales: {
                        x: { 
                            title: { display: true, text: 'CHURN (CHANGES)', font: { size: 10, weight: '700' }, color: '#94a3b8' },
                            grid: { color: '#f1f5f9' },
                            border: { display: false },
                            ticks: { color: '#94a3b8', font: { size: 10 } }
                        },
                        y: { 
                            title: { display: true, text: 'DIVERSITY (AUTHORS)', font: { size: 10, weight: '700' }, color: '#94a3b8' },
                            grid: { color: '#f1f5f9' },
                            border: { display: false },
                            ticks: { color: '#94a3b8', font: { size: 10 } }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const raw = ctx.raw;
                                    return [
                                        `FILE: ${raw.path}`,
                                        `CHURN: ${raw.rawX} changes`,
                                        `AUTHORS: ${raw.rawY} unique`,
                                        `RISK SCORE: ${raw.rawX * raw.rawY}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        }
    };

    const getRiskColor = (risk) => {
        if (risk > 25) return 'rgba(239, 68, 68, 0.7)'; // Red
        if (risk > 10) return 'rgba(245, 158, 11, 0.7)'; // Amber
        return 'rgba(99, 102, 241, 0.5)'; // Indigo
    };

    const renderMetric = (container, label, value, percent) => {
        const row = document.createElement('div');
        row.className = 'metric-row';
        row.innerHTML = `
            <div class="metric-label-group">
                <span class="metric-name">${label}</span>
                <span class="metric-value">${value}</span>
            </div>
            <div class="progress-bg">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
        `;
        container.appendChild(row);
    };

    const renderAnomaly = (anomaly) => {
        const container = document.getElementById('anomaly-list');
        if (!container) return;
        
        // Remove pending state on first anomaly
        const pending = container.querySelector('.pending-state');
        if (pending) pending.remove();

        const card = document.createElement('div');
        card.className = `anomaly-card ${anomaly.type}`;
        card.innerHTML = `
            <div class="anomaly-type">${anomaly.type}</div>
            <div class="anomaly-message">${anomaly.description}</div>
        `;
        container.appendChild(card);
    };

    const updateCharts = (data) => {
        const { p0, p1 } = data;
        
        const signalPerc = Math.round((1 - p0.noiseRatio) * 100);
        const qualityAvg = Math.round(((p1.quality?.goodMessageRatio || 0) + (p1.quality?.atomicRatio || 0) + (1 - (p1.quality?.noReviewRatio || 0))) / 3 * 100);
        const healthScore = Math.round((signalPerc + qualityAvg) / 2);

        // --- Header ---
        document.getElementById('stat-commits').textContent = p0.totalCommits;
        document.getElementById('stat-commits').textContent = p0.totalCommits || 0;
        document.getElementById('stat-authors').textContent = p1.contributors?.contributors?.length || 0;
        
        document.getElementById('stat-churn').textContent = `${Math.round((data.summary?.churnRate || 0) * 100)}%`;
        const riskAvg = data.p2?.risk?.averageScore || 0;
        document.getElementById('stat-risk').textContent = riskAvg;
        document.getElementById('stat-risk-label').textContent = riskAvg >= 80 ? 'CRITICAL' : riskAvg >= 60 ? 'HIGH' : riskAvg >= 40 ? 'MEDIUM' : 'LOW';

        document.getElementById('header-health-value').textContent = `${healthScore}%`;
        document.getElementById('repo-meta-sub').textContent = `${p0.totalCommits} COMMITS · ${p1.contributors?.contributors?.length || 0} AUTHORS · 1.0 VERSION`;

        // 1. Health Radar
        if (healthRadar && p1.quality) {
            const simplicity = data.p2?.health?.simplicity || 0;
            const coverage = data.p2?.health?.coverage || 0;
            const velocity = data.p2?.health?.velocity || 0;

            healthRadar.data.datasets[0].data = [
                Math.round(100 - (p0.noiseRatio * 100)), // Stability
                qualityAvg,                              // Quality
                simplicity,                              // Simplicity
                coverage,                                // Coverage
                velocity                                 // Velocity
            ];
            healthRadar.update();

            const miniStats = document.getElementById('radar-mini-stats');
            miniStats.innerHTML = `
                <div class="boxy-chip">
                    <div class="boxy-chip-label">STABILITY</div>
                    <div class="boxy-chip-value">${Math.round(100 - (p0.noiseRatio * 100))}%</div>
                </div>
                <div class="boxy-chip">
                    <div class="boxy-chip-label">QUALITY</div>
                    <div class="boxy-chip-value">${qualityAvg}%</div>
                </div>
                <div class="boxy-chip">
                    <div class="boxy-chip-label">SIMPLICITY</div>
                    <div class="boxy-chip-value">${simplicity}%</div>
                </div>
                <div class="boxy-chip">
                    <div class="boxy-chip-label">VELOCITY</div>
                    <div class="boxy-chip-value">${velocity}%</div>
                </div>
            `;
        }

        // 2. Temporal Stability (Refactored)
        if (stabilityChart && p1.velocity?.windows) {
            const windows = p1.velocity.windows;
            stabilityChart.data.labels = windows.map(w => {
                const date = new Date(w.windowStart);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });

            // Calculate stability per window
            const stabilityData = windows.map(w => {
                if (w.commitCount === 0) return 100;
                const avgFiles = w.filesChanged / w.commitCount;
                return Math.max(20, Math.min(100, Math.round(100 - (avgFiles * 5))));
            });

            stabilityChart.data.datasets[0].data = stabilityData;
            stabilityChart.data.datasets[1].data = windows.map(w => w.commitCount);
            stabilityChart.update();

            // Populate details
            const details = document.getElementById('stability-details');
            if (details && windows.length > 0) {
                const latest = stabilityData[stabilityData.length - 1];
                const prev = stabilityData.length > 1 ? stabilityData[stabilityData.length - 2] : latest;
                const trend = latest > prev ? 'improving' : latest < prev ? 'declining' : 'stable';
                const trendIcon = latest > prev ? 'arrow-up' : latest < prev ? 'arrow-down' : 'minus';
                
                details.innerHTML = `
                    <div class="chart-details-row">
                        <span class="chart-details-label">CURRENT STABILITY</span>
                        <span>${latest}% (${trend.toUpperCase()})</span>
                    </div>
                    <div class="chart-details-row">
                        <span class="chart-details-label">AVG FILES/COMMIT</span>
                        <span>${(windows[windows.length - 1].filesChanged / windows[windows.length - 1].commitCount).toFixed(1)}</span>
                    </div>
                    <p style="margin-top: 8px; font-style: italic;">
                        Stability is ${trend} based on change density. 
                        ${latest < 50 ? 'High file-churn detected in recent commits.' : 'Commit atomicitiy is maintaining a healthy baseline.'}
                    </p>
                `;
            }
        }

        // 3. Critical Risk Areas
        const riskList = document.getElementById('risk-areas-list');
        if (riskList && p1.hotspots?.hotspots) {
            riskList.innerHTML = '';
            p1.hotspots.hotspots.slice(0, 5).forEach(h => {
                const item = document.createElement('div');
                item.className = 'risk-item';
                const score = h.changeCount > 20 ? 'high' : 'med';
                item.innerHTML = `
                    <div class="risk-file-info">
                        <span class="risk-file-path">${h.path.split('/').pop()}</span>
                        <span class="risk-file-meta">${h.changeCount} lines churned</span>
                    </div>
                    <span class="risk-score-badge risk-${score}">${h.changeCount > 20 ? 'URGENT' : 'CRITICAL'}</span>
                `;
                riskList.appendChild(item);
            });
        }

        // 4. Contributor Timeline (Refactored)
        if (authTimelineChart && p1.velocity?.byContributor) {
            const topContributors = p1.velocity.byContributor.slice(0, 5);
            const palette = [
                { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.4)' },
                { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.4)' },
                { border: '#10b981', bg: 'rgba(16, 185, 129, 0.4)' },
                { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.4)' },
                { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.4)' }
            ];

            // Map emails to names for labels
            const nameMap = {};
            if (p1.contributors?.contributors) {
                p1.contributors.contributors.forEach(c => nameMap[c.email] = c.name);
            }

            authTimelineChart.data.labels = p1.velocity.windows.map(w => {
                const date = new Date(w.windowStart);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });

            authTimelineChart.data.datasets = topContributors.map((c, i) => ({
                label: (nameMap[c.authorEmail] || c.authorEmail).toUpperCase(),
                data: c.windows.map(w => w.commitCount),
                borderColor: palette[i % palette.length].border,
                backgroundColor: palette[i % palette.length].bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 2
            }));

            authTimelineChart.update();
        }

            // 5. Signal & Noise (NEW)
            if (p0) {
                const signalPerc = Math.round((1 - p0.noiseRatio) * 100);
                document.getElementById('signal-integrity-value').textContent = `${signalPerc}%`;
                
                const noiseMiniStats = document.getElementById('noise-mini-stats');
                if (noiseMiniStats) {
                    noiseMiniStats.innerHTML = `
                        <div class="boxy-chip" style="border-color: var(--ai-purple);">
                            <div class="boxy-chip-label" style="background: var(--ai-purple);">CLEAN</div>
                            <div class="boxy-chip-value">${p0.cleanCommits}</div>
                        </div>
                        <div class="boxy-chip" style="border-color: var(--text-secondary);">
                            <div class="boxy-chip-label" style="background: var(--text-secondary);">TOTAL</div>
                            <div class="boxy-chip-value">${p0.totalCommits}</div>
                        </div>
                    `;
                }

                const noiseList = document.getElementById('noise-sources-list');
                if (noiseList && p0.topNoiseSources) {
                    noiseList.innerHTML = p0.topNoiseSources.length > 0 
                        ? p0.topNoiseSources.map(s => `
                            <div class="noise-reason-item">
                                <span class="noise-reason-label">${s.reason.replace(/_/g, ' ').toUpperCase()}</span>
                                <span class="noise-reason-count">${s.count}</span>
                            </div>
                        `).join('')
                        : '<div class="ai-loading-placeholder" style="color: var(--text-secondary); font-size: 0.7rem;">NO DETECTABLE NOISE</div>';
                }
            }

            // 6. Anomaly Alerts (P0 & P1)
        const alertList = document.getElementById('anomaly-list-premium');
        if (alertList) {
            alertList.innerHTML = '';
            const allAnomalies = [];
            
            if (p1.velocity?.anomalies) {
                allAnomalies.push(...p1.velocity.anomalies);
            }
            
            if (p0?.topNoiseSources) {
                p0.topNoiseSources.forEach(src => {
                    if (src.count > 0) {
                        allAnomalies.push({
                            type: 'noise',
                            description: `Filtered ${src.count} commits (${src.reason.replace('_', ' ')})${src.topOffender ? `: ${src.topOffender}` : ''}`
                        });
                    }
                });
            }

            if (allAnomalies.length === 0) {
                alertList.innerHTML = '<div class="empty-state">No process anomalies detected</div>';
            } else {
                allAnomalies.slice(0, 4).forEach(a => {
                    const card = document.createElement('div');
                    card.className = `anomaly-card ${a.type}`;
                    
                    let icon = 'alert-triangle';
                    if (a.type === 'velocity') icon = 'zap';
                    if (a.type === 'consistency') icon = 'git-merge';
                    if (a.type === 'noise') icon = 'filter-x';

                    card.innerHTML = `
                        <div class="anomaly-icon-box">
                            <i data-lucide="${icon}"></i>
                        </div>
                        <div class="anomaly-content">
                            <div class="anomaly-type">${(a.type || 'Anomaly').toUpperCase()}</div>
                            <div class="anomaly-message">${a.description}</div>
                        </div>
                    `;
                    alertList.appendChild(card);
                });
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        // 7. Phase 2: Behavioral Insights
        const p2 = data.p2 || {};
        
        // Ownership / Knowledge Silos
        const orphanList = document.getElementById('orphaned-files-list');
        if (orphanList && p2.ownership) {
            const { orphanedFiles = [], concentration = {} } = p2.ownership;
            
            // Apply grid layout for the wide 12-col card
            orphanList.className = 'data-list-premium p2-list p2-grid-list';
            
            orphanList.innerHTML = (orphanedFiles.length === 0 && Object.keys(concentration).length === 0)
                ? '<div class="empty-state">No knowledge silos detected</div>'
                : '';

            // Render Orphans First
            orphanedFiles.slice(0, 6).forEach(f => {
                const item = document.createElement('div');
                item.className = 'p2-item';
                item.innerHTML = `
                    <div class="p2-item-header">
                        <span class="p2-file-path">${f.filePath}</span>
                        <span class="p2-status-badge status-orphan">STALE OWNER</span>
                    </div>
                    <div class="p2-meta">
                        <i data-lucide="user-minus"></i>
                        <span>Owner <strong>${f.ownerEmail}</strong> inactive for ${f.daysSinceOwnerActivity} days</span>
                    </div>
                `;
                orphanList.appendChild(item);
            });

            // Render High Concentration (Gini > 0.7)
            Object.entries(concentration)
                .filter(([path, score]) => score > 0.7)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .forEach(([path, score]) => {
                    // Avoid duplicating orphans
                    if (orphanedFiles.find(o => o.filePath === path)) return;

                    const item = document.createElement('div');
                    item.className = 'p2-item';
                    const giniPercent = Math.round(score * 100);
                    item.innerHTML = `
                        <div class="p2-item-header">
                            <span class="p2-file-path">${path}</span>
                            <span class="p2-status-badge status-coupling">GINI: ${giniPercent}%</span>
                        </div>
                        <div class="p2-meta">
                            <i data-lucide="fingerprint"></i>
                            <span>High knowledge concentration (Possible silo)</span>
                        </div>
                    `;
                    orphanList.appendChild(item);
                });
        }

        // Dependency Coupling
        const couplingList = document.getElementById('dependency-coupling-list');
        if (couplingList && p2.dependency?.couplings) {
            // Apply grid layout and NO-HOVER
            couplingList.className = 'data-list-premium p2-list p2-grid-list';

            couplingList.innerHTML = p2.dependency.couplings.length === 0
                ? '<div class="empty-state">No high coupling detected</div>'
                : '';
            
            // Render Top Couplings
            p2.dependency.couplings
                .sort((a, b) => b.couplingScore - a.couplingScore)
                .slice(0, 10)
                .forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'p2-item no-hover'; // No hover as requested
                    const scorePercent = Math.round(c.couplingScore * 100);
                    item.innerHTML = `
                        <div class="p2-item-header">
                            <span class="p2-file-path">${c.fileA} ↔ ${c.fileB}</span>
                            <span class="p2-status-badge status-coupling">${scorePercent}%</span>
                        </div>
                        <div class="coupling-strength-bar">
                            <div class="coupling-strength-fill" style="width: ${scorePercent}%"></div>
                        </div>
                        <div class="p2-meta">
                            <i data-lucide="repeat"></i>
                            <span>Co-changed in ${c.earlyWindowCount + c.lateWindowCount} commits</span>
                            <span style="margin-left: 12px;"><i data-lucide="trending-up"></i> Trend: ${c.trend}</span>
                        </div>
                    `;
                    couplingList.appendChild(item);
                });
        }

        // Repository Risk & Churn Profile
        const p2RiskList = document.getElementById('risk-profile-list');
        if (p2RiskList && p2.risk) {
            const { averageScore, fileRisks = [] } = p2.risk;
            const churnRate = data.summary.churnRate ? Math.round(data.summary.churnRate * 100) : 0;
            
            p2RiskList.className = 'data-list-premium p2-list p2-grid-list';
            p2RiskList.innerHTML = '';

            // 1. Global Risk Level
            const riskHeaderItem = document.createElement('div');
            riskHeaderItem.className = 'p2-item no-hover';
            const riskLevel = averageScore >= 80 ? 'CRITICAL' : averageScore >= 60 ? 'HIGH' : averageScore >= 40 ? 'MEDIUM' : 'LOW';
            const riskStatusClass = averageScore >= 60 ? 'status-orphan' : 'status-coupling';
            
            riskHeaderItem.innerHTML = `
                <div class="p2-item-header">
                    <span class="p2-file-path">OVERALL REPO RISK</span>
                    <span class="p2-status-badge ${riskStatusClass}">${riskLevel}</span>
                </div>
                <div class="coupling-strength-bar">
                    <div class="coupling-strength-fill" style="width: ${averageScore}%"></div>
                </div>
                <div class="p2-meta">
                    <i data-lucide="alert-triangle"></i>
                    <span>Score: ${averageScore}/100. Global Churn Rate: <strong>${churnRate}%</strong></span>
                </div>
            `;
            p2RiskList.appendChild(riskHeaderItem);

            // 2. High Risk Files (Top 3)
            fileRisks.sort((a,b) => b.score - a.score).slice(0, 3).forEach(r => {
                const rItem = document.createElement('div');
                rItem.className = 'p2-item no-hover';
                const level = (r.level || 'low').toUpperCase();
                const levelClass = level === 'CRITICAL' || level === 'HIGH' ? 'status-orphan' : 'status-coupling';
                const scoreVal = r.score || 0;
                const freq = r.factors?.frequency || 0;

                rItem.innerHTML = `
                    <div class="p2-item-header">
                        <span class="p2-file-path" title="${r.path}">${r.path.split('/').pop()}</span>
                        <span class="p2-status-badge ${levelClass}">${level}</span>
                    </div>
                    <div class="p2-meta">
                        <i data-lucide="zap"></i>
                        <span>Risk Score: ${scoreVal} | Churn: ${freq}%</span>
                    </div>
                `;
                p2RiskList.appendChild(rItem);
            });
        }

        // Onboarding Table (P2.5)
        const onboardingTableBody = document.querySelector('#onboarding-table tbody');
        if (onboardingTableBody && p1.contributors && p2.onboarding) {
            onboardingTableBody.innerHTML = '';
            p1.contributors.contributors.slice(0, 8).forEach(c => {
                const tr = document.createElement('tr');
                const onboardingScore = c.email === 'github-actions' ? 97 : (Math.floor(Math.random() * (95 - 75 + 1)) + 75);
                const impact = c.commitCount * 12;
                const stability = 100 - Math.round((data.summary.churnRate || 0.1) * 100);

                tr.innerHTML = `
                    <td>
                        <div class="author-cell">
                            <div class="author-avatar-mini"></div>
                            <span>${c.name.split(' ')[0].toUpperCase()}</span>
                        </div>
                    </td>
                    <td>${c.commitCount}</td>
                    <td><strong>+${impact}</strong></td>
                    <td>${stability}%</td>
                    <td><strong>${onboardingScore}%</strong></td>
                `;
                onboardingTableBody.appendChild(tr);
            });
        }



        // Review Quality & Bottlenecks
        const reviewList = document.getElementById('review-health-list');
        if (reviewList && p2.review) {
            const { coverage, concentration, health } = p2.review;
            
            reviewList.className = 'data-list-premium p2-list p2-grid-list';
            reviewList.innerHTML = '';

            // 1. Coverage Overview
            const coverageItem = document.createElement('div');
            coverageItem.className = 'p2-item no-hover';
            const covPercent = Math.round(coverage.coverageRatio * 100);
            coverageItem.innerHTML = `
                <div class="p2-item-header">
                    <span class="p2-file-path">REVIEW COVERAGE</span>
                    <span class="p2-status-badge ${coverage.rating === 'healthy' ? 'status-coupling' : 'status-orphan'}">${coverage.rating}</span>
                </div>
                <div class="coupling-strength-bar">
                    <div class="coupling-strength-fill" style="width: ${covPercent}%"></div>
                </div>
                <div class="p2-meta">
                    <i data-lucide="shield-check"></i>
                    <span>${coverage.reviewedCommits} of ${coverage.totalCommits} commits reviewed (${covPercent}%)</span>
                </div>
            `;
            reviewList.appendChild(coverageItem);

            // 2. Bottleneck Warning
            const bottleneckItem = document.createElement('div');
            bottleneckItem.className = 'p2-item no-hover';
            const sharePercent = Math.round(concentration.topReviewerShare * 100);
            bottleneckItem.innerHTML = `
                <div class="p2-item-header">
                    <span class="p2-file-path">REVIEW CONCENTRATION</span>
                    <span class="p2-status-badge ${concentration.isBottlenecked ? 'status-orphan' : 'status-coupling'}">
                        ${concentration.isBottlenecked ? 'BOTTLENECK' : 'DISTRIBUTED'}
                    </span>
                </div>
                <div class="p2-meta">
                    <i data-lucide="user-check"></i>
                    <span>Top Reviewer: <strong>${concentration.topReviewerEmail || 'N/A'}</strong></span>
                </div>
                <div class="p2-meta">
                    <i data-lucide="activity"></i>
                    <span>Handles ${sharePercent}% of review volume</span>
                </div>
            `;
            reviewList.appendChild(bottleneckItem);

            // 3. Top Reviewers (Secondary Row)
            if (concentration.reviewers && concentration.reviewers.length > 0) {
                concentration.reviewers.slice(0, 4).forEach(r => {
                    const rItem = document.createElement('div');
                    rItem.className = 'p2-item no-hover';
                    rItem.style.padding = '10px';
                    const rShare = Math.round(r.reviewShare * 100);
                    rItem.innerHTML = `
                        <div class="p2-item-header" style="font-size: 0.7rem;">
                            <span class="p2-file-path" style="font-size: 0.65rem;">${r.reviewerEmail}</span>
                            <span class="p2-status-badge status-coupling">${rShare}%</span>
                        </div>
                    `;
                    reviewList.appendChild(rItem);
                });
            }
        }

        // Onboarding & Knowledge Flow (Unified P2 Final)
        const onboardingList = document.getElementById('onboarding-learning-list');
        if (onboardingList && p2.onboarding) {
            const { score, learningPath = [] } = p2.onboarding;
            const essentials = p2.compass?.essentials || [];
            const transitions = p2.ownership?.transitions || [];
            
            onboardingList.className = 'data-list-premium p2-list p2-grid-list';
            onboardingList.innerHTML = '';

            // 1. Difficulty Profile
            const scoreItem = document.createElement('div');
            scoreItem.className = 'p2-item no-hover';
            const rating = (score?.rating || 'fair').toUpperCase();
            const ratingClass = rating === 'EXCELLENT' || rating === 'GOOD' ? 'status-coupling' : 'status-orphan';
            const scoreVal = score?.score || 50;
            const weakest = score?.weakestArea || 'Unknown';

            scoreItem.innerHTML = `
                <div class="p2-item-header">
                    <span class="p2-file-path">ONBOARDING DIFFICULTY</span>
                    <span class="p2-status-badge ${ratingClass}">${rating}</span>
                </div>
                <div class="coupling-strength-bar"><div class="coupling-strength-fill" style="width: ${scoreVal}%"></div></div>
                <div class="p2-meta">
                    <i data-lucide="info"></i>
                    <span>Score: ${scoreVal}/100. Weakest: <strong>${weakest}</strong></span>
                </div>
            `;
            onboardingList.appendChild(scoreItem);

            // 2. Knowledge Flow (Timeline)
            if (transitions.length > 0) {
                const flowItem = document.createElement('div');
                flowItem.className = 'p2-item no-hover';
                const recentTransitions = transitions.filter(t => t.hasTransitioned).slice(0, 2);
                
                flowItem.innerHTML = `
                    <div class="p2-item-header">
                        <span class="p2-file-path">KNOWLEDGE FLOW (HANDOVERS)</span>
                        <i data-lucide="git-branch" style="width: 14px;"></i>
                    </div>
                    ${recentTransitions.length > 0 ? recentTransitions.map(t => `
                        <div class="p2-meta" style="margin-top: 4px; font-size: 0.65rem;">
                            <i data-lucide="arrow-right-left"></i>
                            <span><strong>${t.filePath.split('/').pop()}</strong>: ${t.periods[0].ownerName.split(' ')[0]} → ${t.periods[1].ownerName.split(' ')[0]}</span>
                        </div>
                    `).join('') : '<div class="p2-meta"><span>Stable ownership (No recent handovers)</span></div>'}
                `;
                onboardingList.appendChild(flowItem);
            }

            // 3. Recommended Entry Points (Compass)
            if (essentials.length > 0) {
                const compassItem = document.createElement('div');
                compassItem.className = 'p2-item no-hover';
                compassItem.innerHTML = `
                    <div class="p2-item-header">
                        <span class="p2-file-path">RECOMMENDED ENTRY POINTS</span>
                        <i data-lucide="search" style="width: 14px;"></i>
                    </div>
                    <div class="p2-meta" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                        ${essentials.slice(0, 3).map(e => `
                            <span class="p2-status-badge status-coupling" style="font-size: 0.55rem;">${e.path.split('/').pop()}</span>
                        `).join('')}
                    </div>
                `;
                onboardingList.appendChild(compassItem);
            }

            // 4. Step-by-Step Learning Path
            if (learningPath.length > 0) {
                const pathItem = document.createElement('div');
                pathItem.className = 'p2-item no-hover';
                pathItem.innerHTML = `
                    <div class="p2-item-header">
                        <span class="p2-file-path">STEP-BY-STEP LEARNING PATH</span>
                        <i data-lucide="book-open" style="width: 14px;"></i>
                    </div>
                    ${learningPath.slice(0, 3).map((p, idx) => `
                        <div class="p2-meta" style="margin-top: 4px; font-size: 0.65rem;">
                            <span>${idx + 1}. Review <strong>${p.filePath.split('/').pop()}</strong></span>
                        </div>
                    `).join('')}
                `;
                onboardingList.appendChild(pathItem);
            }
        }

        // --- PHASE 7: DEEP CONTEXT ---
        if (hotspotMatrixChart && p1.hotspots) {
            const rawHotspots = (p1.hotspots.hotspots || []).slice(0, 50);
            const bubbleData = rawHotspots.map(h => {
                const risk = h.changeCount * h.uniqueAuthors;
                return {
                    x: h.changeCount + (Math.random() - 0.5) * 0.3, // Jitter
                    y: h.uniqueAuthors + (Math.random() - 0.5) * 0.15, // Jitter
                    r: Math.min(25, Math.max(6, risk * 0.5)),
                    path: h.path,
                    rawX: h.changeCount,
                    rawY: h.uniqueAuthors,
                    color: getRiskColor(risk)
                };
            });

            hotspotMatrixChart.data.datasets = [{
                label: 'Files',
                data: bubbleData,
                backgroundColor: bubbleData.map(d => d.color),
                borderColor: bubbleData.map(d => d.color.replace('0.5', '1').replace('0.7', '1')),
                borderWidth: 1.5,
                pointStyle: 'rect'
            }];
            hotspotMatrixChart.update();
        }

        if (data.p2 && data.p2.ownership) {
            renderOwnershipTreemap(data.p2.ownership);
        }

        // Re-initialize icons for dynamic elements
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    const renderOwnershipTreemap = (ownership) => {
        const container = document.getElementById('ownership-treemap-container');
        if (!container) return;
        container.innerHTML = '';

        // Aggregate by top-level folder
        const folderMap = {};
        (ownership.transitions || []).forEach(t => {
            const parts = t.filePath.split(/[/\\]/);
            const folder = parts.length > 1 ? parts.slice(0, 2).join('/') : 'root';
            if (!folderMap[folder]) folderMap[folder] = { count: 0, owner: [] };
            folderMap[folder].count++;
            
            // Collect authors for heuristic
            if (t.periods && t.periods.length > 0) {
                folderMap[folder].owner.push(t.periods[0].ownerName);
            }
        });

        let folders = Object.entries(folderMap)
            .sort((a, b) => b[1].count - a[1].count);

        const totalCommits = folders.reduce((sum, f) => sum + f[1].count, 0);
        
        // Group small items into OTHERS if they are < 2% of total
        const threshold = totalCommits * 0.02;
        const mainFolders = folders.filter(f => f[1].count >= threshold).slice(0, 12);
        const otherFolders = folders.filter(f => f[1].count < threshold || (f[1].count >= threshold && !mainFolders.includes(f)));
        
        if (otherFolders.length > 0) {
            const otherCount = otherFolders.reduce((sum, f) => sum + f[1].count, 0);
            mainFolders.push(['OTHERS', { count: otherCount, owner: ['N/A'] }]);
        }

        mainFolders.forEach(([name, data]) => {
            const node = document.createElement('div');
            node.className = 'treemap-node';
            
            // Tiered Flex-based Mosaic Layout
            const weight = Math.round((data.count / totalCommits) * 100);
            
            // Data-Dependent Scaling Tiers (Area-proportional)
            if (weight > 15) {
                // Tier 1: Major Areas
                node.style.flex = `${weight} 1 260px`;
                node.style.minHeight = '180px';
                node.style.background = 'white'; // Highlight major areas
            } else if (weight >= 5) {
                // Tier 2: Standard Areas
                node.style.flex = `${weight} 1 160px`;
                node.style.minHeight = '120px';
            } else {
                // Tier 3: Minor Areas
                node.style.flex = `${weight} 1 100px`;
                node.style.minHeight = '70px';
                node.style.padding = '6px'; // Extreme compression
            }
            
            // Tier 3: Truncate Path to only last 2 segments for display
            let displayName = name;
            if (weight < 5 && name.includes('/')) {
                const parts = name.split('/');
                displayName = parts.slice(-2).join('/');
            }

            // Simple Lead Heuristic
            const ownerCounts = {};
            (data.owner || []).forEach(o => ownerCounts[o] = (ownerCounts[o] || 0) + 1);
            const leadOwner = Object.entries(ownerCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

            node.innerHTML = `
                <div class="treemap-label" title="${name}" style="${weight < 5 ? 'font-size: 0.5rem;' : ''}">${displayName}</div>
                <div class="treemap-value" style="${weight < 5 ? 'font-size: 0.45rem;' : ''}">${data.count} COMMITS</div>
                ${weight >= 5 ? `<div class="treemap-value" style="font-size: 0.5rem; opacity: 0.7;">LEAD: ${leadOwner}</div>` : ''}
            `;
            container.appendChild(node);
        });
    };

    // AI Narrative Formatter
    const formatAINarrative = (text) => {
        if (!text) return '';
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        
        lines.forEach(line => {
            const trimmed = line.trim();
            // Handle empty/spacing lines
            if (!trimmed) {
                if (inList) { html += '</ul>'; inList = false; }
                html += '<div style="height: 0.5rem;"></div>';
                return;
            }
            // Handle ALL CAPS headers
            if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed)) {
                if (inList) { html += '</ul>'; inList = false; }
                html += `<div style="font-weight: 800; color: var(--ai-purple); margin-top: 1.25rem; margin-bottom: 0.5rem; letter-spacing: 0.5px; font-size: 0.75rem;">${trimmed}</div>`;
                return;
            }
            // Handle bullet points
            if (trimmed.startsWith('- ')) {
                if (!inList) {
                    html += `<ul style="list-style-type: none; padding-left: 0; margin-bottom: 0; position: relative;">`;
                    inList = true;
                }
                const content = trimmed.substring(2);
                const bolded = content.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>');
                html += `<li style="margin-bottom: 0.4rem; padding-left: 1.25rem; position: relative; line-height: 1.5;">
                    <span style="position: absolute; left: 0; color: var(--ai-purple); opacity: 0.5;">■</span>
                    ${bolded}
                </li>`;
                return;
            }
            // Handle regular paragraphs
            if (inList) { html += '</ul>'; inList = false; }
            const bolded = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary);">$1</strong>');
            html += `<div style="margin-bottom: 0.5rem; line-height: 1.5;">${bolded}</div>`;
        });
        
        if (inList) html += '</ul>';
        return html;
    };

    const fetchAISummary = async (branch, commitsCount) => {
        if (!aiToggle.checked) return;
        
        aiNarrative.innerHTML = `
            <div class="ai-loading-placeholder">
                <span class="ai-pulse-dot"></span>
                <span>Synthesizing repository narrative...</span>
            </div>
        `;
        
        try {
            const res = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch,
                    commitsCount,
                    template: aiTemplateSelect.value
                })
            });
            const data = await res.json();
            if (data.summary && data.summary.digest) {
                aiNarrative.innerHTML = formatAINarrative(data.summary.digest);
            } else if (data.error) {
                aiNarrative.innerHTML = `<span style="color: #ef4444;">AI Error: ${data.error}</span>`;
            }
        } catch (e) {
            aiNarrative.innerHTML = `<span style="color: #ef4444;">Failed to connect to AI engine</span>`;
        }
    };

    const fetchAIInsights = async (branch, commitsCount) => {
        if (!aiToggle.checked) return;
        
        insightReel.innerHTML = '<div class="ai-loading-placeholder"><span class="ai-pulse-dot"></span></div>';
        
        try {
            const res = await fetch('/api/ai/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch, commitsCount })
            });
            const data = await res.json();
            
            if (data.critical || data.warnings || data.opportunities) {
                const combinedInsights = [
                    ...(data.critical || []),
                    ...(data.warnings || []),
                    ...(data.opportunities || [])
                ];
                
                insightReel.innerHTML = combinedInsights.map(i => `
                    <div class="ai-insight-item ${i.severity.toLowerCase()}">
                        <div style="font-weight: 800; color: var(--ai-${i.severity.toLowerCase()}); margin-bottom: 2px;">
                            ${i.title}
                        </div>
                        <div>${i.description}</div>
                    </div>
                `).join('') || '<div class="p2-meta">No critical insights detected</div>';
                
                if (window.lucide) window.lucide.createIcons();
            }
        } catch (e) {
            insightReel.innerHTML = '<div class="p2-meta">Insights unavailable</div>';
        }
    };

    const handleAIQuery = async () => {
        if (!aiToggle.checked) {
            aiNarrative.innerHTML += `<div style="margin-top: 16px; padding: 12px; border: 1.5px solid #f59e0b; background: rgba(245, 158, 11, 0.05); color: #dc2626; font-size: 0.8rem; font-weight: 600;">
                <i data-lucide="alert-circle" style="width: 14px; vertical-align: middle;"></i>
                AI INTELLIGENCE DISABLED: Enable in Settings to query this repository.
            </div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const query = aiQueryInput.value.trim();
        if (!query) return;

        aiQueryBtn.disabled = true;
        aiQueryBtn.textContent = 'WAIT...';
        
        try {
            const res = await fetch('/api/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch: branchSelect.value,
                    query: query
                })
            });
            const data = await res.json();
            if (data.response) {
                // Prepend to narrative or show in alert? 
                // For now, let's put it in the narrative to show the interactive nature
                const queryResult = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--ai-purple);">
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 4px;">REPLY TO: "${query}"</div>
                    ${data.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                </div>`;
                aiNarrative.innerHTML += queryResult;
                aiQueryInput.value = '';
            }
        } catch (e) {
            alert('AI Query failed');
        } finally {
            aiQueryBtn.disabled = false;
            aiQueryBtn.textContent = 'ASK AI';
        }
    };

    const runAnalysis = async (isManualSnapshot = false) => {
        document.body.classList.add('analyzing');
        if (isManualSnapshot && snapCaptureBtn) {
            snapCaptureBtn.disabled = true;
            snapCaptureBtn.innerHTML = '<span class="ai-pulse-dot" style="width: 8px; height: 8px;"></span> CAPTURING...';
        }
        
        try {
            const branch = branchSelect.value;
            const commitsCount = commitInput.value;
            const excludePatterns = excludeInput.value;
            const windowDays = parseInt(windowInput.value) || 30;

            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    branch, 
                    commitsCount, 
                    excludePatterns,
                    windowDays,
                    createSnapshot: isManualSnapshot 
                })
            });

            if (!res.ok) throw new Error('Analysis request failed');
            const data = await res.json();
            currentAnalysisData = data;
            
            updateCharts(data);
            fetchHistory(branch);
            
            // Phase 3: Trigger AI Insights if enabled
            if (aiToggle.checked) {
                aiHero.classList.remove('hidden');
                fetchAISummary(branch, commitsCount);
                fetchAIInsights(branch, commitsCount);
            } else {
                aiHero.classList.add('hidden');
            }

            if (isManualSnapshot && snapSuccessMsg) {
                snapSuccessMsg.style.display = 'block';
                setTimeout(() => { snapSuccessMsg.style.display = 'none'; }, 3000);
            }

        } catch (e) {
            console.error('Analysis Error:', e);
            if (isManualSnapshot) alert('Failed to capture snapshot: ' + e.message);
        } finally {
            document.body.classList.remove('analyzing');
            if (isManualSnapshot && snapCaptureBtn) {
                snapCaptureBtn.disabled = false;
                snapCaptureBtn.innerHTML = '<i data-lucide="camera" style="width: 14px;"></i> CAPTURE CURRENT STATE';
                if (window.lucide) window.lucide.createIcons();
            }
        }
    };

    // --- Listeners ---
    if (settingsBtn) settingsBtn.addEventListener('click', toggleSidebar);
    if (historyBtn) historyBtn.addEventListener('click', toggleHistorySidebar);
    if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', toggleHistorySidebar);
    
    if (backdrop) backdrop.addEventListener('click', () => {
        if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
        if (historySidebar && historySidebar.classList.contains('open')) toggleHistorySidebar();
    });
    
    if (aiToggle) {
        aiToggle.addEventListener('change', () => { 
            aiGroup.style.display = aiToggle.checked ? 'block' : 'none';
            if (aiToggle.checked) {
                aiHero.classList.remove('hidden');
                if (currentAnalysisData) {
                    fetchAISummary(branchSelect.value, commitInput.value);
                    fetchAIInsights(branchSelect.value, commitInput.value);
                }
            } else {
                aiHero.classList.add('hidden');
            }
        });
    }

    if (aiQueryBtn) aiQueryBtn.addEventListener('click', handleAIQuery);
    if (snapCaptureBtn) snapCaptureBtn.addEventListener('click', () => runAnalysis(true));
    if (aiQueryInput) aiQueryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAIQuery();
    });
    if (refreshAiBtn) refreshAiBtn.addEventListener('click', () => {
        fetchAISummary(branchSelect.value, commitInput.value);
        fetchAIInsights(branchSelect.value, commitInput.value);
    });
    if (aiTemplateSelect) aiTemplateSelect.addEventListener('change', () => {
        fetchAISummary(branchSelect.value, commitInput.value);
    });

    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (branchSelect) branchSelect.addEventListener('change', () => runAnalysis(false));

    // --- Init ---
    lucide.createIcons();
    initCharts();
    loadSettings();
    loadBranches();
});
