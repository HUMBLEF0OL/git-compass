// Frontend logic for Git Compass Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    console.log('Git Compass Dashboard initialized');
    
    // Initialize Charts
    initCharts();

    // Load Branches
    loadBranches();
});

async function loadBranches() {
    try {
        const response = await fetch('/api/branches');
        const branches = await response.json();
        
        const branchSelect = document.getElementById('branch-select');
        if (branchSelect && Array.isArray(branches)) {
            branchSelect.innerHTML = ''; // Clear existing
            
            // Deduplicate: prioritize local branches (isRemote: false)
            const branchesByName = new Map();
            branches.forEach(b => {
                if (!branchesByName.has(b.name) || !b.isRemote) {
                    branchesByName.set(b.name, b);
                }
            });

            // Sort alphabetically by name
            const sortedBranches = Array.from(branchesByName.values())
                .sort((a, b) => a.name.localeCompare(b.name));

            sortedBranches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.name;
                option.textContent = branch.name;
                branchSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load branches:', error);
    }
}

function initCharts() {
    const chartConfig = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#e2e8f0'
                },
                ticks: {
                    color: '#64748b'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#64748b'
                }
            }
        }
    };

    // Commit Chart
    const commitCtx = document.getElementById('commitChart').getContext('2d');
    new Chart(commitCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Commits',
                data: [12, 19, 3, 5, 2, 3, 15],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: chartConfig
    });

    // Author Chart
    const authorCtx = document.getElementById('authorChart').getContext('2d');
    new Chart(authorCtx, {
        type: 'bar',
        data: {
            labels: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'],
            datasets: [{
                label: 'Contributions',
                data: [45, 32, 28, 15, 10],
                backgroundColor: '#3b82f6',
                borderWidth: 0
            }]
        },
        options: chartConfig
    });
}
