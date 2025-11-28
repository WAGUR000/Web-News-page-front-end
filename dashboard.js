// Chart.js 인스턴스를 저장할 변수 (중복 생성 방지)
let trendChartInstance = null;
let keywordChartInstance = null;

/**
 * 분석 데이터를 받아 화면에 렌더링합니다.
 * @param {object} data - API에서 받아온 분석 데이터
 */
export function renderDashboard(data) {
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);
    renderClusterList(data.trend_3h.clusters);
}

// 1. 상단 요약 정보 렌더링
function renderSummary(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return;

    const totalVol = hourlyData.reduce((acc, cur) => acc + cur.volume, 0);
    const avgImp = hourlyData.reduce((acc, cur) => acc + cur.avgImportance, 0) / hourlyData.length;
    const avgSent = hourlyData.reduce((acc, cur) => acc + cur.avgSentiment, 0) / hourlyData.length;

    document.getElementById('stat-total-vol').textContent = `${totalVol.toLocaleString()} 건`;
    document.getElementById('stat-avg-imp').textContent = `${avgImp.toFixed(1)} / 10`;
    document.getElementById('stat-avg-sent').textContent = `${avgSent.toFixed(1)} / 10`;
    
    // 감성 점수 색상
    const sentElem = document.getElementById('stat-avg-sent');
    sentElem.style.color = avgSent >= 6 ? '#10b981' : (avgSent <= 4 ? '#ef4444' : '#f59e0b');
}

// 2. 24시간 추이 차트 (Line + Bar)
function renderTrendChart(hourlyData) {
    const ctx = document.getElementById('trendChart24h').getContext('2d');
    
    // 기존 차트가 있으면 파괴 (캔버스 초기화)
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
                    label: '기사 생산량',
                    data: volumes,
                    backgroundColor: 'rgba(148, 163, 184, 0.5)',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: '평균 감성지수',
                    data: sentiments,
                    borderColor: '#6366f1',
                    backgroundColor: '#6366f1',
                    type: 'line',
                    yAxisID: 'y1',
                    order: 1,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: '기사 수' } },
                y1: { type: 'linear', display: true, position: 'right', min: 0, max: 10, grid: { drawOnChartArea: false }, title: { display: true, text: '감성 지수' } }
            }
        }
    });
}

// 3. 3시간 급상승 키워드 차트 (Horizontal Bar)
function renderKeywordChart(keywords) {
    const ctx = document.getElementById('keywordChart3h').getContext('2d');
    if (keywordChartInstance) keywordChartInstance.destroy();

    // Top 10만 추출
    const topKeywords = keywords.slice(0, 10);

    keywordChartInstance = new Chart(ctx, {
        type: 'bar', // 가로 막대 그래프
        indexAxis: 'y',
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
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// 4. 이슈 클러스터 리스트 (HTML 생성)
function renderClusterList(clusters) {
    const container = document.getElementById('cluster-list');
    container.innerHTML = '';

    clusters.slice(0, 5).forEach((cluster, idx) => {
        const div = document.createElement('div');
        div.className = 'cluster-item';
        
        // 중요도에 따른 배지 색상
        const badgeColor = cluster.imp >= 7 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
        
        div.innerHTML = `
            <div class="cluster-rank">${idx + 1}</div>
            <div class="cluster-content">
                <div class="cluster-title">${cluster.title}</div>
                <div class="cluster-meta">
                    <span class="badge ${badgeColor}">중요도 ${cluster.imp}</span>
                    <span class="sentiment-score">감성 ${cluster.sent}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}