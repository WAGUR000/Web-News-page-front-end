// 차트 인스턴스 관리 변수
let trendChartInstance = null;
let keywordChartInstance = null;
let clusterChartInstance = null;

// 메인 렌더링 함수
export function renderDashboard(data) {
    if (!data) return;
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);
    
    // 클러스터 데이터 (24시간 데이터 우선 사용)
    const clusterData = data.trend_3h.clusters_24h || data.trend_3h.clusters;
    renderClusterChart(clusterData);
    
    renderClusterList(data.trend_3h.clusters);
}

// 1. 상단 요약 정보
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

// 2. [수정됨] 24시간 추이 차트 (기사량 + 감성 + 중요도)
function renderTrendChart(hourlyData) {
    const ctx = document.getElementById('trendChart24h');
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    const labels = hourlyData.map(d => d.time);
    const volumes = hourlyData.map(d => d.volume);
    const sentiments = hourlyData.map(d => d.avgSentiment);
    // [추가] 중요도 데이터 추출
    const importances = hourlyData.map(d => d.avgImportance);

    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '기사량',
                    data: volumes,
                    backgroundColor: 'rgba(203, 213, 225, 0.6)', // 회색 (Slate-300)
                    yAxisID: 'y',
                    order: 3,
                    borderRadius: 2
                },
                {
                    label: '감성지수',
                    data: sentiments,
                    type: 'line',
                    borderColor: '#10b981', // 초록색 (Green-500)
                    backgroundColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 2,
                    yAxisID: 'y1',
                    order: 2,
                    tension: 0.3
                },
                {
                    // [추가] 중요도 라인
                    label: '중요도',
                    data: importances,
                    type: 'line',
                    borderColor: '#f59e0b', // 주황색 (Amber-500)
                    backgroundColor: '#f59e0b',
                    borderWidth: 2,
                    pointRadius: 2,
                    borderDash: [5, 5], // 점선으로 표현하여 감성과 구분
                    yAxisID: 'y1', // 감성지수와 같은 축 공유 (0~10)
                    order: 1,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '기사 수' },
                    grid: { display: false }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 10,
                    title: { display: true, text: '점수 (0~10)' },
                    grid: { borderDash: [2, 4] } // 그리드 점선 처리
                }
            }
        }
    });
}

// 3. 키워드 차트
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

// 4. 이슈 리스트
function renderClusterList(clusters) {
    const container = document.getElementById('cluster-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const topClusters = [...clusters].sort((a, b) => b.imp - a.imp).slice(0, 5);

    if (topClusters.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#888;">데이터가 없습니다.</div>';
        return;
    }

    topClusters.forEach((cluster, idx) => {
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

// 5. 이슈 분포 버블 차트
function renderClusterChart(clusters) {
    const ctx = document.getElementById('clusterChart');
    if (!ctx) return;

    if (clusterChartInstance) clusterChartInstance.destroy();

    const now = new Date();

    const bubbleData = clusters.map(c => {
        const pubDate = c.time ? new Date(c.time) : new Date();
        const hoursAgo = (pubDate - now) / (1000 * 60 * 60);

        return {
            x: hoursAgo, 
            y: c.imp, 
            r: Math.min(Math.max(c.vol / 2, 4), 30),
            title: c.title,
            topic: c.topic,
            vol: c.vol,
            sent: c.sent,
            timeStr: pubDate.toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'})
        };
    });

    clusterChartInstance = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: '이슈',
                data: bubbleData,
                backgroundColor: (context) => {
                    const val = context.raw?.sent;
                    if (val >= 6.0) return 'rgba(34, 197, 94, 0.7)'; // Green
                    if (val <= 4.0) return 'rgba(239, 68, 68, 0.7)'; // Red
                    return 'rgba(245, 158, 11, 0.7)'; // Amber
                },
                borderColor: (context) => {
                    const val = context.raw?.sent;
                    if (val >= 6.0) return 'rgb(21, 128, 61)';
                    if (val <= 4.0) return 'rgb(185, 28, 28)';
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
                            return `[${item.timeStr}] ${item.topic} (중요도:${item.y}, 기사:${item.vol}건)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: -24, max: 1,
                    title: { display: true, text: '시간 흐름 (과거 → 현재)' },
                    ticks: {
                        stepSize: 4,
                        callback: (v) => v === 0 ? '현재' : Math.abs(v) + '시간 전'
                    },
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