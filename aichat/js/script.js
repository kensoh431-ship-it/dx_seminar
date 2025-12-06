// APIキーの情報を読み込む
import { GEMINI_API_KEY } from './config.js';

// @google/genai ライブラリを読み込む
import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai';

// @google/genai ライブラリを初期化
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// メッセージ送信
$('#send').on('click', function () {
     // ユーザーメッセージを取得
    const userMessage = $('#user-input').val();

    // ユーザーメッセージが空の場合の処理
    if (!userMessage) {
        $('#input-history')
            .css({ 'visibility': 'visible', 'padding': '1rem', 'color': 'red' })
            .html('メッセージが入力されていません');
        $('#response')
            .css({ 'padding': '1rem', 'color': 'red', 'min-height': '0px' })
            .html('処理できません');
        return;
    }

    // 入力したメッセージを表示
    $('#input-history')
        .css({ 'visibility': 'visible', 'padding': '1rem', 'color': '#333' })
        .html('入力したメッセージ<br><br>' + userMessage);

    // ユーザーメッセージをクリア
    $('#user-input').val('');

    // 回答エリアのスタイルをリセット
    $('#response')
        .css({ 'padding': '1rem', 'color': '#333', 'min-height': '100px' });

    // ★ Gemini API を実行する関数 callGeminiAPI を呼び出す
    callGeminiAPI(userMessage);
});

// Gemini API呼び出し関数
function callGeminiAPI(message) {
    $('#response').html('考え中...');

    // @google/genai ライブラリを使用して Gemini API を呼び出す
    genAI.models
        .generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        })
        .then(function (response) {
            // AIの回答を取得
            const aiResponse = response.text;
            // AIの回答を表示
            $('#response').html(aiResponse);
        });
}
