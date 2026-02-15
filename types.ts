
export interface VisualClue {
  element: string;
  area: string;
  x?: number; // 画像内のパーセント座標 (横)
  y?: number; // 画像内のパーセント座標 (縦)
  observation: string;
  significance: string;
}

export interface DetailedContext {
  architecture: string;
  infrastructure: string;
  vegetation: string;
  signage: string;
  forensicConclusion: string;
}

export interface AnalysisResult {
  locationName: string;
  region: string;
  addressGuess: string;
  latitude?: number;
  longitude?: number;
  confidenceScore: number;
  visualEvidence: VisualClue[];
  environmentContext: string;
  description: string;
  detailedContext?: DetailedContext; // 詳細分析結果を保持
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: AnalysisResult;
  searchSources: GroundingSource[];
  searchText: string;
}

export interface AppState {
  image: string | null;
  isAnalyzing: boolean;
  isDetailedAnalyzing: boolean; // 詳細分析中フラグ
  result: AnalysisResult | null;
  searchSources: GroundingSource[];
  error: string | null;
  history: HistoryItem[];
}
