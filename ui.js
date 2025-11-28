 // 뉴스 아이템 HTML 템플릿
 export function createNewsItemHTML(news) {
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
 export function renderTopNews(newsData) {
        const container = document.getElementById('top-news');
        // API에서 이미 중요도 순으로 정렬된 데이터를 받았으므로, 상위 6개만 잘라서 보여줍니다.
        // is_representative가 1이거나 없는 경우(이전 데이터)만 필터링합니다. (문자열 "0"도 고려하여 != 사용)
        const representativeNews = newsData.filter(news => news.is_representative != 0);
        
        container.innerHTML = representativeNews.slice(0, 6).map(createNewsItemHTML).join('');
    }

 export function renderLatestNews(newsData) {
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


    // 뉴스 탐색 페이지: 페이지네이션 UI를 렌더링하는 함수
 export function renderPagination(exploreNews, exploreCurrentPage, onPageChange) {
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
                btn.addEventListener('click', () => onPageChange(page));
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
 export function renderExploreNews(
        exploreNews, 
        exploreCurrentPage, 
        exploreLastKey, 
        onPageChange,
        onLoadMore,
        isFullRender = false
    ) {
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
        renderPagination(exploreNews, exploreCurrentPage, onPageChange);
        
        // '더 보기' 버튼은 서버에 더 많은 데이터가 있고, 사용자가 마지막 페이지를 보고 있을 때만 표시
        if (exploreLastKey && exploreCurrentPage === totalPages) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = '더 보기';
            loadMoreBtn.classList.add('load-more-btn');
            loadMoreBtn.addEventListener('click', onLoadMore);
            loadMoreContainer.appendChild(loadMoreBtn);
        }

        // 만약 뉴스가 하나도 없다면(초기 상태) '더 보기' 버튼을 표시
        if (totalItems === 0) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = '뉴스 불러오기';
            loadMoreBtn.classList.add('load-more-btn');
            loadMoreBtn.addEventListener('click', onLoadMore);
            loadMoreContainer.appendChild(loadMoreBtn);
        }
    }

export function showPage(pageId, pages, navLinks) { // pages와 navLinks를 다시 인자로 받습니다.
    // ⭐️ pages나 navLinks가 없으면 아무것도 하지 않습니다 (초기화 단계에서 호출될 수 있음).
    if (!pages || !navLinks) return;

    pages.forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');

    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
}