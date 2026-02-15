
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ResultCard from './components/ResultCard';
import { AppState, HistoryItem, AnalysisResult } from './types';
import { analyzeLocationImage, fetchLocationDetails, analyzeDetailedContext } from './services/geminiService';

const HistoryItemCard: React.FC<{ 
  item: HistoryItem; 
  onLoad: (item: HistoryItem) => void; 
  onDelete: (e: React.MouseEvent, id: string) => void; 
}> = ({ item, onLoad, onDelete }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      onClick={() => onLoad(item)} 
      className="group relative bg-white ios-card overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border border-black/5"
    >
      <div className="aspect-video w-full bg-slate-50 relative overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col justify-end p-4">
            <div className="absolute inset-0 skeleton" />
            <div className="relative z-11 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200/50 rounded-full animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-200/40 rounded-full animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-image text-slate-200 text-3xl opacity-50"></i>
            </div>
          </div>
        )}
        
        <img 
          src={item.image} 
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`} 
          alt={item.result.locationName} 
        />
        
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute bottom-5 left-5 right-5 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <p className="text-sm font-black text-white truncate drop-shadow-lg">{item.result.locationName}</p>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
              {new Date(item.timestamp).toLocaleDateString()} • {item.result.region}
            </p>
            {item.result.detailedContext && (
              <span className="bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ring-2 ring-white/20">Deep</span>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={(e) => onDelete(e, item.id)} 
        className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-xl border border-white/20 rounded-full text-white/80 hover:text-white hover:bg-red-500 transition-all flex items-center justify-center z-20 shadow-xl opacity-0 group-hover:opacity-100"
      >
        <i className="fas fa-trash-alt text-xs"></i>
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    image: null,
    isAnalyzing: false,
    isDetailedAnalyzing: false,
    result: null,
    searchSources: [],
    error: null,
    history: [],
  });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<'main' | 'history'>('main');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('geoid_history_v2');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setState(prev => ({ ...prev, history: parsed }));
        }
      } catch (e) {
        console.error("履歴の読み込みに失敗しました", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('geoid_history_v2', JSON.stringify(state.history.slice(0, 30)));
  }, [state.history]);

  useEffect(() => {
    let interval: number;
    if (state.isAnalyzing || state.isDetailedAnalyzing) {
      const messages = state.isDetailedAnalyzing 
        ? ["高度鑑定エンジン 起動...", "建築構造の検証中...", "植生分布のクロスリファレンス...", "インフラ詳細のディープスキャン...", "最終座標を確定中..."]
        : ["インテリジェンス・コア 起動...", "視覚的特徴の抽出中...", "国内インフラDB 照合中...", "OSINT解析を実行中...", "推定地点を計算中..."];
      
      let currentMsgIndex = 0;
      setStatusMessage(messages[0]);
      
      interval = window.setInterval(() => {
        currentMsgIndex = (currentMsgIndex + 1) % messages.length;
        setStatusMessage(messages[currentMsgIndex]);
        setProgress(prev => Math.min(prev + 4, 98));
      }, 900);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [state.isAnalyzing, state.isDetailedAnalyzing]);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setState(prev => ({ 
          ...prev, 
          image: e.target?.result as string, 
          result: null, 
          error: null,
          searchSources: [] 
        }));
        setSearchText("");
        setViewMode('main');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const runAnalysis = async () => {
    if (!state.image) return;
    setState(prev => ({ ...prev, isAnalyzing: true, error: null, result: null }));
    setProgress(5);

    try {
      const analysisResult = await analyzeLocationImage(state.image);
      
      setState(prev => ({ 
        ...prev, 
        result: analysisResult,
        isAnalyzing: false 
      }));
      setProgress(100);

      const detailData = await fetchLocationDetails(analysisResult);
      setSearchText(detailData.text);
      
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        image: state.image!,
        result: analysisResult,
        searchSources: detailData.sources,
        searchText: detailData.text
      };

      setState(prev => ({ 
        ...prev, 
        searchSources: detailData.sources,
        history: [historyItem, ...prev.history].slice(0, 30)
      }));

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        error: "解析エンジンとの通信に失敗しました。画像サイズを縮小して再試行してください。" 
      }));
    }
  };

  const runDetailedAnalysis = async () => {
    if (!state.image || !state.result) return;
    setState(prev => ({ ...prev, isDetailedAnalyzing: true, error: null }));
    setProgress(5);

    try {
      const detailedContext = await analyzeDetailedContext(state.image, state.result);
      const updatedResult: AnalysisResult = {
        ...state.result,
        detailedContext
      };

      setState(prev => ({
        ...prev,
        result: updatedResult,
        isDetailedAnalyzing: false,
        history: prev.history.map(h => 
          h.image === state.image ? { ...h, result: updatedResult } : h
        )
      }));
      setProgress(100);
    } catch (err: any) {
      console.error("Detailed Analysis Error:", err);
      setState(prev => ({ 
        ...prev, 
        isDetailedAnalyzing: false, 
        error: "詳細鑑定に失敗しました。リソース制限の可能性があります。" 
      }));
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setState(prev => ({
      ...prev,
      image: item.image,
      result: item.result,
      searchSources: item.searchSources,
      error: null,
      isAnalyzing: false,
      isDetailedAnalyzing: false
    }));
    setSearchText(item.searchText);
    setViewMode('main');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      image: null,
      isAnalyzing: false,
      isDetailedAnalyzing: false,
      result: null,
      searchSources: [],
      error: null,
    }));
    setSearchText("");
    setProgress(0);
    setViewMode('main');
  };

  const isResultView = state.result && !state.isDetailedAnalyzing;

  return (
    <div 
      className={`min-h-screen ${isResultView ? '' : 'pb-40'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Header />

      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-blue-600/20 backdrop-blur-md flex items-center justify-center border-[12px] border-dashed border-blue-500/50 pointer-events-none animate-in fade-in duration-300">
           <div className="bg-white px-12 py-8 rounded-[40px] shadow-2xl flex flex-col items-center space-y-4">
              <i className="fas fa-cloud-arrow-up text-5xl text-blue-600 animate-bounce"></i>
              <p className="text-xl font-black text-slate-900">画像をここにドロップ</p>
           </div>
        </div>
      )}

      <main className={`max-w-5xl mx-auto ${isResultView ? 'px-0 sm:px-8 sm:pt-16' : 'px-6 pt-12'}`}>
        {viewMode === 'history' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-black/5 pb-8 gap-4">
              <div>
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">鑑定アーカイブ</h2>
                <p className="text-slate-400 font-bold text-sm tracking-tight">過去に特定された地点の履歴</p>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => { if(window.confirm("全ての履歴を消去しますか？")) setState(p => ({...p, history: []})) }} className="px-5 py-2.5 text-red-500 font-black text-xs hover:bg-red-50 rounded-2xl transition-all">履歴を消去</button>
                <button onClick={() => setViewMode('main')} className="px-6 py-2.5 bg-slate-900 text-white font-black text-sm rounded-2xl hover:bg-black transition-all">戻る</button>
              </div>
            </div>
            
            {state.history.length === 0 ? (
              <div className="py-32 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center mx-auto mb-8 text-slate-300">
                  <i className="fas fa-folder-open text-4xl"></i>
                </div>
                <p className="text-slate-400 font-black text-lg">解析履歴はまだありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {state.history.map(item => (
                  <HistoryItemCard 
                    key={item.id} 
                    item={item} 
                    onLoad={loadFromHistory} 
                    onDelete={(e, id) => setState(p => ({...p, history: p.history.filter(h => h.id !== id)}))} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {!state.image ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-16 animate-in fade-in zoom-in-95 duration-1000">
                 <div className="relative">
                    <div className="absolute -inset-16 bg-blue-500 rounded-full blur-[160px] opacity-10 animate-pulse"></div>
                    <div onClick={() => fileInputRef.current?.click()} className="relative w-56 h-56 bg-white/80 backdrop-blur-3xl rounded-[64px] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl border border-white group">
                      <i className="fas fa-plus text-blue-600 text-6xl group-hover:rotate-90 transition-transform duration-500"></i>
                      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept="image/*" className="hidden" />
                      <div className="absolute -bottom-4 bg-slate-900 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-xl">Upload Image</div>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-blue-600/5 border border-blue-600/10 rounded-full mb-4">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Powered by Gemini 3 Intelligence</span>
                    </div>
                    <h2 className="text-6xl sm:text-7xl font-black tracking-tighter text-slate-900 leading-none">
                      場所、特定。
                    </h2>
                    <p className="text-slate-400 font-bold max-w-lg mx-auto leading-relaxed text-lg sm:text-xl px-4">
                       電柱、標識、マンホール、植生から、<br />
                       日本中のあらゆる地点をAIが超精密に特定。
                    </p>
                 </div>
                 
                 <div className="flex flex-wrap justify-center gap-6 opacity-40">
                    <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                      <i className="fas fa-shield-halved"></i> <span>OSINT Forensic</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                      <i className="fas fa-map-pin"></i> <span>Pinpoint Accuracy</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                      <i className="fas fa-server"></i> <span>Infra Analytics</span>
                    </div>
                 </div>
              </div>
            ) : (
              <div className={`space-y-0 sm:space-y-12 ${isResultView ? '' : 'animate-in fade-in slide-in-from-bottom-12 duration-1000'}`}>
                {(!state.result || state.isDetailedAnalyzing) && (
                  <div className={`relative bg-black sm:rounded-[48px] overflow-hidden aspect-video w-full shadow-2xl flex items-center justify-center border-b-8 sm:border-8 transition-all duration-700 ${state.isAnalyzing || state.isDetailedAnalyzing ? 'border-blue-500/50' : 'border-white'}`}>
                    <img src={state.image} alt="解析対象" className={`h-full w-full object-contain transition-all duration-1000 ${state.isAnalyzing || state.isDetailedAnalyzing ? 'brightness-[0.3] blur-[3px] scale-110' : ''}`} />
                    
                    {(state.isAnalyzing || state.isDetailedAnalyzing) && (
                      <>
                        <div className="scan-line"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-blue-600/5 backdrop-blur-[1px]">
                          <div className="w-full max-w-lg space-y-12 text-center">
                            <div className="space-y-4">
                              <p className="text-xs font-black text-blue-400 uppercase tracking-[0.5em] drop-shadow-xl">
                                {state.isDetailedAnalyzing ? "Executing Forensic Reconstruction" : "Intelligence Core Synchronizing"}
                              </p>
                              <p className="text-3xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-2xl animate-pulse">{statusMessage}</p>
                            </div>
                            <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                              <div className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-white/30 text-[9px] font-black tracking-widest uppercase">
                              <span>Buffer: 1024GB/s</span>
                              <span>Precision Mode: Active</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {!state.isAnalyzing && !state.isDetailedAnalyzing && (
                       <button onClick={reset} className="absolute top-6 right-6 sm:top-10 sm:right-10 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all shadow-2xl active:scale-90">
                         <i className="fas fa-times text-xl"></i>
                       </button>
                    )}
                  </div>
                )}

                {!state.result && !state.isAnalyzing && !state.isDetailedAnalyzing && (
                  <div className="flex justify-center pt-16">
                    <button onClick={runAnalysis} className="ios-btn-primary px-16 sm:px-24 py-6 sm:py-8 shadow-2xl flex items-center space-x-6 text-2xl sm:text-3xl">
                      <i className="fas fa-radar animate-spin-slow"></i>
                      <span>場所を特定する</span>
                    </button>
                  </div>
                )}

                {state.result && !state.isDetailedAnalyzing && (
                  <ResultCard 
                    result={state.result} 
                    searchSources={state.searchSources} 
                    searchText={searchText}
                    imageUrl={state.image || undefined}
                    onDetailedAnalysis={runDetailedAnalysis}
                    onReset={reset}
                  />
                )}

                {state.error && (
                  <div className="mx-6 mt-12 p-12 bg-white border border-red-100 rounded-[48px] text-center shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-triangle-exclamation text-3xl"></i>
                    </div>
                    <p className="text-slate-900 font-black text-2xl mb-3">システム・エラー</p>
                    <p className="text-slate-500 font-bold mb-10 max-w-md mx-auto">{state.error}</p>
                    <button onClick={reset} className="px-12 py-4 bg-slate-900 text-white rounded-3xl font-black hover:bg-black transition-all shadow-xl active:scale-95">再起動</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {(!isResultView || viewMode === 'history') && (
        <nav className="fixed bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 w-[92%] max-w-sm h-18 sm:h-22 bg-white/70 backdrop-blur-3xl border border-white/80 rounded-[36px] sm:rounded-[48px] shadow-2xl flex items-center justify-around px-8 sm:px-12 z-50 animate-in slide-in-from-bottom-12 duration-1000">
            <button onClick={() => { setViewMode('main'); if (state.result) reset(); }} className={`flex flex-col items-center transition-all ${viewMode === 'main' && !state.result ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-blue-400'}`}>
               <i className="fas fa-house-chimney text-2xl"></i>
               <span className="text-[9px] font-black mt-2 tracking-widest uppercase">Home</span>
            </button>
            
            <div className="relative -top-3">
              <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 sm:w-20 h-20 bg-blue-600 text-white rounded-[24px] sm:rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-110 hover:-rotate-6 active:scale-90 transition-all border-4 border-white">
                <i className="fas fa-camera-retro text-2xl sm:text-3xl"></i>
              </button>
            </div>

            <button onClick={() => setViewMode('history')} className={`flex flex-col items-center transition-all ${viewMode === 'history' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-blue-400'}`}>
               <i className="fas fa-box-archive text-2xl"></i>
               <span className="text-[9px] font-black mt-2 tracking-widest uppercase">Logs</span>
            </button>
        </nav>
      )}
    </div>
  );
};

export default App;
