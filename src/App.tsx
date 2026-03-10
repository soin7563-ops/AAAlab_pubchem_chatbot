import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, FlaskConical, Info, Beaker, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ChemicalInfo, Message } from './types';
import { fetchChemicalBySearch, getChemicalImageUrl } from './services/pubchem';
import { getGeminiResponse, translateToEnglishName } from './services/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! ChemInsight Bot입니다. 화학물질 이름(한글/영어)이나 CID를 입력하여 검색을 시작하세요.',
      timestamp: Date.now(),
    },
  ]);
  const [currentChemical, setCurrentChemical] = useState<ChemicalInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;

    // Try to extract chemical name if it looks like a search or a "what is X" question
    const isPotentialSearch = text.split(/\s+/).length <= 5; // Allow slightly longer sentences for extraction

    if (isPotentialSearch) {
      setIsSearching(true);
      const { englishName, originalName } = await translateToEnglishName(text);
      
      if (englishName !== "NONE") {
        const result = await fetchChemicalBySearch(englishName);
        setIsSearching(false);

        if (result) {
          setCurrentChemical(result);
          const newMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `**${originalName}** (${result.name}, CID: ${result.cid})에 대한 정보를 찾았습니다. 이 화합물에 대해 무엇을 도와드릴까요?`,
            timestamp: Date.now(),
            chemicalData: result,
          };
          setMessages(prev => [...prev, newMessage]);
          setQuery('');
          return;
        }
      }
      setIsSearching(false);
    }

    // If not a search or search failed, and we have a current chemical, send as message
    if (currentChemical) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMsg]);
      setQuery('');
      setIsLoading(true);

      const responseText = await getGeminiResponse(text, messages, currentChemical);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
    } else {
      // No chemical selected and search failed
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `죄송합니다. "${text}"에 해당하는 화학 화합물을 찾을 수 없습니다. 다른 이름이나 CID를 시도해 보세요.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
      setQuery('');
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '대화 내용이 삭제되었습니다. 새로운 화학물질을 검색해 보세요.',
        timestamp: Date.now(),
      },
    ]);
    setCurrentChemical(null);
  };

  return (
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Sidebar - Chemical Info */}
      <aside className="hidden lg:flex flex-col w-96 border-r border-[#141414] bg-[#E4E3E0] overflow-hidden">
        <div className="p-6 border-bottom border-[#141414]">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight uppercase">ChemInsight</h1>
          </div>
          <p className="text-xs opacity-60 font-mono uppercase tracking-widest">Molecular Database Explorer</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {currentChemical ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="aspect-square bg-white border border-[#141414] flex items-center justify-center p-4 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <img
                  src={getChemicalImageUrl(currentChemical.cid)}
                  alt={currentChemical.name}
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">Compound Name</label>
                  <h2 className="text-2xl font-serif italic leading-tight">{currentChemical.name}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">Formula</label>
                    <p className="font-mono text-sm">{currentChemical.formula}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">Mol. Weight</label>
                    <p className="font-mono text-sm">{currentChemical.molecularWeight} g/mol</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">IUPAC Name</label>
                  <p className="text-sm leading-relaxed">{currentChemical.iupacName}</p>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">SMILES</label>
                  <p className="text-[10px] font-mono break-all opacity-80">{currentChemical.smiles}</p>
                </div>

                {currentChemical.description && (
                  <div>
                    <label className="text-[10px] font-mono uppercase opacity-50 block mb-1">Description</label>
                    <p className="text-xs leading-relaxed opacity-80 line-clamp-6">{currentChemical.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <Beaker className="w-12 h-12" />
              <p className="text-sm font-mono uppercase">선택된 화합물 없음</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#141414] bg-[#141414] text-[#E4E3E0]">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
            <span>PubChem PUG REST</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 border-b border-[#141414] flex items-center justify-between bg-[#E4E3E0] z-10">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            <span className="font-bold uppercase text-sm tracking-tight">ChemInsight</span>
          </div>
          {currentChemical && (
            <div className="text-xs font-mono italic">
              {currentChemical.name}
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[70%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "p-4 rounded-sm border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]",
                  msg.role === 'user' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white text-[#141414]"
                )}
                >
                  <div className="prose prose-sm max-w-none prose-invert:text-[#E4E3E0]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase opacity-40 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[#141414] opacity-50"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-mono uppercase">분석 중...</span>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 border-t border-[#141414] bg-[#E4E3E0]">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex gap-2">
              <form 
                onSubmit={handleSubmit}
                className="flex-1 relative group"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={currentChemical ? "이 화합물에 대해 물어보세요 (또는 새 물질 검색)..." : "화합물 검색 (예: 아스피린, 카페인, 2244)..."}
                  className="w-full bg-white border border-[#141414] p-4 pr-12 text-sm focus:outline-none shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]"
                />
                <button
                  type="submit"
                  disabled={isSearching || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors rounded-sm"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
              <button
                onClick={clearChat}
                title="대화 삭제"
                className="p-4 border border-[#141414] bg-white hover:bg-red-50 transition-colors shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <button 
                  onClick={() => { setQuery('카페인'); setTimeout(() => { const event = new Event('submit', { cancelable: true, bubbles: true }); document.querySelector('form')?.dispatchEvent(event); }, 0); }}
                  className="text-[10px] font-mono uppercase opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" /> 카페인
                </button>
                <button 
                  onClick={() => { setQuery('아스피린'); setTimeout(() => { const event = new Event('submit', { cancelable: true, bubbles: true }); document.querySelector('form')?.dispatchEvent(event); }, 0); }}
                  className="text-[10px] font-mono uppercase opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" /> 아스피린
                </button>
                <button 
                  onClick={() => { setQuery('에탄올'); setTimeout(() => { const event = new Event('submit', { cancelable: true, bubbles: true }); document.querySelector('form')?.dispatchEvent(event); }, 0); }}
                  className="text-[10px] font-mono uppercase opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" /> 에탄올
                </button>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase opacity-30">
                <Info className="w-3 h-3" />
                <span>Powered by PubChem & Gemini</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
