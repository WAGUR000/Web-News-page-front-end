import { createNewsItemHTML, renderTopNews, renderLatestNews, renderExploreNews, showPage } from './ui.js';
import { fetchMainPageNews, fetchExploreNews, fetchAnalyticsData } from './api.js';
import { renderDashboard } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 페이지 네비게이션 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            const pageId = event.target.dataset.page;
            
            showPage(pageId, pages, navLinks);

            // [추가] 분석 페이지 클릭 시 데이터 로드
            if (pageId === 'analysis') {
                await loadAnalyticsPage();
            }
        });
    });

    // --- 뉴스 탐색 상태 변수 ---
    let exploreNews = [];
    let exploreLastKey = null;
    let isLoadingExplore = false;

    // --- 초기화: 메인 뉴스 로드 ---
    async function initializeApp() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const data = await fetchMainPageNews(today);
            window.allMainPageNews = Object.values(data).flat();
            renderTopNews(window.allMainPageNews);
            renderLatestNews(window.allMainPageNews);
        } catch (error) {
            console.error('초기화 실패:', error);
            const topNewsDiv = document.getElementById('top-news');
            if(topNewsDiv) topNewsDiv.innerHTML = '<p>뉴스를 불러오지 못했습니다.</p>';
        }
    }

    // --- 뉴스 탐색 기능 (복구됨) ---
    async function loadExploreNews(isNewSearch = false) {
        if (isLoadingExplore) return;
        isLoadingExplore = true;

        try {
            // 현재 선택된 카테고리와 정렬 기준 가져오기
            const activeCategoryBtn = document.querySelector('#explore-category-filter-list .category-btn.active');
            const category = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';
            
            const sortSelect = document.getElementById('sort-order');
            const sortBy = sortSelect ? sortSelect.value : 'latest';

            if (isNewSearch) {
                exploreNews = [];
                exploreLastKey = null;
                document.getElementById('explore-results').innerHTML = '';
            }

            const data = await fetchExploreNews({
                category,
                sortBy,
                limit: 10,
                exclusiveStartKey: exploreLastKey
            });

            if (data.items.length > 0) {
                exploreNews = [...exploreNews, ...data.items];
                exploreLastKey = data.lastEvaluatedKey;
                
                // 기존 목록에 추가 렌더링
                const container = document.getElementById('explore-results');
                container.insertAdjacentHTML('beforeend', data.items.map(createNewsItemHTML).join(''));
            }

            // 더 보기 버튼 상태 관리
            const loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = exploreLastKey ? 'inline-block' : 'none';
            }

        } catch (error) {
            console.error('탐색 로드 실패:', error);
        } finally {
            isLoadingExplore = false;
        }
    }

    // 이벤트 리스너: 카테고리 필터 클릭
    const categoryFilters = document.getElementById('explore-category-filter-list');
    if (categoryFilters) {
        categoryFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                // 활성 상태 변경
                document.querySelectorAll('#explore-category-filter-list .category-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                // 검색 실행
                loadExploreNews(true);
            }
        });
    }

    // 이벤트 리스너: 정렬 변경
    const sortOrder = document.getElementById('sort-order');
    if (sortOrder) {
        sortOrder.addEventListener('change', () => loadExploreNews(true));
    }

    // 더 보기 버튼 생성 및 이벤트
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        loadMoreContainer.innerHTML = '<button id="load-more-btn" class="load-more-btn">더 보기</button>';
        const btn = document.getElementById('load-more-btn');
        btn.addEventListener('click', () => loadExploreNews(false));
        // 초기에는 숨김
        btn.style.display = 'none'; 
    }

    // 앱 시작 및 초기 탐색 데이터 로드
    initializeApp();
    loadExploreNews(true);
});

// [추가] 분석 데이터 로드 함수
async function loadAnalyticsPage() {
    try {
        console.log("분석 데이터 로딩...");
        const data = await fetchAnalyticsData();
        renderDashboard(data);
    } catch (error) {
        console.error("분석 데이터 로드 실패:", error);
    }
}