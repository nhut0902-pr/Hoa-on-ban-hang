// Phiên bản này không cần 'require' hay 'npm install'
// Nó dùng 'fetch' có sẵn trong môi trường Netlify Functions.

exports.handler = async function(event) {
    // Lấy API key từ biến môi trường của Netlify (AN TOÀN)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: 'Bad Request: Missing prompt' };
        }

        // Cấu trúc body request theo yêu cầu của Gemini REST API
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        // Gọi API của Gemini bằng fetch
        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            console.error("Lỗi từ Gemini API:", await geminiResponse.text());
            throw new Error('Lỗi khi gọi Gemini API');
        }

        const responseData = await geminiResponse.json();
        
        // Trích xuất nội dung text từ response
        const text = responseData.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
        };

    } catch (error) {
        console.error("Lỗi trong hàm serverless:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
