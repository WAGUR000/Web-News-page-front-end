// Chart.js 인스턴스를 전역 변수로 관리하지 않고, Canvas 요소에 저장하거나 함수 내에서 관리
// (script.js에서 모듈로 불러와서 사용)

let trendChartInstance = null;
let keywordChartInstance = null;

export function renderDashboard(data) {
    if (!data) return;
    
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);
    renderClusterList(data.trend_3h.clusters);
}

// 1. 요약 정보 렌더링
function renderSummary(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return;

    const totalVol = hourlyData.reduce((acc, cur) => acc + cur.volume, 0);
    const avgImp = hourlyData.reduce((acc, cur) => acc + cur.avgImportance, 0) / hourlyData.length;
    const avgSent = hourlyData.reduce((acc, cur) => acc + cur.avgSentiment, 0) / hourlyData.length;

    document.getElementById('stat-total-vol').textContent = `${totalVol.toLocaleString()} 건`;
    document.getElementById('stat-avg-imp').textContent = `${avgImp.toFixed(1)} / 10`;
    
    const sentElem = document.getElementById('stat-avg-sent');
    sentElem.textContent = `${avgSent.toFixed(1)} / 10`;
    sentElem.style.color = avgSent >= 6 ? '#10b981' : (avgSent <= 4 ? '#ef4444' : '#f59e0b');
}

// 2. 24시간 추이 차트 (Mixed Chart)
function renderTrendChart(hourlyData) {
    const ctx = document.getElementById('trendChart24h').getContext('2d');
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

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
                    backgroundColor: 'rgba(226, 232, 240, 0.8)',
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: '감성지수',
                    data: sentiments,
                    type: 'line',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    yAxisID: 'y1',
                    order: 1,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: { mode: 'index', intersect: false },
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { display: false }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 10,
                    grid: { borderDash: [2, 4] }
                }
            }
        }
    });
}

// 3. 3시간 급상승 키워드 차트 (Bar Chart)
function renderKeywordChart(keywords) {
    const ctx = document.getElementById('keywordChart3h').getContext('2d');
    
    if (keywordChartInstance) {
        keywordChartInstance.destroy();
    }

    // Top 10만
    const topKeywords = keywords.slice(0, 10);

    keywordChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topKeywords.map(k => k.keyword),
            datasets: [{
                label: '언급량',
                data: topKeywords.map(k => k.count),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y', // 가로 막대
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// 4. 이슈 클러스터 리스트
function renderClusterList(clusters) {
    const container = document.getElementById('cluster-list');
    container.innerHTML = '';

    if (!clusters || clusters.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#888;">데이터가 없습니다.</div>';
        return;
    }

    clusters.slice(0, 5).forEach((cluster, idx) => {
        const div = document.createElement('div');
        div.className = 'cluster-item';
        
        // 중요도에 따른 색상
        const badgeClass = cluster.imp >= 7 ? 'bg-red-100' : 'bg-gray-100';
        const badgeTextColor = cluster.imp >= 7 ? 'text-red-700' : 'text-gray-700';
        
        div.innerHTML = `
            <div class="cluster-rank">${idx + 1}</div>
            <div class="cluster-content">
                <div class="cluster-title">${cluster.title}</div>
                <div class="cluster-meta">
                    <span class="badge ${badgeClass} ${badgeTextColor}">중요도 ${cluster.imp}</span>
                    <span style="font-size:0.8rem; color:#64748b;">(기사 ${cluster.vol}건)</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}