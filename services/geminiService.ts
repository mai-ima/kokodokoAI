
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, GroundingSource, DetailedContext } from "../types";

// Helper to clean JSON string from Markdown code blocks
const cleanJsonText = (text: string): string => {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
};

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Keyが設定されていません。環境変数 API_KEY を確認してください。");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 日本国内の地理・インフラ特性を熟知した専門OSINT-AI「ここどこAI」
 */
export const analyzeLocationImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
          {
            text: `あなたは日本国内の地理・インフラ・文字情報分析に特化した超高精度OSINT AIです。
提供された画像から撮影場所をピンポイントで特定し、その根拠と共にJSON形式で出力してください。

**重要: 以下の順序で論理的に場所を絞り込んでください。**

1. 【文字情報の徹底解析】(最優先):
   - 電柱プレート（NTT・電力柱の地名・番号・支線番号）
   - 信号機・標識の交差点名・地名ローマ字表記
   - 自動販売機の住所ステッカー、消火栓の看板
   - 店舗看板の市外局番、住所、チェーン店名
   - 定礎板、工事看板、選挙ポスター
   ※画像内に読める文字があれば、それを最強の根拠として住所を特定してください。

2. 【地域固有インフラの解析】:
   - マンホールの紋章（市町村章）のデザイン
   - ガードレールの色・形状（山口県の黄色、神奈川県の銀杏など）
   - カーブミラーの支柱形状、デリネーター（視線誘導標）の形式
   - 信号機のメーカー（コイト、京三など）とLED/電球のタイプ

3. 【自然・景観の解析】:
   - 山座同定（背景の山の稜線による場所特定）
   - 植生（ソテツがあれば南国、針葉樹林なら寒冷地など）
   - 建築様式（屋根瓦の色・形状、積雪対策設備）

**出力ルール**:
- 根拠が薄い場合は、無理に番地まで特定せず、確実な範囲（市区町村レベル）にとどめ、confidenceScoreを厳格に評価してください。
- "description" には、特定に至るまでの証拠の積み上げ（「電柱に〇〇の文字があるため、××市と断定」など）を論理的に記述してください。

出力JSON:
{
  "locationName": "場所の固有名詞（例：京都府京都市東山区 清水寺 三重塔付近）",
  "region": "都道府県・市区町村",
  "addressGuess": "推定される具体的な詳細住所",
  "latitude": 緯度(数値),
  "longitude": 経度(数値),
  "confidenceScore": 確信度(0-100),
  "visualEvidence": [
    {
      "element": "特定の手がかり要素（例：電柱プレートの文字）",
      "area": "画像内の位置",
      "x": 0-100,
      "y": 0-100,
      "observation": "読み取れた内容（例：'千代田 25-1'と記載）",
      "significance": "特定における意味（例：千代田区千代田周辺であることを示す決定的な証拠）"
    }
  ],
  "environmentContext": "周辺環境の要約",
  "description": "論理的な特定プロセス全文"
}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        temperature: 0, // 決定論的動作によりハルシネーションを抑制
      },
    });

    const rawText = cleanJsonText(response.text || "{}");
    
    try {
      const parsed = JSON.parse(rawText);
      return {
        ...parsed,
        visualEvidence: Array.isArray(parsed.visualEvidence) ? parsed.visualEvidence : []
      } as AnalysisResult;
    } catch (e) {
      console.error("Failed to parse analysis result. Raw text:", rawText, e);
      throw new Error("AIからの応答が不正な形式でした。");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "解析中にエラーが発生しました。");
  }
};

/**
 * プログレードモデルによる極限フォレンジック鑑定
 */
export const analyzeDetailedContext = async (base64Image: string, currentResult: AnalysisResult): Promise<DetailedContext> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
          {
            text: `あなたは科学捜査レベルの画像解析能力を持つ高度OSINT分析官です。
現在、この場所は「${currentResult.locationName}」周辺と推定されています。
この仮説を検証し、さらに詳細な状況を特定するために、画像内の微細な情報を再鑑定してください。

重点鑑定項目:
1. **Architecture & Age**: 建物の経年劣化、サッシの形状、建築資材から年代と地域性を特定。
2. **Micro-Infrastructure**: 路面の舗装状態、側溝の蓋の種類、電線の配置、ポールの管理シール。
3. **Bio-Geography**: 植生の詳細（品種）、太陽の位置と影の角度からの概略時刻・方位の推定。
4. **Textual Mapping**: かすれた文字、遠くの看板、ポスターの内容を復元・解読し、エリアを限定。
5. **Final Conclusion**: 上記の証拠を総合し、最初の推定場所が正しいかの判定と、より詳細な位置情報の結論。

出力フォーマット（日本語で詳細に記述）：
{
  "architecture": "...",
  "infrastructure": "...",
  "vegetation": "...",
  "signage": "...",
  "forensicConclusion": "..."
}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 8000 } 
      },
    });

    const rawText = cleanJsonText(response.text || "{}");
    return JSON.parse(rawText) as DetailedContext;
  } catch (error: any) {
    console.error("Detailed Analysis Error:", error);
    throw new Error(error.message || "詳細解析中にエラーが発生しました。");
  }
};

/**
 * Google検索による裏付け検証
 */
export const fetchLocationDetails = async (location: AnalysisResult): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `「${location.locationName} ${location.addressGuess}」の地理的整合性を最新のストリートビューデータと公的台帳に基づいて「ここどこAI」として検証し、報告してください。`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract website URLs from groundingChunks as per Search Grounding guidelines.
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web)
      ?.map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri,
      })) || [];

    return { text: response.text || "", sources };
  } catch (error: any) {
    console.warn("Search grounding failed, returning empty result:", error);
    return { text: "検索による裏付け情報を取得できませんでした。", sources: [] };
  }
};
