
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-[60] w-full bg-white/60 backdrop-blur-3xl border-b border-black/5">
      <div className="max-w-5xl mx-auto px-6 h-18 flex items-center justify-between">
        <div className="flex items-center space-x-4 group cursor-pointer">
          <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/10 group-hover:bg-blue-600 transition-all duration-500">
             <i className="fas fa-radar text-lg"></i>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">ここどこAI</h1>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Japan Geo Intelligence</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">System Online</span>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
            <i className="fas fa-cog text-slate-400"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
