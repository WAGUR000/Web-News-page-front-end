// 차트 인스턴스 관리 변수
let trendChartInstance = null;
let keywordChartInstance = null;
let clusterChartInstance = null;
let cachedData = null;

const CATEGORY_COLORS = {
    '정치': '#3b82f6',   // 파랑
    '경제': '#15ff00ff',   // 연두
    '사회': '#f59e0b',   // 주황 (노랑)
    '국제': '#8b5cf6',   // 보라
    'IT/과학': '#06b6d4', // 청록
    '연예': '#ec4899',   // 분홍
    '스포츠': '#ef4444', // 빨강
    '문화/생활': '#94a3b8'    // 회색
};

const TARGET_CATEGORIES = ['정치', '경제', '사회', '국제', 'IT/과학', '연예', '스포츠','문화/생활'];

// 메인 렌더링 함수
export function renderDashboard(data) {
    if (!data) return;
    cachedData = data; // 데이터 캐싱
    renderSummary(data.chart_24h);
    renderTrendChart(data.chart_24h);
    renderKeywordChart(data.trend_3h.keywords);


    const rawClusterData3h = data.trend_3h.clusters_3h || [];
    const top5_3h = [...rawClusterData3h]
        .sort((a, b) => {
            // 1순위: 중요도(imp) 내림차순
            if (b.imp !== a.imp) return b.imp - a.imp;
            // 2순위: 기사량(vol) 내림차순
            return b.vol - a.vol;
        })
        .slice(0, 5); // [핵심] 5개만 자름
    const filteredClusters1 = top5_3h.filter(c => c.vol >= 4);
    renderClusterList(filteredClusters1, 'cluster-list-3h');


    // [핵심] 차트와 리스트 렌더링 호출
    renderClusterChart(filteredClusters1);
    renderClusterList(data.trend_3h.clusters, 'cluster-list-3h'); // 리스트는 최근 3시간 데이터 기준
    const rawClusterData24h = data.trend_3h.clusters_24h || [];
    const top5_24h = [...rawClusterData24h]
        .sort((a, b) => {
            // 1순위: 중요도(imp) 내림차순
            if (b.imp !== a.imp) return b.imp - a.imp;
            // 2순위: 기사량(vol) 내림차순
            return b.vol - a.vol;
        })
        .slice(0, 5); // [핵심] 5개만 자름
    const filteredClusters2 = top5_24h.filter(c => c.vol >= 4);
    renderClusterList(filteredClusters2, 'cluster-list-24h');
    
    // 탭 기능 초기화 (window 객체에 함수 등록)
    window.switchTab = switchTab;
}
function switchTab(mode) {
    const list3h = document.getElementById('cluster-list-3h');
    const list24h = document.getElementById('cluster-list-24h');
    const btn3h = document.getElementById('btn-3h');
    const btn24h = document.getElementById('btn-24h');

    if (mode === '3h') {
        list3h.style.display = 'block';
        list24h.style.display = 'none';
        btn3h.classList.add('active');
        btn24h.classList.remove('active');
    } else {
        list3h.style.display = 'none';
        list24h.style.display = 'block';
        btn3h.classList.remove('active');
        btn24h.classList.add('active');
    }
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

// 2. 24시간 추이 차트
function renderTrendChart(hourlyData) {
    const ctx = document.getElementById('trendChart24h');
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    const labels = hourlyData.map(d => d.time);
    const sentiments = hourlyData.map(d => d.avgSentiment);
    const importances = hourlyData.map(d => d.avgImportance);

    // 2-1. 카테고리별 데이터셋 생성 (막대 그래프용)
    const categoryDatasets = TARGET_CATEGORIES.map(category => {
        return {
            type: 'bar',
            label: category, // 범례에 표시될 이름
            data: hourlyData.map(d => (d.categoryDist && d.categoryDist[category]) || 0),
            backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'],
            yAxisID: 'y', // 좌측 축 사용
            stack: 'combined', // [핵심] 이 ID가 같은 것끼리 쌓임
            order: 3 // 라인 뒤에 배치
        };
    });

    // 2-2. 라인 차트 데이터셋 (감성, 중요도)
    const lineDatasets = [
        {
            label: '감성지수',
            data: sentiments,
            type: 'line',
            borderColor: '#1e293b', // 진한 남색 (가독성 위해 변경)
            backgroundColor: '#1e293b',
            borderWidth: 2,
            pointRadius: 0, 
            yAxisID: 'y1', // 우측 축
            order: 2,
            tension: 0.3
        },
        {
            label: '중요도',
            data: importances,
            type: 'line',
            borderColor: '#10b981', 
            backgroundColor: '#10b981',
            borderWidth: 2,
            pointRadius: 0,
            borderDash: [5, 5], // 점선
            yAxisID: 'y1', // 우측 축
            order: 1, // 맨 앞에 배치
            tension: 0.3
        }
    ];

    trendChartInstance = new Chart(ctx, {
        data: {
            labels: labels,
            // 배열 합치기: [카테고리 막대들..., 라인들...]
            datasets: [...categoryDatasets, ...lineDatasets]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index', // 마우스 올리면 해당 시간대의 모든 데이터 툴팁 표시
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        // 툴팁에 값이 0인 카테고리는 안 보이게 깔끔하게 처리
                        filter: function(tooltipItem) {
                            return tooltipItem.raw > 0; 
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true, // [핵심] X축 스택 활성화
                    grid: { display: false }
                },
                y: { // 좌측 축 (기사량)
                    type: 'linear',
                    display: true,
                    position: 'left',
                    stacked: true, // [핵심] Y축 스택 활성화
                    title: { display: true, text: '기사 수' },
                    grid: { display: false }
                },
                y1: { // 우측 축 (점수)
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 10,
                    title: { display: true, text: '점수 (0~10)' },
                    grid: { borderDash: [2, 4] }
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

// 4. 이슈 리스트 (필터링 적용됨)
function renderClusterList(clusters, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    container.innerHTML = '';

    if (!clusters || clusters.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#888; text-align:center;">데이터가 없습니다.</div>';
        return;
    }

    clusters.forEach((cluster, idx) => {
        const div = document.createElement('div');
        div.className = 'cluster-item';
        const badgeClass = cluster.imp >= 7 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
        
        // 시간 표시 (24시간 리스트일 경우 유용)
        const timeStr = cluster.time ? new Date(cluster.time).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'}) : '';

        div.innerHTML = `
            <div class="cluster-rank">${idx + 1}</div>
            <div class="cluster-content">
                <div class="cluster-title" title="${cluster.title}">
                    ${cluster.topic || cluster.title}
                </div>
                <div class="cluster-meta">
                    <span class="badge ${badgeClass}">중요도 ${cluster.imp}</span>
                    <span style="font-size:0.8rem; color:#64748b;">기사 ${cluster.vol}건</span>
                    ${timeStr ? `<span style="font-size:0.75rem; color:#94a3b8; margin-left:auto;">${timeStr}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}


// 5. [수정됨] 이슈 분포 버블 차트 (필터링 적용됨)
function renderClusterChart(clusters) {
    const ctx = document.getElementById('clusterChart');
    if (!ctx) return;

    if (clusterChartInstance) clusterChartInstance.destroy();

    const now = new Date();

    // [수정] 기사 수(vol) 4개 이상인 이슈만 필터링
    const validClusters = clusters.filter(c => c.vol >= 4);

    const bubbleData = validClusters.map(c => {
        const pubDate = c.time ? new Date(c.time) : new Date();
        const hoursAgo = (pubDate - now) / (1000 * 60 * 60);

        return {
            x: hoursAgo, 
            y: c.imp, 
            // 원 크기(r): 기사량(vol)에 비례
            r: Math.min(Math.max(c.vol / 2, 5), 35),
            
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
                label: '주요 이슈',
                data: bubbleData,
                backgroundColor: (context) => {
                    const val = context.raw?.sent;
                    if (val >= 6.0) return 'rgba(34, 197, 94, 0.7)'; // 긍정(초록)
                    if (val <= 4.0) return 'rgba(239, 68, 68, 0.7)'; // 부정(빨강)
                    return 'rgba(245, 158, 11, 0.7)'; // 중립(주황)
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