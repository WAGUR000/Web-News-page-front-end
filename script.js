document.addEventListener('DOMContentLoaded', () => {
    // --- 가상 데이터 (Mock Data) ---
    // 실제로는 API를 통해 DynamoDB에서 이와 같은 형태의 데이터를 받아옵니다.
    const mockNewsData = [
        { id: 1, title: "정부, 반도체 산업 지원을 위한 10조원 규모 펀드 조성", summary: "국내 반도체 생태계 강화를 위해 정부가 파격적인 지원책을 발표했습니다.", main_category: "경제", importance: 5, date: "2025-09-12T10:00:00Z" },
        { id: 2, title: "기후 변화 대응, 글로벌 탄소 배출량 감축 목표 상향 조정", summary: "UN 기후변화 회의에서 각국 대표단이 새로운 감축 목표에 합의했습니다.", main_category: "사회", importance: 4, date: "2025-09-12T09:00:00Z" },
        { id: 3, title: "차세대 AI 모델 'Gemini 2.0' 공개, 인간과 유사한 추론 능력 선보여", summary: "구글에서 발표한 새로운 AI 모델이 업계에 큰 파장을 일으키고 있습니다.", main_category: "IT/과학", importance: 5, date: "2025-09-11T15:00:00Z" },
        { id: 4, title: "여야, 내년 예산안 처리 두고 막판 진통", summary: "법정 처리 시한을 앞두고 여야 간의 힘겨루기가 계속되고 있습니다.", main_category: "정치", importance: 3, date: "2025-09-11T11:00:00Z" },
        { id: 5, title: "한국 축구 대표팀, 월드컵 예선 최종전에서 극적인 승리", summary: "손흥민의 결승골에 힘입어 본선 진출에 성공했습니다.", main_category: "스포츠", importance: 4, date: "2025-09-10T23:00:00Z" },
        { id: 6, title: "서울시, 대중교통 요금 인상 계획 발표", summary: "누적된 적자를 해소하기 위해 내년부터 요금 인상이 불가피하다는 입장입니다.", main_category: "사회", importance: 2, date: "2025-09-10T14:00:00Z" }
    ];

    // --- 페이지 네비게이션 로직 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    function showPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');

        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageId);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const pageId = event.target.dataset.page;
            showPage(pageId);
        });
    });


    // --- 데이터 렌더링 함수 ---
    
    // 뉴스 아이템 HTML 템플릿
    function createNewsItemHTML(news) {
        return `
            <div class="news-item">
                <h3>${news.title}</h3>
                <p>${news.summary}</p>
                <div class="news-meta">
                    <span class="category">${news.main_category}</span>
                    <span>중요도: ${'★'.repeat(news.importance)}${'☆'.repeat(5 - news.importance)}</span>
                    <span>${new Date(news.date).toLocaleString()}</span>
                </div>
            </div>
        `;
    }

    // 메인 페이지: 오늘의 주요 뉴스 렌더링
    function renderTopNews(newsData) {
        const container = document.getElementById('top-news');
        // 중요도 5 이상인 뉴스를 상단에 노출
        const topNews = newsData
            .filter(news => news.importance >= 5)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 2); // 최대 2개만
        
        container.innerHTML = topNews.map(createNewsItemHTML).join('');
    }

    // 메인 페이지: 최신 뉴스 렌더링
    function renderLatestNews(newsData) {
        const container = document.getElementById('latest-news');
        const latestNews = [...newsData].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = latestNews.map(createNewsItemHTML).join('');
    }

    // 뉴스 탐색 페이지: 필터링 및 정렬된 뉴스 렌더링
    function renderExploreNews(newsData) {
        const container = document.getElementById('explore-results');
        
        // 필터 값 가져오기
        const category = document.getElementById('category-filter').value;
        const sortBy = document.getElementById('sort-order').value;

        let filteredNews = newsData;

        // 카테고리 필터링
        if (category !== 'all') {
            filteredNews = filteredNews.filter(news => news.main_category === category);
        }

        // 정렬
        if (sortBy === 'latest') {
            filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortBy === 'importance') {
            filteredNews.sort((a, b) => b.importance - a.importance);
        }
        
        container.innerHTML = filteredNews.map(createNewsItemHTML).join('');
    }


    // --- 초기 데이터 로드 및 이벤트 리스너 설정 ---

    async function initializeApp() {
        // TODO: API Gateway 엔드포인트로 교체하세요.
        // const response = await fetch('YOUR_API_GATEWAY_ENDPOINT/news');
        // const newsData = await response.json();
        
        // 지금은 목업 데이터를 사용합니다.
        const newsData = mockNewsData; 

        // 초기 페이지 렌더링
        renderTopNews(newsData);
        renderLatestNews(newsData);
        renderExploreNews(newsData);
        showPage('main'); // 초기 페이지를 '메인'으로 설정

        // 필터 적용 버튼 이벤트 리스너
        document.getElementById('apply-filter').addEventListener('click', () => {
            renderExploreNews(newsData);
        });
    }

    initializeApp();
});