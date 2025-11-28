const BASE_URL = `https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB`;
// [추가] 분석 API URL
const ANALYTICS_API_URL = "https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Request_Analysis_Lambda"; 

async function handleApiResponse(response) {
    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('API Error:', response.status, errorDetails);
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

export async function fetchMainPageNews(dateString) {
    const url = `${BASE_URL}?mode=all_categories_summary&date=${dateString}`;
    const response = await fetch(url);
    return handleApiResponse(response);
}

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

// [추가됨] 분석 데이터 가져오기
export async function fetchAnalyticsData() {
    const response = await fetch(ANALYTICS_API_URL);
    return handleApiResponse(response);
}