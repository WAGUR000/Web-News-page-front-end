export function createNewsItemHTML(news) {
    const filledSquare = news.importance;
    const emptySquare = 10 - filledSquare;
    const url = news.SK && news.SK.includes('#') ? news.SK.split('#')[1] : '#';

    let sentimentClass = '';
    let sentimentText = '';
    const parsedSentiment = parseFloat(news.sentiment);
    const sentimentValue = !isNaN(parsedSentiment) ? parsedSentiment : 5.0;

    if (sentimentValue >= 6.5) {
        sentimentClass = 'sentiment-positive';
        sentimentText = `긍정(${sentimentValue.toFixed(1)})`;
    } else if (sentimentValue <= 3.5) {
        sentimentClass = 'sentiment-negative';
        sentimentText = `부정(${sentimentValue.toFixed(1)})`;
    } else {
        sentimentClass = 'sentiment-neutral';
        sentimentText = `중립(${sentimentValue.toFixed(1)})`;
    }

    const importanceSquares = '■'.repeat(filledSquare) + '□'.repeat(emptySquare);

    return `
        <div class="news-item" onclick="window.open('${url}', '_blank')">
            <div class="news-header">
                <div>
                    <span class="news-category">${news.main_category}</span>
                    ${news.sub_category ? `<span class="news-subcategory">${news.sub_category}</span>` : ''}
                </div>
                <span class="news-sentiment ${sentimentClass}">${sentimentText}</span>
            </div>
            <h3 class="news-title">${news.title}</h3>
            <div class="news-meta">
                <span>${news.outlet}</span>
                <span class="news-importance" title="중요도: ${news.importance}">${importanceSquares}</span>
            </div>
        </div>
    `;
}

export function renderTopNews(newsList) {
    const container = document.getElementById('top-news');
    if (!container) return;
    
    // 중요도 순 정렬 후 상위 3개
    const sorted = [...newsList].sort((a, b) => b.importance - a.importance).slice(0, 3);
    container.innerHTML = sorted.map(createNewsItemHTML).join('');
}

export function renderLatestNews(newsList) {
    const container = document.getElementById('latest-news');
    if (!container) return;
    
    // 최신순 정렬 (pub_date 기준)
    const sorted = [...newsList].sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date)).slice(0, 10);
    container.innerHTML = sorted.map(createNewsItemHTML).join('');
}

export function renderExploreNews(newsList, containerId = 'explore-results') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = newsList.map(createNewsItemHTML).join('');
}

export function showPage(pageId, pages, navLinks) {
    if (!pages || !navLinks) return;

    pages.forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) targetPage.classList.add('active');

    navLinks.forEach(link => {
        if (link.dataset.page === pageId) link.classList.add('active');
        else link.classList.remove('active');
    });
}