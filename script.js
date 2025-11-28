import { createNewsItemHTML, renderTopNews, renderLatestNews, renderExploreNews, showPage } from './ui.js';
<<<<<<< HEAD
import { fetchMainPageNews, fetchExploreNews, fetchAnalyticsData } from './api.js'; // fetchAnalyticsData 추가
import { renderDashboard } from './dashboard.js'; // dashboard.js 추가
=======
import { fetchMainPageNews, fetchExploreNews, fetchAnalyticsData } from './api.js';
import { renderDashboard } from './dashboard.js';
>>>>>>> efde4afb631eb6082a2d5793813ec88e1825ae79

document.addEventListener('DOMContentLoaded', () => {
    // --- 페이지 네비게이션 로직 ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
<<<<<<< HEAD
        link.addEventListener('click', async (event) => { // async 추가
            event.preventDefault();
            const pageId = event.target.dataset.page;
            showPage(pageId, pages, navLinks);

            // [추가됨] 분석 페이지 클릭 시 데이터 로드
=======
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            const pageId = event.target.dataset.page;
            
            // 페이지 전환 (ui.js의 showPage 함수 사용)
            showPage(pageId, pages, navLinks);

            // [추가] 분석 페이지가 활성화되면 데이터 로드
>>>>>>> efde4afb631eb6082a2d5793813ec88e1825ae79
            if (pageId === 'analysis') {
                await loadAnalyticsPage();
            }
        });
    });

<<<<<<< HEAD
    // --- 뉴스 탐색 페이지 상태 (원본 유지) ---
=======
    // ... (기존 메인/탐색 로직 유지 - 생략 가능하지만 완전함을 위해 아래 포함) ...
    // --- 뉴스 탐색 페이지 상태 ---
>>>>>>> efde4afb631eb6082a2d5793813ec88e1825ae79
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
<<<<<<< HEAD
            const topNewsDiv = document.getElementById('top-news');
            if(topNewsDiv) topNewsDiv.innerHTML = '<p>뉴스를 불러오지 못했습니다.</p>';
=======
            document.getElementById('top-news').innerHTML = '<p>뉴스를 불러오지 못했습니다.</p>';
>>>>>>> efde4afb631eb6082a2d5793813ec88e1825ae79
        }
    }

    initializeApp();

<<<<<<< HEAD
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
=======
    // --- (탐색 페이지 관련 기존 코드들은 그대로 유지된다고 가정) ---
    // ui.js의 renderPagination 등도 기존대로 작동합니다.
});

// [신규] 분석 페이지 데이터 로드 및 렌더링 함수
async function loadAnalyticsPage() {
    try {
        // 로딩 상태 표시 (선택 사항)
        // document.getElementById('stat-total-vol').textContent = 'Loading...';
        
        console.log("분석 데이터를 불러오는 중...");
        const data = await fetchAnalyticsData();
        
        // 데이터가 잘 왔는지 확인 후 렌더링
        if (data && data.chart_24h && data.trend_3h) {
            renderDashboard(data);
        } else {
            console.warn("분석 데이터 형식이 올바르지 않습니다.", data);
        }
    } catch (error) {
        console.error("분석 데이터 로드 실패:", error);
        // 사용자에게 에러 표시 로직을 추가할 수 있습니다.
        const listEl = document.getElementById('cluster-list');
        if(listEl) listEl.innerHTML = '<div style="padding:10px; color:red;">데이터 로드 실패</div>';
>>>>>>> efde4afb631eb6082a2d5793813ec88e1825ae79
    }
}