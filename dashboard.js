let trendChartInstance = null;
let keywordChartInstance = null;
let clusterChartInstance = null;

export function renderDashboard(data) {
    if (!data) return;
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);
    renderClusterList(data.trend_3h.clusters);
    renderClusterChart(data.trend_3h.clusters); 
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


function renderClusterChart(clusters) {
    const ctx = document.getElementById('clusterChart');
    if (!ctx) return;

    if (clusterChartInstance) clusterChartInstance.destroy();

    // 데이터 매핑: x(감성), y(중요도), r(기사량)
    const bubbleData = clusters.map(c => ({
        x: c.sent,
        y: c.imp,
        // 원 크기(r)는 기사량에 비례하되 너무 크거나 작지 않게 제한
        r: Math.min(Math.max(c.vol / 2, 5), 25),
        title: c.title,
        vol: c.vol
    }));

    clusterChartInstance = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: '이슈 클러스터',
                data: bubbleData,
                backgroundColor: (context) => {
                    const val = context.raw?.x;
                    // 감성에 따른 색상 (초록:긍정, 빨강:부정, 주황:중립)
                    if (val >= 6) return 'rgba(34, 197, 94, 0.6)';
                    if (val <= 4) return 'rgba(239, 68, 68, 0.6)';
                    return 'rgba(245, 158, 11, 0.6)';
                },
                borderColor: (context) => {
                    const val = context.raw?.x;
                    if (val >= 6) return 'rgb(21, 128, 61)';
                    if (val <= 4) return 'rgb(185, 28, 28)';
                    return 'rgb(180, 83, 9)';
                },
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = context.raw;
                            // 툴팁에 제목과 기사 수 표시
                            return `${item.title.substring(0, 20)}... (${item.vol}건)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0, max: 10,
                    title: { display: true, text: '부정(0) ↔ 긍정(10)' },
                    grid: { display: false }
                },
                y: {
                    min: 0, max: 10,
                    title: { display: true, text: '중요도' },
                    grid: { borderDash: [2, 2] }
                }
            }
        }
    });
}