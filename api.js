const BASE_URL = `https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB`;
// Reader Lambda API URL (분석용)
const ANALYTICS_API_URL = "https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Request_Analysis_Lambda"; 

async function handleApiResponse(response) {
    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('API Error:', response.status, errorDetails);
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

// 메인 페이지 뉴스 (기존 유지)
export async function fetchMainPageNews(dateString) {
    const url = `${BASE_URL}?mode=all_categories_summary&date=${dateString}`;
    const response = await fetch(url);
    return handleApiResponse(response);
}

// [수정됨] 뉴스 탐색 (400 에러 해결 시도: category_list -> list)
export async function fetchExploreNews({ category, sortBy, limit, date, exclusiveStartKey }) {
    // mode를 'list'로 변경하여 호출합니다. (백엔드 스펙에 따라 'news' 또는 'category'일 수도 있습니다)
    let url = `${BASE_URL}?mode=list&category=${encodeURIComponent(category)}&sortBy=${sortBy}&limit=${limit}`;
    
    if (date) url += `&date=${date}`;
    if (exclusiveStartKey) {
        const keyString = encodeURIComponent(JSON.stringify(exclusiveStartKey));
        url += `&exclusiveStartKey=${keyString}`;
    }

    const response = await fetch(url);
    return handleApiResponse(response);
}

// [신규] 분석 데이터 호출
export async function fetchAnalyticsData() {
    const response = await fetch(ANALYTICS_API_URL);
    return handleApiResponse(response);
}