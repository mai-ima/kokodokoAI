
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, GroundingSource } from '../types';

interface ResultCardProps {
  result: AnalysisResult;
  searchSources: GroundingSource[];
  searchText: string;
  imageUrl?: string;
  onDetailedAnalysis: () => void;
  onReset: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, searchSources, searchText, imageUrl, onDetailedAnalysis, onReset }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const visualEvidence = result?.visualEvidence || [];
  const safeSearchSources = searchSources || [];

  useEffect(() => {
    if (visualEvidence.length > 0) {
      const timer = setTimeout(() => setSelectedIndex(0), 800);
      return () => clearTimeout(timer);
    }
  }, [result]);

  useEffect(() => {
    if (mapContainerRef.current && result?.latitude && result?.longitude && !mapInstanceRef.current) {
      const L = (window as any).L;
      if (L) {
        const coords = [result.latitude, result.longitude];
        const map = L.map(mapContainerRef.current, {
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: false,
          zoomControl: false // Custom controls used instead
        }).setView(coords, 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        L.marker(coords).addTo(map)
          .bindPopup(`<div class="font-bold">${result.locationName}</div><div class="text-[10px]">${result.addressGuess}</div>`)
          .openPopup();

        mapInstanceRef.current = map;
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [result?.latitude, result?.longitude, result?.locationName, result?.addressGuess]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(result?.addressGuess || "");
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error('Failed to copy address', err);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && result?.latitude && result?.longitude) {
      mapInstanceRef.current.flyTo([result.latitude, result.longitude], 16, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const activeClue = selectedIndex !== null ? visualEvidence[selectedIndex] : (activeIndex !== null ? visualEvidence[activeIndex] : null);

  return (
    <div className="flex flex-col sm:space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      
      {/* Visual Analysis Layer */}
      <div className="relative bg-slate-900 sm:liquid-glass sm:ios-card sm:overflow-hidden aspect-[4/3] sm:aspect-video w-full sm:shadow-2xl sm:border-4 border-white group z-10">
        <img 
          src={imageUrl} 
          alt="分析ソース" 
          className={`h-full w-full object-contain transition-all duration-700 ${activeClue ? 'brightness-[0.7] scale-[1.01]' : 'brightness-100'}`} 
        />
        
        {/* Intelligence Overlay - 改良版スポットライト */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${activeClue ? 'opacity-100' : 'opacity-0'}`}
             style={{
               background: activeClue && activeClue.x !== undefined && activeClue.y !== undefined 
                 ? `radial-gradient(circle at ${activeClue.x}% ${activeClue.y}%, transparent 80px, rgba(15, 23, 42, 0.4) 180px)` 
                 : 'transparent'
             }}>
        </div>

        {/* Evidence Markers */}
        {visualEvidence.map((clue, idx) => (
          clue.x !== undefined && clue.y !== undefined && (
            <div 
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 cursor-pointer pointer-events-auto"
              style={{ left: `${clue.x}%`, top: `${clue.y}%` }}
              onClick={() => setSelectedIndex(idx)}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className={`relative flex items-center justify-center transition-transform duration-500 ${selectedIndex === idx || activeIndex === idx ? 'scale-150' : 'scale-90 opacity-60 hover:opacity-100'}`}>
                 <div className="absolute inset-0 bg-blue-500/50 rounded-full animate-ping"></div>
                 <div className="w-7 h-7 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-blue-600 ring-4 ring-white/20">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                 </div>
                 
                 {(selectedIndex === idx || activeIndex === idx) && (
                   <div className="absolute bottom-full mb-4 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/20 whitespace-nowrap animate-in slide-in-from-bottom-2 fade-in duration-300 z-50">
                      <div className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Detected Element</div>
                      <span className="text-xs font-black">{clue.element}</span>
                   </div>
                 )}
              </div>
            </div>
          )
        ))}
        
        {/* Actions & Info Bar */}
        <div className="absolute top-4 left-4 sm:hidden z-30">
            <button onClick={onReset} className="w-12 h-12 bg-black/40 backdrop-blur-3xl border border-white/20 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all">
                <i className="fas fa-arrow-left text-sm"></i>
            </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none z-30">
           <div className="bg-slate-900/40 backdrop-blur-3xl px-5 py-3 rounded-3xl border border-white/20 shadow-2xl max-w-[70%]">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">Investigation Site</p>
              <p className="text-sm font-black text-white truncate drop-shadow-lg">{result?.locationName}</p>
           </div>
           
           {!result?.detailedContext && (
             <button 
              onClick={onDetailedAnalysis}
              className="pointer-events-auto px-6 py-3.5 bg-blue-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center ring-4 ring-blue-500/20"
             >
               <i className="fas fa-dna mr-2 text-xs"></i>
               <span className="hidden sm:inline">フォレンジック解析 (鑑定)</span>
               <span className="sm:hidden">高度鑑定</span>
             </button>
           )}
        </div>
      </div>

      {/* Intelligence Content Sheet */}
      <div className="flex-1 bg-white sm:bg-transparent -mt-10 sm:mt-0 rounded-t-[48px] sm:rounded-none px-6 pt-2 pb-40 sm:px-0 sm:pt-0 sm:pb-32 relative z-20 shadow-[0_-30px_60px_rgba(0,0,0,0.08)] sm:shadow-none space-y-8">
        
        <div className="sm:hidden sheet-handle"></div>

        {/* Detailed Forensic Report Section */}
        {result?.detailedContext && (
          <div className="bg-slate-900 rounded-[40px] sm:ios-card p-8 sm:p-12 text-white overflow-hidden relative border-t-8 border-blue-600 animate-in slide-in-from-bottom-12 duration-1000 shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden lg:block">
              <i className="fas fa-fingerprint text-[300px]"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 border-b border-white/10 pb-8 gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-blue-600/40 rotate-3">
                    <i className="fas fa-file-shield text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 mb-1">Advanced Geolocation Unit</h3>
                    <p className="text-2xl font-black tracking-tighter">視覚証拠高度鑑定書</p>
                  </div>
                </div>
                <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  Case ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 mb-10">
                {[
                  { icon: 'monument', label: '建築様式・年代', value: result.detailedContext.architecture, color: 'text-amber-400' },
                  { icon: 'tower-cell', label: 'インフラ解析', value: result.detailedContext.infrastructure, color: 'text-blue-400' },
                  { icon: 'tree', label: '植生・生態分布', value: result.detailedContext.vegetation, color: 'text-emerald-400' },
                  { icon: 'map-location-dot', label: '標識・文字情報', value: result.detailedContext.signage, color: 'text-rose-400' }
                ].map((item, i) => (
                  <div key={i} className="group p-7 bg-white/5 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all duration-500">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                        <i className={`fas fa-${item.icon} text-sm`}></i>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{item.label}</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed text-slate-200">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-blue-600/30 to-indigo-600/30 p-8 sm:p-10 rounded-[40px] border border-blue-500/40 backdrop-blur-md">
                <div className="flex items-center space-x-3 mb-6">
                   <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                   <h4 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400">鑑定結論 / Final Determination</h4>
                </div>
                <p className="text-xl sm:text-2xl font-black leading-tight italic tracking-tight text-white drop-shadow-md">
                  「{result.detailedContext.forensicConclusion}」
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Core Analysis Section */}
        <div className="liquid-glass rounded-[40px] sm:ios-card p-8 sm:p-12 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-8">
              <div className="flex flex-col space-y-4 w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-lg shadow-blue-500"></div>
                  <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em]">特定完了</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-none">
                  {result?.locationName}
                </h2>
                <div className="flex flex-wrap items-center group cursor-default gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <i className="fas fa-location-dot text-blue-600"></i>
                  </div>
                  <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl">
                    <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-600 truncate max-w-[200px] sm:max-w-md">{result?.addressGuess}</p>
                    <button 
                      onClick={copyAddress}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${copying ? 'bg-green-500 text-white scale-110' : 'bg-white text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                      title="住所をコピー"
                    >
                      <i className={`fas ${copying ? 'fa-check' : 'fa-copy'} text-xs`}></i>
                    </button>
                  </div>
                  {copying && <span className="text-[10px] font-black text-green-600 uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300">Copied to clipboard</span>}
                </div>
              </div>
              
              <div className="flex flex-col items-center sm:items-end p-6 bg-slate-900/5 rounded-[32px] w-full sm:w-auto min-w-[180px]">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">確信度スコア</div>
                <div className="text-5xl font-black text-blue-600 tabular-nums">
                  {result?.confidenceScore}<span className="text-2xl ml-1">%</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">証拠インデックス</h3>
                <div className="text-[10px] font-black text-blue-500 flex items-center">
                  <i className="fas fa-hand-pointer mr-2 animate-bounce"></i>
                  要素を選択して詳細を確認
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visualEvidence.map((clue, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedIndex(idx === selectedIndex ? null : idx)}
                    className={`relative p-7 rounded-[32px] border-2 transition-all duration-500 text-left group overflow-hidden ${
                      selectedIndex === idx 
                        ? 'bg-blue-600 text-white shadow-2xl border-transparent translate-y-[-4px]' 
                        : 'bg-white/40 border-white/60 hover:bg-white hover:border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${
                        selectedIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-900/5 text-slate-500'
                      }`}>
                        {clue.area}
                      </span>
                      {selectedIndex === idx && <i className="fas fa-check-circle text-xs"></i>}
                    </div>
                    <h4 className={`text-lg font-black mb-2 tracking-tight ${selectedIndex === idx ? 'text-white' : 'text-slate-900'}`}>
                      {clue.element}
                    </h4>
                    <p className={`text-xs leading-relaxed font-bold ${selectedIndex === idx ? 'text-white/90' : 'text-slate-600'}`}>
                      {clue.observation}
                    </p>
                    <div className={`mt-4 pt-4 border-t transition-all ${selectedIndex === idx ? 'border-white/20 opacity-100' : 'border-black/5 opacity-40'}`}>
                      <p className="text-[10px] font-black leading-snug">
                        {clue.significance}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Global Mapping Context */}
        {result?.latitude && result?.longitude && (
          <div className="liquid-glass rounded-[40px] sm:ios-card p-4 h-[450px] shadow-2xl relative z-0">
            <div className="absolute top-8 left-8 z-10 px-5 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl border border-white shadow-xl pointer-events-none">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center">
                <i className="fas fa-globe-asia mr-2 text-blue-600"></i>
                空間座標プレビュー
              </span>
            </div>
            
            {/* Custom Map Controls */}
            <div className="absolute top-8 right-8 z-10 flex flex-col space-y-2">
              <div className="flex flex-col bg-white/90 backdrop-blur-xl rounded-2xl border border-white shadow-xl overflow-hidden">
                <button 
                  onClick={handleZoomIn}
                  className="w-11 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors border-b border-slate-100"
                  title="ズームイン"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button 
                  onClick={handleZoomOut}
                  className="w-11 h-11 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  title="ズームアウト"
                >
                  <i className="fas fa-minus"></i>
                </button>
              </div>
              <button 
                onClick={handleRecenter}
                className="w-11 h-11 bg-white/90 backdrop-blur-xl rounded-2xl border border-white shadow-xl flex items-center justify-center text-blue-600 hover:bg-slate-100 active:scale-95 transition-all"
                title="特定地点を表示"
              >
                <i className="fas fa-crosshairs"></i>
              </button>
            </div>

            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        )}

        {/* Deductive Summary Card */}
        <div className="liquid-glass rounded-[40px] sm:ios-card p-10 sm:p-14">
          <div className="flex items-center space-x-5 mb-10">
             <div className="w-14 h-14 bg-slate-900 rounded-[22px] flex items-center justify-center text-white shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                <i className="fas fa-brain-circuit text-xl"></i>
             </div>
             <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">推論ロジック</h3>
                <p className="text-[10px] font-black text-slate-400 tracking-wider">AIによる地点特定の論理的背景</p>
             </div>
          </div>
          
          <div className="space-y-10">
            <p className="text-2xl sm:text-3xl text-slate-800 leading-tight font-black tracking-tighter">
              {result?.description}
            </p>
            
            <div className="mt-8 p-8 sm:p-10 bg-slate-900 text-white rounded-[40px] relative shadow-2xl overflow-visible group">
              <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-700 rounded-[40px]"></div>
              <div className="absolute -top-3 left-10 px-5 py-2 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg z-10">環境コンテキスト</div>
              <p className="text-lg sm:text-xl text-white/90 leading-relaxed font-bold italic tracking-tight relative z-0">
                「{result?.environmentContext}」
              </p>
            </div>
          </div>

          {searchText && (
            <div className="mt-14 pt-14 border-t border-black/5">
              <div className="flex items-center space-x-3 mb-8">
                 <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-[10px] shadow-lg shadow-blue-500/20">
                   <i className="fas fa-magnifying-glass-location"></i>
                 </div>
                 <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">オープンデータ照合</span>
              </div>
              
              <div className="bg-white/50 p-8 rounded-[32px] border border-white shadow-sm mb-10">
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-bold whitespace-pre-wrap">
                  {searchText}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {safeSearchSources.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="group px-6 py-3.5 bg-white border border-slate-100 hover:border-blue-300 hover:shadow-xl rounded-full text-[11px] font-black text-slate-700 transition-all flex items-center">
                    <i className="fas fa-arrow-up-right-from-square mr-3 text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity"></i>
                    <span className="max-w-[200px] truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Action Footer */}
        <div className="flex flex-col space-y-4 pt-8 pb-4 px-2">
            <button 
              onClick={onReset} 
              className="w-full py-5 bg-slate-900 text-white font-black rounded-[28px] shadow-2xl hover:bg-black hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center space-x-3 group"
            >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                   <i className="fas fa-arrow-rotate-left text-sm"></i>
                </div>
                <span>ホーム画面に戻る</span>
            </button>
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] opacity-60">
              KOKODOKO AI Intelligence Terminal v3.0
            </p>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
