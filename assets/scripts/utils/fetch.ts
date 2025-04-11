// fetchUtils.ts
const baseUrl = 'http://localhost:3000'; // 修改为你的API基础URL

interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: HeadersInit;
    mode?: 'cors'; // 允许跨域
}

async function fetchAPI(endpoint: string, options: FetchOptions = { method: 'GET', mode: 'cors' }) {
    const url = `${baseUrl}${endpoint}`;

    // 准备请求配置
    const config: RequestInit = {
        method: options.method,
        headers: {
            'Content-Type': 'Authorization',
            ...options.headers
        },
        mode: options.mode,
        body: (options.method === 'POST' || options.method === 'PUT') ? JSON.stringify(options.body) : null
        // body: ['POST', 'PUT'].includes(options.method ?? '') ? JSON.stringify(options.body) : null
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) { // 检查HTTP状态码
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json(); // 假设服务器响应是JSON
    } catch (error) {
        console.error("Fetch error:", error);
        throw error; // 抛出错误让调用者处理
    }
}

export default fetchAPI;
