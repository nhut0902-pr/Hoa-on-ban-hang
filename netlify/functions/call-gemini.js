// File: netlify/functions/call-gemini.js

exports.handler = async function(event) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // *** SỬA LỖI: Đổi tên model thành phiên bản mới nhất và ổn định ***
    const modelName = 'gemini-1.5-flash-latest';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Missing prompt' }) };
        }
        if (!GEMINI_API_KEY) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not set.' })};
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const responseData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Lỗi từ Gemini API:", responseData);
            const errorMessage = responseData.error?.message || 'Unknown error from Gemini API';
            throw new Error(errorMessage);
        }
        
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
            body: JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
        };
    }
};
