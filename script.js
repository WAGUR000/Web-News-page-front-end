import { createNewsItemHTML, renderTopNews, renderLatestNews, renderExploreNews, showPage } from './ui.js';
import { fetchMainPageNews, fetchExploreNews,fetchAnalyticsData } from './api.js';
import { renderDashboard } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 페이지 네비게이션 로직 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    // ⭐️ showPage에 필요한 변수들을 미리 전달합니다.
    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => { // async 키워드 추가 (비동기 함수 호출 위해)
            event.preventDefault();
            const pageId = event.target.dataset.page;
            
            // 기존 페이지 전환 함수 호출
            showPage(pageId, pages, navLinks);

            // [변경 3] 만약 클릭한 페이지가 'analysis'(분석)라면 데이터를 로드합니다.
            if (pageId === 'analysis') {
                await loadAnalyticsPage();
            }
        });
    });
    // --- 뉴스 탐색 페이지 상태 ---
    // '더 보기' 기능으로 변경되면서 클라이언트 측 페이지네이션 상태는 제거됩니다.
    // 서버로부터 데이터를 받아와 관리하기 위한 새로운 상태 변수들입니다.
    let exploreNews = []; // 뉴스 탐색 탭에 표시될 모든 뉴스를 담는 배열
    let exploreLastKey = null; // 다음 페이지를 요청하기 위한 페이지네이션 토큰
    let isLoadingExplore = false; // 중복 '더 보기' 요청을 방지하기 위한 플래그
    let exploreCurrentPage = 0; // 뉴스 탐색 탭의 클라이언트 측 페이지네이션을 위한 현재 페이지

    // ⭐️ 페이지네이션 클릭 시 호출될 콜백 함수
    function handleExplorePageChange(newPage) {
        exploreCurrentPage = newPage;
        // API 호출 없이 화면만 다시 렌더링합니다.
        renderExploreNews(exploreNews, exploreCurrentPage, exploreLastKey, handleExplorePageChange, () => loadExploreNews(false), true);
    }
    

    // --- 초기 데이터 로드 및 이벤트 리스너 설정 ---

    async function initializeApp() {
        try {
            // 1. 데이터 가져오기
            const data = await fetchMainPageNews();
            const allArticles = data.ranked_articles; // 단일 리스트 추출
            if (!allArticles || allArticles.length === 0) {
                console.warn("No articles found.");
                return;
            }
        // 2. 메인 상단용 '중요 뉴스' 6개 추출
        // importance 점수가 높은 순으로 정렬 후 상위 6개 선택
        const topNews = [...allArticles]
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 6);
        // 3. 하단 리스트용 기본 데이터 (전체 카테고리, 최신순)
        const initialListData = [...allArticles]
            .sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));
        // 4. 메인 페이지 렌더링
        renderTopNews(topNews);           // 상단 6개 렌더링
        renderLatestNews(initialListData); // 하단 리스트 렌더링 (초기값: 전체/최신순)
        // 5. 뉴스 탐색 페이지 초기 데이터 로드
        await loadExploreNews(true); 
        // 6. 이벤트 리스너 설정 (필터링 및 정렬 로직 포함)
        // 팁: 필터링과 정렬을 위해 전체 데이터(allArticles)를 전달합니다.
        setupEventListeners(allArticles);
        showPage('main', pages, navLinks);
        } catch (error) {
            console.error('Initialization Error:', error);
        }
    }

    let exploreHasNext = true; // 더 불러올 데이터가 있는지 여부 (Spring Slice의 hasNext 매핑)


    async function loadExploreNews(isInitialLoad = false) {
        if (isLoadingExplore) return;
        // 초기 로드가 아닌데 다음 페이지가 없으면 중단
        if (!isInitialLoad && !exploreHasNext) return; 

        isLoadingExplore = true;
        const loadMoreBtn = document.querySelector('#load-more-container .load-more-btn');
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';

        if (isInitialLoad) {
            document.getElementById('explore-results').innerHTML = '<p style="text-align: center; padding: 2rem;">뉴스를 불러오는 중입니다...</p>';
            exploreNews = [];
            exploreCurrentPage = 0; // 초기 로드 시 0페이지부터 시작
            exploreHasNext = true;
        }

        const activeCategory = document.querySelector('#explore-category-filter-list .category-btn.active').dataset.category;
        const sortBy = document.getElementById('sort-order').value;
        const limit = 50; 

        // Spring API 규격에 맞춘 파라미터 구성
        const apiParams = { 
            category: activeCategory, 
            sortBy: sortBy, 
            limit: limit,
            page: exploreCurrentPage // 현재 추적 중인 페이지 번호 전송
        };

        // '전체' 카테고리 날짜 처리 (필요시)
        if (activeCategory === 'all') {
            const today = new Date();
            apiParams.date = today.toISOString().split('T')[0];
        }

        try {
            // fetchExploreNews 내부에서 전달받은 apiParams를 쿼리 스트링으로 변환해 호출해야 함
            const data = await fetchExploreNews(apiParams); 
            
            // Spring Slice 응답 구조: { content: [], hasNext: true, ... }
            const items = data.content || [];
            exploreHasNext = data.hasNext; // 다음 페이지 존재 여부 업데이트

            if (isInitialLoad) {
                exploreNews = items;
            } else {
                exploreNews.push(...items);
            }

            // 데이터 로드 성공 시 다음 페이지 번호 미리 준비
            if (exploreHasNext) {
                exploreCurrentPage++;
            }

            // UI 렌더링 (exploreLastKey 대신 exploreHasNext 전달)
            renderExploreNews(
                exploreNews, 
                exploreCurrentPage, 
                exploreHasNext, // 기존 lastKey 자리에 hasNext 전달
                handleExplorePageChange, 
                () => loadExploreNews(false), 
                true
            );

        } catch (error) {
            console.error('Failed to load explore news:', error);
        } finally {
            isLoadingExplore = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
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
            const url = news.link
            
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



async function loadAnalyticsPage() {
    try {
        console.log("분석 데이터 로딩 중...");
        // 1. API 호출
        const data = await fetchAnalyticsData();
        // 2. 받아온 데이터를 dashboard.js의 렌더링 함수에 전달
        renderDashboard(data);
    } catch (error) {
        console.error("분석 데이터 로드 실패:", error);
        // 필요하다면 여기에 에러 메시지를 화면에 띄우는 로직 추가 가능
    }
}