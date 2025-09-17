import { createNewsItemHTML, renderTopNews, renderLatestNews, renderExploreNews, showPage } from './ui.js';
import { fetchMainPageNews, fetchExploreNews } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 페이지 네비게이션 로직 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    // ⭐️ showPage에 필요한 변수들을 미리 전달합니다.
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const pageId = event.target.dataset.page;
            // ⭐️ 클릭 시 showPage 함수에 pages와 navLinks를 함께 전달해야 합니다.
            showPage(pageId, pages, navLinks);
        });
    });

    // --- 뉴스 탐색 페이지 상태 ---
    // '더 보기' 기능으로 변경되면서 클라이언트 측 페이지네이션 상태는 제거됩니다.
    // 서버로부터 데이터를 받아와 관리하기 위한 새로운 상태 변수들입니다.
    let exploreNews = []; // 뉴스 탐색 탭에 표시될 모든 뉴스를 담는 배열
    let exploreLastKey = null; // 다음 페이지를 요청하기 위한 페이지네이션 토큰
    let isLoadingExplore = false; // 중복 '더 보기' 요청을 방지하기 위한 플래그
    let exploreCurrentPage = 1; // 뉴스 탐색 탭의 클라이언트 측 페이지네이션을 위한 현재 페이지

    // ⭐️ 페이지네이션 클릭 시 호출될 콜백 함수
    function handleExplorePageChange(newPage) {
        exploreCurrentPage = newPage;
        // API 호출 없이 화면만 다시 렌더링합니다.
        renderExploreNews(exploreNews, exploreCurrentPage, exploreLastKey, handleExplorePageChange, () => loadExploreNews(false), true);
    }
    

    // --- 초기 데이터 로드 및 이벤트 리스너 설정 ---

    async function initializeApp() {
    //  1. 오늘 날짜를 'YYYY-MM-DD' 형식의 문자열로 만듭니다.
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    try {
        //  1. 메인 페이지용 데이터 로드: 'all_categories_summary' 모드로 오늘의 모든 카테고리별 뉴스를 한 번에 요청합니다.
        const allNewsByCategory = await fetchMainPageNews(dateString);
        //  전체 뉴스 데이터를 저장해두어 관련 뉴스 검색에 사용합니다.
        const combinedNews = [
            ...Object.values(allNewsByCategory.important).flat(),
            ...Object.values(allNewsByCategory.latest).flat()
        ];

        // 'important'와 'latest'에 중복된 뉴스가 있을 수 있으므로, SK를 기준으로 중복을 제거합니다.
        const allMainPageNews = combinedNews.filter((news, index, self) =>
            index === self.findIndex(n => n.SK === news.SK)
        );

        //   .sort()는 원본 배열을 변경하므로, [...allMainPageNews]로 복사본을 만들어 정렬합니다.
        // 이렇게 해야 allMainPageNews 배열의 순서가 유지됩니다.
        const importantNewsData = [...allMainPageNews]
            .sort((a, b) => b.importance - a.importance);
        const latestNewsData = [...allMainPageNews]
            .sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));

        //  2. 메인 페이지 렌더링
        renderTopNews(importantNewsData);
        renderLatestNews(latestNewsData);

        //  3. 뉴스 탐색 페이지 초기 데이터 로드
        await loadExploreNews(true); // isInitialLoad = true

        //  4. 이벤트 리스너 설정 (메인 페이지용으로는 '최신순 정렬'된 데이터를 전달)
        setupEventListeners(latestNewsData, allMainPageNews);

        showPage('main', pages, navLinks);

    } catch (error) {
        console.error('Initialization Error:', error);
    }
}

    // 뉴스 탐색 페이지: 서버로부터 데이터를 가져오는 함수
    async function loadExploreNews(isInitialLoad = false) {
        if (isLoadingExplore) return; // 이미 로딩 중이면 중복 실행 방지
        if (!isInitialLoad && !exploreLastKey) return; // 더 이상 불러올 데이터가 없으면 중단

        isLoadingExplore = true;
        const loadMoreBtn = document.querySelector('#load-more-container .load-more-btn');
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';

        if (isInitialLoad) {
            // ⭐️ 필터 변경 시, API를 기다리는 동안 로딩 메시지를 표시합니다.
            document.getElementById('explore-results').innerHTML = '<p style="text-align: center; padding: 2rem;">뉴스를 불러오는 중입니다...</p>';
            
            exploreNews = []; // 필터 변경 시 기존 데이터 초기화
            exploreLastKey = null;
            exploreCurrentPage = 1; // 페이지 번호도 1로 초기화
        }

        // 필터 값 가져오기
        const activeCategory = document.querySelector('#explore-category-filter-list .category-btn.active').dataset.category;
        const sortBy = document.getElementById('sort-order').value;
        // 'n개씩 보기'는 불러온 데이터를 화면에 어떻게 보여줄지만 결정합니다.
        const limit = 50;         // '더 보기'로 서버에서 가져올 뉴스 개수는 50개로 고정합니다.

        const apiParams = { category: activeCategory, sortBy, limit };

        // ⭐️ '전체' 카테고리일 때만 date 파라미터를 추가합니다.
        if (activeCategory === 'all') {
            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            apiParams.date = dateString;
        }
        if (!isInitialLoad && exploreLastKey) {
            //  중요: API가 importance를 문자열로 반환하는 경우에 대한 방어 코드
            // lastEvaluatedKey의 importance 값이 문자열이면 숫자로 변환합니다.
            // 이렇게 하지 않으면 다음 페이지 요청 시 DynamoDB에서 타입 오류가 발생할 수 있습니다.
            const keyToSend = { ...exploreLastKey };
            if (keyToSend.importance && typeof keyToSend.importance === 'string') {
                keyToSend.importance = parseInt(keyToSend.importance, 10);
            }
            apiParams.exclusiveStartKey = keyToSend;
        }

        try {
            const { items, lastEvaluatedKey } = await fetchExploreNews(apiParams);
            
            // 초기 로드일 경우, 기존 데이터를 대체합니다.
            if (isInitialLoad) {
                exploreNews = items;
            } else { // '더 보기' 시에는 항상 추가합니다. GSI를 사용하므로 중복 걱정이 없습니다.
                exploreNews.push(...items);
            }
            exploreLastKey = lastEvaluatedKey; // 다음 페이지 토큰 업데이트

            //  '더 보기' 후에는 새로 불러온 뉴스가 포함된 마지막 페이지로 자동 이동합니다.
            if (!isInitialLoad) {
                exploreCurrentPage = Math.ceil(exploreNews.length / parseInt(document.getElementById('items-per-page').value, 10));
            }
            renderExploreNews(exploreNews, exploreCurrentPage, exploreLastKey, handleExplorePageChange, () => loadExploreNews(false), true); // 전체 UI를 다시 그려서 페이지 번호와 버튼을 정확하게 업데이트합니다.

        } catch (error) {
            console.error('Failed to load explore news:', error);
        } finally {
            isLoadingExplore = false; // 로딩 상태 해제
        }
    }




    // 모든 이벤트 리스너를 설정하는 함수
    function setupEventListeners(mainPageLatestNews, allMainPageNews) {

        // 뉴스 탐색 페이지: 필터 변경 시 즉시 재검색 (정렬, 보기 개수)
        document.getElementById('sort-order').addEventListener('change', () => {
            loadExploreNews(true);
        });
        document.getElementById('items-per-page').addEventListener('change', () => {
            // 'n개씩 보기'는 API를 다시 호출하지 않고, 현재 로드된 데이터로 화면만 다시 렌더링합니다.
            exploreCurrentPage = 1; // 보기 개수 변경 시 1페이지로 이동
            renderExploreNews(exploreNews, exploreCurrentPage, exploreLastKey, handleExplorePageChange, () => loadExploreNews(false), true);
        });

        // 뉴스 탐색 페이지: 카테고리 필터 버튼 이벤트 리스너
        const exploreCategoryList = document.getElementById('explore-category-filter-list');
        exploreCategoryList.addEventListener('click', (event) => {
            // ⭐️ 이미 활성화된 버튼을 다시 누르는 것은 무시하고, 'category-btn'일 때만 동작
            if (event.target.classList.contains('category-btn') && !event.target.classList.contains('active')) {
                // 모든 버튼에서 'active' 클래스 제거
                exploreCategoryList.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // 클릭된 버튼에 'active' 클래스 추가
                event.target.classList.add('active');
                // ⭐️ 카테고리 변경 시 즉시 뉴스 다시 로드
                loadExploreNews(true);
            }
        });

        // 메인 페이지 카테고리 필터 이벤트 리스너
        const mainCategoryList = document.getElementById('main-category-filter-list');
        mainCategoryList.addEventListener('click', (event) => {
            if (event.target.classList.contains('category-btn')) {
                // 모든 버튼에서 'active' 클래스 제거
                mainCategoryList.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // 클릭된 버튼에 'active' 클래스 추가
                event.target.classList.add('active');

                // 최신 뉴스 목록을 다시 렌더링
                renderLatestNews(mainPageLatestNews);
            }
        });

        // 메인 페이지 '더 보기' 버튼 이벤트 리스너
        document.getElementById('main-load-more-btn').addEventListener('click', () => {
            // 1. 메인 페이지에서 활성화된 카테고리 가져오기
            const mainActiveCategory = document.querySelector('#main-category-filter-list .category-btn.active');
            const category = mainActiveCategory.dataset.category;

            // 2. 뉴스 탐색 페이지의 카테고리 필터를 메인 페이지와 동기화합니다.
            const exploreCategoryButtons = document.querySelectorAll('#explore-category-filter-list .category-btn');
            exploreCategoryButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });

            // 3. 뉴스 탐색 페이지로 전환합니다.
            showPage('explore', pages, navLinks);

            // 4. 동기화된 카테고리로 뉴스 탐색 페이지의 데이터를 새로 불러옵니다.
            //    이제 GSI를 사용하므로 메인 페이지와 일관된 결과를 얻을 수 있습니다.
            loadExploreNews(true);
        });

        // 로고 클릭 시 메인 페이지로 이동
        document.getElementById('logo-link').addEventListener('click', (event) => {
            event.preventDefault();
            showPage('main', pages, navLinks);
        });

        // 관련 뉴스 아이템 HTML을 생성하는 함수
        function createRelatedNewsItemHTML(news) {
            const url = news.SK && news.SK.includes('#') ? news.SK.split('#')[1] : '#';
            
            let sentimentClass = '';
            const parsedSentiment = parseFloat(news.sentiment);
            const sentimentValue = !isNaN(parsedSentiment) ? parsedSentiment : 5.0;

            if (sentimentValue >= 6.5) {
                sentimentClass = 'sentiment-positive';
            } else if (sentimentValue <= 3.5) {
                sentimentClass = 'sentiment-negative';
            }

            return `
                <div class="related-news-item">
                    <span class="related-title" title="${news.title}">${news.title}</span>
                    <div class="related-info">
                        <span class="related-outlet">${news.outlet}</span>
                        <span class="sentiment ${sentimentClass}">(${sentimentValue.toFixed(1)})</span>
                        <a href="${url}" target="_blank" class="news-link">원문 보기</a>
                    </div>
                </div>
            `;
        }

        // 뉴스 아이템 확장 시 관련 뉴스를 찾는 함수
        function findAndRenderRelatedNews(newsItem) {
            const clusterId = newsItem.dataset.clusterId;
            const relatedListContainer = newsItem.querySelector('.related-news-list');
            
            if (!clusterId || !relatedListContainer) return;

            // 현재 페이지(메인/탐색)에 로드된 전체 뉴스 목록에서 관련 뉴스를 찾습니다.
            const currentPageId = document.querySelector('.page.active').id;
            const sourceNewsData = (currentPageId === 'main-page') ? allMainPageNews : exploreNews;

            const relatedNews = sourceNewsData.filter(news => 
                news.clusterId === clusterId && // 같은 클러스터 ID를 가지고
                news.is_representative == 0      // 대표 뉴스가 아닌(is_representative=0) 뉴스 (문자열 "0"도 고려하여 == 사용)
            );

            if (relatedNews.length > 0) {
                relatedListContainer.innerHTML = relatedNews.map(createRelatedNewsItemHTML).join('');
            } else {
                relatedListContainer.innerHTML = '<p style="font-size: 0.85rem; color: #888; margin: 0;">관련 뉴스가 없습니다.</p>';
            }
        }
        // 이벤트 위임을 사용하여 뉴스 아이템 클릭 처리
        document.querySelector('main').addEventListener('click', (event) => {
            const newsItem = event.target.closest('.news-item');
            if (!newsItem) return;

            // '기사 원문 보기' 링크는 기본 동작을 따름
            if (event.target.closest('.news-link')) {
                return;
            }

            // 뉴스 아이템 확장/축소
            const isExpanding = !newsItem.classList.contains('expanded');
            newsItem.classList.toggle('expanded');

            // ⭐️ 뉴스를 확장할 때만 관련 뉴스를 찾아서 렌더링합니다.
            // (축소할 때는 불필요한 작업을 피합니다)
            if (isExpanding) {
                findAndRenderRelatedNews(newsItem);
            }
        });
    }

    initializeApp();
});