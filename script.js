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
     // ⭐️ 중요도(1~10)를 별점(1~5)으로 변환합니다.
    const filledSquare = news.importance
    const emptySquare = 10 - filledSquare;

    return `
       <div class="news-item">
           <h3>${news.title}</h3>
           <p>${news.description}</p>
           <div class="news-meta">
               <span class="category">${news.main_category}</span>
               <span>중요도: ${'★'.repeat(filledSquare)}${'☆'.repeat(emptySquare)}</span>
               <span>${new Date(news.pub_date).toLocaleString()}</span>
           </div>
       </div>
    `;
    }

    // 메인 페이지: 오늘의 주요 뉴스 렌더링
    function renderTopNews(newsData) {
        const container = document.getElementById('top-news');
        // API에서 이미 중요도 순으로 정렬된 데이터를 받았으므로, 상위 6개만 잘라서 보여줍니다.
        const topNews = newsData
            .slice(0, 6);
        
        container.innerHTML = topNews.map(createNewsItemHTML).join('');
    }

    // 메인 페이지: 최신 뉴스 렌더링
    function renderLatestNews(newsData) {
        const container = document.getElementById('latest-news');
        // API에서 이미 최신순으로 데이터를 받았으므로, 그대로 사용합니다.
        // 여기서는 모든 최신 뉴스를 보여주기 위해 slice를 사용하지 않습니다.
        const latestNews = newsData;
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
    // ⭐️ 1. 오늘 날짜를 'YYYY-MM-DD' 형식의 문자열로 만듭니다.
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const baseUrl = `https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB`;

    // ⭐️ 2. '중요도순'과 '최신순'으로 각각 30개의 뉴스를 요청하는 API URL을 만듭니다.
    const importantNewsUrl = `${baseUrl}?mode=important&date=${dateString}&limit=30`;
    const latestNewsUrl = `${baseUrl}?mode=latest&date=${dateString}&limit=30`;
    
    try {
        // ⭐️ 3. Promise.all을 사용해 두 API를 동시에 호출하고 데이터를 받아옵니다.
        const [importantResponse, latestResponse] = await Promise.all([
            fetch(importantNewsUrl),
            fetch(latestNewsUrl)
        ]);

        if (!importantResponse.ok || !latestResponse.ok) {
            console.error('API Error:', {
                importantStatus: importantResponse.status,
                latestStatus: latestResponse.status
            });
            return;
        }

        const importantNewsData = await importantResponse.json();
        const latestNewsData = await latestResponse.json();
    
        // '뉴스 탐색'을 위해 두 데이터를 합치고 중복을 제거합니다.
        const allNewsMap = new Map();
        importantNewsData.forEach(news => allNewsMap.set(news.SK, news)); // SK를 고유 키로 사용
        latestNewsData.forEach(news => allNewsMap.set(news.SK, news));
        const combinedNewsData = Array.from(allNewsMap.values());
        
        // 초기 페이지 렌더링
        // '오늘의 주요 뉴스'에는 중요도순 데이터를, '최신 뉴스'에는 최신순 데이터를 전달합니다.
        renderTopNews(importantNewsData);
        renderLatestNews(latestNewsData);
        renderExploreNews(combinedNewsData); // 탐색 페이지에는 통합된 데이터를 전달
        showPage('main'); // 초기 페이지를 '메인'으로 설정

        // 필터 적용 버튼 이벤트 리스너
        document.getElementById('apply-filter').addEventListener('click', () => {
            // 필터 적용 시에도 통합된 데이터를 사용합니다.
            renderExploreNews(combinedNewsData);
        });

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

    initializeApp();
});