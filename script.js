document.addEventListener('DOMContentLoaded', () => {
    // --- 가상 데이터 (Mock Data) ---
    // 실제로는 API를 통해 DynamoDB에서 이와 같은 형태의 데이터를 받아옵니다.

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

    // --- 뉴스 탐색 페이지 상태 ---
    // '더 보기' 기능으로 변경되면서 클라이언트 측 페이지네이션 상태는 제거됩니다.
    // 서버로부터 데이터를 받아와 관리하기 위한 새로운 상태 변수들입니다.
    let exploreNews = []; // 뉴스 탐색 탭에 표시될 모든 뉴스를 담는 배열
    let exploreLastKey = null; // 다음 페이지를 요청하기 위한 페이지네이션 토큰
    let isLoadingExplore = false; // 중복 '더 보기' 요청을 방지하기 위한 플래그
    let exploreCurrentPage = 1; // 뉴스 탐색 탭의 클라이언트 측 페이지네이션을 위한 현재 페이지

    // --- 데이터 렌더링 함수 ---
    
    // 뉴스 아이템 HTML 템플릿
    function createNewsItemHTML(news) {
        // ⭐️ 중요도(1~10)를 별점으로 변환합니다.
        const filledSquare = news.importance;
        const emptySquare = 10 - filledSquare;
        // ⭐️ SK 값에서 '#' 뒤의 URL을 추출합니다. URL이 없으면 '#'을 기본값으로 사용합니다.
        const url = news.SK && news.SK.includes('#') ? news.SK.split('#')[1] : '#';

        // 감정 분석 클래스 및 텍스트 설정 (0.0 ~ 10.0 숫자 값 기준)
        let sentimentClass = '';
        let sentimentText = '';
        // sentiment 값을 숫자로 변환하고, 유효하지 않은 값(NaN)일 경우 기본값 5.0(중립)을 사용합니다.
        const parsedSentiment = parseFloat(news.sentiment);
        const sentimentValue = !isNaN(parsedSentiment) ? parsedSentiment : 5.0;

        if (sentimentValue >= 6.5) { // 긍정: 6.5 ~ 10.0
            sentimentClass = 'sentiment-positive';
            sentimentText = `긍정(${sentimentValue.toFixed(1)})`;
        } else if (sentimentValue <= 3.5) { // 부정: 0.0 ~ 3.5
            sentimentClass = 'sentiment-negative';
            sentimentText = `부정(${sentimentValue.toFixed(1)})`;
        } else { // 중립: 4.0 ~ 6.0
            sentimentText = `중립(${sentimentValue.toFixed(1)})`;
        }
    
        return `
           <div class="news-item" data-category="${news.main_category}" data-cluster-id="${news.clusterId || ''}">
               <h3>${news.title}</h3>
               <p>${news.topic || '주제 정보가 없습니다.'}</p>
               <div class="news-meta">
                   <span class="category">${news.main_category}</span>
                   <span>중요도: ${'★'.repeat(filledSquare)}${'☆'.repeat(emptySquare)}</span>
                   <span>${new Date(news.pub_date).toLocaleString()}</span>
               </div>
               <div class="news-details">
                   <p class="news-description">${news.description || '상세 설명이 없습니다.'}</p>
                   <div class="news-sub-meta">
                       <span>언론사: <strong>${news.outlet || '정보 없음'}</strong></span>
                       <span>소분류: <strong>${news.sub_category || '정보 없음'}</strong></span>
                   </div>
                   <div class="details-footer">
                       <span class="sentiment ${sentimentClass}">${sentimentText}</span>
                       <a href="${url}" target="_blank" class="news-link">기사 원문 보기 &rarr;</a>
                   </div>
                   <div class="related-news-container">
                       <h4>관련 뉴스</h4>
                       <div class="related-news-list"></div>
                   </div>
               </div>
           </div>
        `;
    }

    // 메인 페이지: 오늘의 주요 뉴스 렌더링
    function renderTopNews(newsData) {
        const container = document.getElementById('top-news');
        // API에서 이미 중요도 순으로 정렬된 데이터를 받았으므로, 상위 6개만 잘라서 보여줍니다.
        // is_representative가 1이거나 없는 경우(이전 데이터)만 필터링합니다. (문자열 "0"도 고려하여 != 사용)
        const representativeNews = newsData.filter(news => news.is_representative != 0);
        
        container.innerHTML = representativeNews.slice(0, 6).map(createNewsItemHTML).join('');
    }

    // 메인 페이지: 최신 뉴스 렌더링
    function renderLatestNews(newsData) {
        const container = document.getElementById('latest-news');
        // 활성화된 카테고리 버튼에서 카테고리 값을 가져옵니다.
        const activeCategoryButton = document.querySelector('#main-category-filter-list .category-btn.active');
        const category = activeCategoryButton ? activeCategoryButton.dataset.category : 'all';

        // is_representative가 1이거나 없는 경우(이전 데이터)만 필터링합니다. (문자열 "0"도 고려하여 != 사용)
        let representativeNews = newsData.filter(news => news.is_representative != 0);

        // 카테고리 필터링
        if (category !== 'all') {
            representativeNews = representativeNews.filter(news => news.main_category === category);
        }

        // API에서 이미 최신순으로 데이터를 받았으므로, 별도 정렬은 필요 없습니다.
        container.innerHTML = representativeNews.map(createNewsItemHTML).join('');
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

    try {
        // ⭐️ 1. 메인 페이지용 데이터 로드: 'all_categories_summary' 모드로 오늘의 모든 카테고리별 뉴스를 한 번에 요청합니다.
        const mainPageResponse = await fetch(`${baseUrl}?mode=all_categories_summary&date=${dateString}`);

        if (!mainPageResponse.ok) {
            console.error('API Error:', mainPageResponse.status);
            return;
        }

        const allNewsByCategory = await mainPageResponse.json();
        // ⭐️ 전체 뉴스 데이터를 저장해두어 관련 뉴스 검색에 사용합니다.
        const combinedNews = [
            ...Object.values(allNewsByCategory.important).flat(),
            ...Object.values(allNewsByCategory.latest).flat()
        ];

        // ⭐️ 중요: 'important'와 'latest'에 중복된 뉴스가 있을 수 있으므로, SK를 기준으로 중복을 제거합니다.
        const allMainPageNews = combinedNews.filter((news, index, self) =>
            index === self.findIndex(n => n.SK === news.SK)
        );

        // ⭐️ 중요: .sort()는 원본 배열을 변경하므로, [...allMainPageNews]로 복사본을 만들어 정렬합니다.
        // 이렇게 해야 allMainPageNews 배열의 순서가 유지됩니다.
        const importantNewsData = [...allMainPageNews]
            .sort((a, b) => b.importance - a.importance);
        const latestNewsData = [...allMainPageNews]
            .sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));

        // ⭐️ 2. 메인 페이지 렌더링
        renderTopNews(importantNewsData);
        renderLatestNews(latestNewsData);

        // ⭐️ 3. 뉴스 탐색 페이지 초기 데이터 로드
        await loadExploreNews(true); // isInitialLoad = true

        // ⭐️ 4. 이벤트 리스너 설정 (메인 페이지용으로는 '최신순 정렬'된 데이터를 전달)
        setupEventListeners(latestNewsData, allMainPageNews);

        showPage('main');

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
        // ⭐️ '더 보기'로 서버에서 가져올 뉴스 개수는 50개로 고정합니다.
        // 'n개씩 보기'는 불러온 데이터를 화면에 어떻게 보여줄지만 결정합니다.
        const API_FETCH_LIMIT = 50;

        // API 요청 URL 생성
        const today = new Date();
        const baseUrl = `https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB`;
        let url = `${baseUrl}?mode=explore&category=${encodeURIComponent(activeCategory)}&sortBy=${sortBy}&limit=${API_FETCH_LIMIT}`;

        // ⭐️ '전체' 카테고리일 때만 date 파라미터를 추가합니다.
        if (activeCategory === 'all') {
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            url += `&date=${dateString}`;
        }

        // ⭐️ '더 보기' 요청일 때만 exclusiveStartKey를 추가합니다.
        // 메인->탐색 직후 '더 보기'를 누르면 exploreLastKey가 null이므로, 2페이지부터 자연스럽게 로드됩니다.
        // (DynamoDB는 ExclusiveStartKey가 없으면 첫 페이지부터 조회합니다)
        if (!isInitialLoad && exploreLastKey) {
            // ⭐️ 중요: API가 importance를 문자열로 반환하는 경우에 대한 방어 코드
            // lastEvaluatedKey의 importance 값이 문자열이면 숫자로 변환합니다.
            // 이렇게 하지 않으면 다음 페이지 요청 시 DynamoDB에서 타입 오류가 발생할 수 있습니다.
            const keyToSend = { ...exploreLastKey };
            if (keyToSend.importance && typeof keyToSend.importance === 'string') {
                keyToSend.importance = parseInt(keyToSend.importance, 10);
            }
            url += `&exclusiveStartKey=${encodeURIComponent(JSON.stringify(keyToSend))}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const { items, lastEvaluatedKey } = await response.json();
            
            // ⭐️ 초기 로드일 경우, 기존 데이터를 대체합니다.
            if (isInitialLoad) {
                exploreNews = items;
            } else { // '더 보기' 시에는 항상 추가합니다. GSI를 사용하므로 중복 걱정이 없습니다.
                exploreNews.push(...items);
            }
            exploreLastKey = lastEvaluatedKey; // 다음 페이지 토큰 업데이트

            // ⭐️ '더 보기' 후에는 새로 불러온 뉴스가 포함된 마지막 페이지로 자동 이동합니다.
            if (!isInitialLoad) {
                exploreCurrentPage = Math.ceil(exploreNews.length / parseInt(document.getElementById('items-per-page').value, 10));
            }
            renderExploreNews(true); // 전체 UI를 다시 그려서 페이지 번호와 버튼을 정확하게 업데이트합니다.

        } catch (error) {
            console.error('Failed to load explore news:', error);
        } finally {
            isLoadingExplore = false; // 로딩 상태 해제
        }
    }

    // 뉴스 탐색 페이지: 페이지네이션 UI를 렌더링하는 함수
    function renderPagination() {
        const paginationContainer = document.getElementById('pagination-container');
        paginationContainer.innerHTML = '';

        const itemsPerPage = parseInt(document.getElementById('items-per-page').value, 10);
        const totalItems = exploreNews.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const currentPage = exploreCurrentPage;
        const windowSize = 4; // 현재 페이지 좌우로 보여줄 페이지 번호 개수

        if (totalPages <= 1) return; // 페이지가 하나 이하면 페이지네이션을 표시하지 않음

        const createButton = (text, page, isActive = false, isDisabled = false) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.classList.add('page-btn');
            if (isActive) btn.classList.add('active');
            if (isDisabled) btn.disabled = true;
            else {
                btn.addEventListener('click', () => {
                    exploreCurrentPage = page;
                    renderExploreNews(true);
                });
            }
            return btn;
        };

        const createEllipsis = () => {
            const span = document.createElement('span');
            span.textContent = '...';
            span.classList.add('page-ellipsis');
            return span;
        };

        // "5페이지 이전" 버튼
        paginationContainer.appendChild(createButton('<<', Math.max(1, currentPage - 5), false, currentPage <= 5));
        // "이전" 버튼
        paginationContainer.appendChild(createButton('<', currentPage - 1, false, currentPage === 1));

        let hasLeftEllipsis = false;
        let hasRightEllipsis = false;

        for (let i = 1; i <= totalPages; i++) {
            const isFirstPage = i === 1;
            const isLastPage = i === totalPages;
            const isInWindow = i >= currentPage - windowSize && i <= currentPage + windowSize;

            if (isFirstPage || isLastPage || isInWindow) {
                paginationContainer.appendChild(createButton(i, i, i === currentPage));
            } else if (i < currentPage && !hasLeftEllipsis) {
                paginationContainer.appendChild(createEllipsis());
                hasLeftEllipsis = true;
            } else if (i > currentPage && !hasRightEllipsis) {
                paginationContainer.appendChild(createEllipsis());
                hasRightEllipsis = true;
            }
        }

        // "다음" 버튼
        paginationContainer.appendChild(createButton('>', currentPage + 1, false, currentPage === totalPages));
        // "5페이지 다음" 버튼
        paginationContainer.appendChild(createButton('>>', Math.min(totalPages, currentPage + 5), false, currentPage >= totalPages - 4));
    }

    // 뉴스 탐색 페이지: 뉴스 목록과 '더 보기' 버튼을 렌더링하는 함수
    function renderExploreNews(isFullRender = false) {
        const resultsContainer = document.getElementById('explore-results'); 
        const paginationContainer = document.getElementById('pagination-container');
        const loadMoreContainer = document.getElementById('load-more-container');

        // 페이지 번호와 '더 보기' 버튼 컨테이너만 초기화합니다.
        // 뉴스 목록(resultsContainer)은 isFullRender가 아닐 때는 초기화하지 않아 스크롤 위치를 유지합니다.
        paginationContainer.innerHTML = '';
        loadMoreContainer.innerHTML = '';

        // '더 보기'가 아닌, 페이지 이동이나 필터 변경 시에는 뉴스 목록을 비웁니다.
        if (isFullRender) resultsContainer.innerHTML = '';

        const itemsPerPage = parseInt(document.getElementById('items-per-page').value, 10);
        const totalItems = exploreNews.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // 현재 페이지에 맞는 뉴스만 잘라내서 보여주기
        const startIndex = (exploreCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedNews = exploreNews.slice(startIndex, endIndex);

        // isFullRender일 때는 전체를, 아닐 때는 새로 추가된 부분만 렌더링합니다.
        // is_representative가 1이거나 없는 경우(이전 데이터)만 필터링하여 화면에 표시합니다. (문자열 "0"도 고려하여 != 사용)
        const representativeNews = paginatedNews.filter(news => news.is_representative != 0);

        if (isFullRender) {
            resultsContainer.innerHTML = representativeNews.map(createNewsItemHTML).join('');
        } else {
            resultsContainer.insertAdjacentHTML('beforeend', representativeNews.map(createNewsItemHTML).join(''));
        }
        
        // ⭐️ 개선된 페이지네이션 렌더링 함수 호출
        renderPagination();
        
        // '더 보기' 버튼은 서버에 더 많은 데이터가 있고, 사용자가 마지막 페이지를 보고 있을 때만 표시
        if (exploreLastKey && exploreCurrentPage === totalPages) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = '더 보기';
            loadMoreBtn.classList.add('load-more-btn');
            loadMoreBtn.addEventListener('click', () => loadExploreNews(false));
            loadMoreContainer.appendChild(loadMoreBtn);
        }

        // 만약 뉴스가 하나도 없다면(초기 상태) '더 보기' 버튼을 표시
        if (totalItems === 0) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = '뉴스 불러오기';
            loadMoreBtn.classList.add('load-more-btn');
            loadMoreBtn.addEventListener('click', () => loadExploreNews(false));
            loadMoreContainer.appendChild(loadMoreBtn);
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
            renderExploreNews(true);
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
            showPage('explore');

            // 4. 동기화된 카테고리로 뉴스 탐색 페이지의 데이터를 새로 불러옵니다.
            //    이제 GSI를 사용하므로 메인 페이지와 일관된 결과를 얻을 수 있습니다.
            loadExploreNews(true);
        });

        // 로고 클릭 시 메인 페이지로 이동
        document.getElementById('logo-link').addEventListener('click', (event) => {
            event.preventDefault();
            showPage('main');
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