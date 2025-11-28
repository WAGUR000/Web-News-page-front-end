// Chart.js 인스턴스 변수
let trendChartInstance = null;
let keywordChartInstance = null;

export function renderDashboard(data) {
    if (!data) return;
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);
    renderClusterList(data.trend_3h.clusters);
}

function renderSummary(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return;

    const totalVol = hourlyData.reduce((acc, cur) => acc + cur.volume, 0);
    const avgImp = hourlyData.reduce((acc, cur) => acc + cur.avgImportance, 0) / hourlyData.length;
    const avgSent = hourlyData.reduce((acc, cur) => acc + cur.avgSentiment, 0) / hourlyData.length;

    const volEl = document.getElementById('stat-total-vol');
    if (volEl) volEl.textContent = `${totalVol.toLocaleString()} 건`;

    const impEl = document.getElementById('stat-avg-imp');
    if (impEl) impEl.textContent = `${avgImp.toFixed(1)} / 10`;
    
    const sentEl = document.getElementById('stat-avg-sent');
    if (sentEl) {
        sentEl.textContent = `${avgSent.toFixed(1)} / 10`;
        sentEl.style.color = avgSent >= 6 ? '#10b981' : (avgSent <= 4 ? '#ef4444' : '#f59e0b');
    }
}

function renderTrendChart(hourlyData) {
    const ctx = document.getElementById('trendChart24h');
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    const labels = hourlyData.map(d => d.time);
    const volumes = hourlyData.map(d => d.volume);
    const sentiments = hourlyData.map(d => d.avgSentiment);

    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '기사량',
                    data: volumes,
                    backgroundColor: 'rgba(200, 200, 200, 0.5)',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: '감성지수',
                    data: sentiments,
                    type: 'line',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    order: 1,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', grid: { display: false } },
                y1: { position: 'right', min: 0, max: 10, grid: { borderDash: [2, 4] } }
            }
        }
    });
}

function renderKeywordChart(keywords) {
    const ctx = document.getElementById('keywordChart3h');
    if (!ctx) return;

    if (keywordChartInstance) keywordChartInstance.destroy();

    const topKeywords = keywords.slice(0, 10);

    keywordChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topKeywords.map(k => k.keyword),
            datasets: [{
                label: '언급량',
                data: topKeywords.map(k => k.count),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

function renderClusterList(clusters) {
    const container = document.getElementById('cluster-list');
    if (!container) return;
    
    container.innerHTML = '';
    if (!clusters || clusters.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#888;">데이터가 없습니다.</div>';
        return;
    }

    clusters.slice(0, 5).forEach((cluster, idx) => {
        const div = document.createElement('div');
        div.className = 'cluster-item';
        const badgeClass = cluster.imp >= 7 ? 'bg-red-100' : 'bg-gray-100';
        
        div.innerHTML = `
            <div class="cluster-rank">${idx + 1}</div>
            <div class="cluster-content">
                <div class="cluster-title">${cluster.title}</div>
                <div class="cluster-meta">
                    <span class="badge ${badgeClass}">중요도 ${cluster.imp}</span>
                    <span style="font-size:0.8rem; color:#64748b;">(기사 ${cluster.vol}건)</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}