const BASE_URL = `https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB`;
// [추가] Reader Lambda API Gateway URL
const ANALYTICS_API_URL = "https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Request_Analysis_Lambda"; 

/**
 * API 요청 중 발생하는 에러를 처리하고 응답을 JSON으로 파싱하는 헬퍼 함수
 */
async function handleApiResponse(response) {
    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('API Error:', response.status, errorDetails);
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

/**
 * 메인 페이지 뉴스 데이터 가져오기
 */
export async function fetchMainPageNews(dateString) {
    const url = `${BASE_URL}?mode=all_categories_summary&date=${dateString}`;
    const response = await fetch(url);
    return handleApiResponse(response);
}

/**
 * 뉴스 탐색 페이지 데이터 가져오기
 */
export async function fetchExploreNews({ category, sortBy, limit, date, exclusiveStartKey }) {
    let url = `${BASE_URL}?mode=category_list&category=${encodeURIComponent(category)}&sortBy=${sortBy}&limit=${limit}`;
    
    if (date) {
        url += `&date=${date}`;
    }

    if (exclusiveStartKey) {
        const keyString = encodeURIComponent(JSON.stringify(exclusiveStartKey));
        url += `&exclusiveStartKey=${keyString}`;
    }

    const response = await fetch(url);
    return handleApiResponse(response);
}

/**
 * [신규] 분석 데이터 가져오기 (Reader Lambda 호출)
 */
export async function fetchAnalyticsData() {
    const response = await fetch(ANALYTICS_API_URL);
    return handleApiResponse(response);
}