const BASE_URL = "https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Access_DynamoDB";
const ANALYTICS_API_URL = "https://xxterco9tj.execute-api.ap-northeast-2.amazonaws.com/default/Request_Analysis_Lambda"; 

/**
 * API 요청 중 발생하는 에러를 처리하고 응답을 JSON으로 파싱하는 헬퍼 함수
 * @param {Response} response - fetch 응답 객체
 * @returns {Promise<any>} JSON으로 파싱된 데이터
 * @throws {Error} API 요청이 실패했을 때 발생하는 에러
 */
async function handleApiResponse(response) {
    if (!response.ok) {
        // 에러 응답의 본문을 읽어 좀 더 구체적인 에러 메시지를 얻으려고 시도합니다.
        const errorDetails = await response.text();
        console.error('API Error:', response.status, errorDetails);
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

/**
 * 메인 페이지에 필요한 오늘의 모든 카테고리별 뉴스를 가져옵니다.
 * @param {string} dateString - 'YYYY-MM-DD' 형식의 날짜 문자열
 * @returns {Promise<object>} 카테고리별로 분류된 뉴스 데이터
 */
export async function fetchMainPageNews(dateString) {
    const url = `${BASE_URL}?mode=all_categories_summary&date=${dateString}`;
    const response = await fetch(url);
    return handleApiResponse(response);
}

/**
 * 뉴스 탐색 페이지의 뉴스 데이터를 필터에 맞게 가져옵니다.
 * @param {object} params - API 요청 파라미터
 * @param {string} params.category - 뉴스 카테고리
 * @param {string} params.sortBy - 정렬 기준 ('latest' 또는 'important')
 * @param {number} params.limit - 가져올 뉴스 개수
 * @param {string} [params.date] - 'YYYY-MM-DD' 형식의 날짜 문자열 (주로 'all' 카테고리용)
 * @param {object} [params.exclusiveStartKey] - 페이지네이션을 위한 DynamoDB의 exclusiveStartKey
 * @returns {Promise<{items: Array<object>, lastEvaluatedKey: object}>} 뉴스 목록과 다음 페이지 토큰
 */
export async function fetchExploreNews({ category, sortBy, limit, date, exclusiveStartKey }) {
    const params = new URLSearchParams({
        mode: 'explore',
        category,
        sortBy,
        limit,
    });
    if (date) params.append('date', date);
    if (exclusiveStartKey) params.append('exclusiveStartKey', JSON.stringify(exclusiveStartKey));

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    return handleApiResponse(response);
}
export async function fetchAnalyticsData() {
    // 실제 API가 준비되지 않았다면 테스트용 URL이나 모의 데이터를 사용하세요.
    // const response = await fetch(ANALYTICS_API_URL);
    // return handleApiResponse(response);
    
    // [테스트용 임시 코드 - API 연결 전까지 사용]
    // Reader Lambda 테스트 결과를 그대로 리턴하는 흉내를 냅니다.
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                chart_24h: [
                    { time: "10시", volume: 120, avgSentiment: 5.5, avgImportance: 6.0 },
                    { time: "11시", volume: 150, avgSentiment: 4.2, avgImportance: 7.5 },
                    { time: "12시", volume: 200, avgSentiment: 6.8, avgImportance: 5.2 },
                    { time: "13시", volume: 180, avgSentiment: 5.9, avgImportance: 6.1 },
                    { time: "14시", volume: 300, avgSentiment: 5.84, avgImportance: 6.72 }
                ],
                trend_3h: {
                    keywords: [
                        { keyword: "홍콩", count: 50 }, { keyword: "화재", count: 45 },
                        { keyword: "AI", count: 30 }, { keyword: "구세군", count: 20 },
                        { keyword: "국회", count: 15 }
                    ],
                    clusters: [
                        { title: "홍콩 아파트 대형 화재 참사", imp: 8.5, sent: 2.1 },
                        { title: "국회 예산안 처리 진통", imp: 7.2, sent: 4.5 },
                        { title: "연말 구세군 자선냄비 시종식", imp: 6.0, sent: 7.8 }
                    ]
                }
            });
        }, 500);
    });
}