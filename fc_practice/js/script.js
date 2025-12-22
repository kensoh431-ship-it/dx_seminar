import { GEMINI_API_KEY } from './config.js';
import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai';

const genAI = new GoogleGenAI(GEMINI_API_KEY);

// --- 1. Geminiに提供する「ツール（関数）」の定義 ---

/**
 * NominatimとOpen-Meteoを使用して天気を取得する関数
 * この関数はGeminiから呼び出されます
 */
async function fetchWeather(location) {
    try {
        // ステップ1: 地名から座標を取得 (Nominatim API)
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
        const geoResp = await fetch(geoUrl, { headers: { 'User-Agent': 'MyWeatherApp/1.0' } });
        const geoData = await geoResp.json();

        if (!geoData || geoData.length === 0) {
            return { error: "場所が見つかりませんでした。" };
        }

        const { lat, lon } = geoData[0];

        // ステップ2: 座標から天気を取得 (Open-Meteo API)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;
        const weatherResp = await fetch(weatherUrl);
        const weatherData = await weatherResp.json();

        // Geminiに返す情報を整理（当日と翌日のデータ）
        return {
            location: location,
            today: {
                weather: getWeatherText(weatherData.daily.weathercode[0]),
                maxTemp: weatherData.daily.temperature_2m_max[0],
                minTemp: weatherData.daily.temperature_2m_min[0]
            },
            tomorrow: {
                weather: getWeatherText(weatherData.daily.weathercode[1]),
                maxTemp: weatherData.daily.temperature_2m_max[1],
                minTemp: weatherData.daily.temperature_2m_min[1]
            }
        };
    } catch (error) {
        console.error("Weather Fetch Error:", error);
        return { error: "天気データの取得中にエラーが発生しました。" };
    }
}

/**
 * 天気コードを日本語に変換
 */
function getWeatherText(code) {
    const weatherCodes = {
        0: "快晴", 1: "晴れ", 2: "時々曇り", 3: "曇り",
        45: "霧", 48: "霧氷", 51: "小雨", 53: "雨", 55: "強い雨",
        61: "小雨", 63: "雨", 65: "激しい雨", 71: "小雪", 73: "雪", 75: "激しい雪",
        80: "にわか雨", 81: "雨", 82: "激しいにわか雨", 95: "雷雨"
    };
    return weatherCodes[code] || "不明";
}

// --- 2. Gemini API の設定 ---

// 利用可能な関数を定義
const tools = [
    {
        functionDeclarations: [
            {
                name: "fetchWeather",
                description: "指定された地名の現在の天気、最高気温、最低気温を取得します。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        location: {
                            type: "string",
                            description: "地名（例：東京、大阪府、札幌市など）",
                        },
                    },
                    required: ["location"],
                },
            },
        ],
    },
];

// モデルの初期化（ツールを組み込む）
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: tools,
});

// チャットセッションの開始
let chat = model.startChat();

// --- 3. イベントハンドラとAPI実行 ---

$('#send').on('click', async function () {
    const userMessage = $('#user-input').val();
    if (!userMessage) return;

    // 画面表示の更新
    $('#input-history').css('visibility', 'visible').html('入力メッセージ: ' + userMessage);
    $('#user-input').val('');
    $('#response').html('考え中...');

    await callGeminiWithSmartFunctions(userMessage);
});

/**
 * Function Callingを制御するメイン関数
 */
async function callGeminiWithSmartFunctions(message) {
    try {
        // 1. ユーザーのメッセージを送信
        let result = await chat.sendMessage(message);
        let response = result.response;
        
        // 2. Geminiが「関数を呼び出したい」と言っているか確認
        const calls = response.functionCalls();

        if (calls && calls.length > 0) {
            const call = calls[0]; // 最初の関数呼び出しを取得
            
            if (call.name === "fetchWeather") {
                // 3. 実際のAPIをJavaScript側で実行
                const weatherInfo = await fetchWeather(call.args.location);

                // 4. APIの結果をGeminiにフィードバックして、最終的な返答をもらう
                const result2 = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: "fetchWeather",
                            response: { content: weatherInfo },
                        },
                    },
                ]);
                
                // 5. Geminiが作成した自然な文章を表示
                $('#response').html(result2.response.text());
            }
        } else {
            // 関数呼び出しが不要な場合（普通の雑談など）
            $('#response').html(response.text());
        }
    } catch (error) {
        console.error("Gemini Error:", error);
        $('#response').html("エラーが発生しました。");
    }
}