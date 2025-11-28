import { createNewsItemHTML, renderTopNews, renderLatestNews, renderExploreNews, showPage } from './ui.js';
import { fetchMainPageNews, fetchExploreNews, fetchAnalyticsData } from './api.js'; // fetchAnalyticsData 추가
import { renderDashboard } from './dashboard.js'; // dashboard.js 추가

document.addEventListener('DOMContentLoaded', () => {
    // --- 페이지 네비게이션 로직 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => { // async 추가
            event.preventDefault();
            const pageId = event.target.dataset.page;
            showPage(pageId, pages, navLinks);

            // [추가됨] 분석 페이지 클릭 시 데이터 로드
            if (pageId === 'analysis') {
                await loadAnalyticsPage();
            }
        });
    });

    // --- 뉴스 탐색 페이지 상태 (원본 유지) ---
    let exploreNews = [];
    let exploreLastKey = null;
    let isLoadingExplore = false;
    let exploreCurrentPage = 1;

    // --- 초기화 로직 (원본 유지) ---
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

    initializeApp();

    // (참고: 탐색 페이지 관련 로직은 ui.js와 연동되어 작동하므로 그대로 둡니다)
});

// [추가됨] 분석 데이터 로드 함수
async function loadAnalyticsPage() {
    try {
        console.log("분석 데이터 로딩...");
        const data = await fetchAnalyticsData();
        renderDashboard(data);
    } catch (error) {
        console.error("분석 데이터 로드 실패:", error);
    }
}