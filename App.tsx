import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ALGO_TOPICS, Message, Role, Topic } from './types';

// --- Markdown/Code Renderer Component ---
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => (
  <div className="my-4 rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e1e]">
    <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
      <span className="text-xs font-mono text-gray-300 lowercase">{language || 'code'}</span>
      <div className="flex space-x-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
      </div>
    </div>
    <div className="p-4 overflow-x-auto">
      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  </div>
);

const MessageContent = ({ text }: { text: string }) => {
  // Simple regex to split text by code blocks ```lang ... ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3);
          const firstNewLine = content.indexOf('\n');
          const language = content.slice(0, firstNewLine).trim();
          const code = content.slice(firstNewLine + 1);
          return <CodeBlock key={index} language={language} code={code} />;
        }
        // Basic formatting for inline code `...` and bold **...**
        return (
          <p key={index} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`)/g).map((subPart, i) => {
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return <code key={i} className="bg-gray-800 text-green-400 px-1.5 py-0.5 rounded font-mono text-sm">{subPart.slice(1, -1)}</code>;
              }
              return subPart;
            })}
          </p>
        );
      })}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  const initChat = async (topic?: Topic) => {
    try {
      if (!process.env.API_KEY) {
        setIsApiKeyMissing(true);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        당신은 '알고선생(AlgoSensei)'이라는 이름의 친절하고 유능한 알고리즘 튜터입니다.
        사용자가 알고리즘 및 자료구조를 쉽게 이해할 수 있도록 도와주세요.
        
        [규칙]
        1. **모든 코드 예제는 반드시 Python으로 제공하세요.**
        2. 설명은 한국어로 명확하고 이해하기 쉽게 작성하세요.
        3. 코드를 제공할 때는 항상 **시간 복잡도(Time Complexity)**와 **공간 복잡도(Space Complexity)** 분석을 포함하세요.
        4. 처음에는 개념을 설명하고, 사용자가 이해했는지 확인한 후 예제 코드를 보여주는 방식(소크라테스식 문답법)을 선호하세요.
        5. 사용자가 틀린 답을 말하면 부드럽게 교정해주고, 올바른 방향으로 유도하세요.
        
        ${topic ? `현재 학습 주제는 '${topic.title}'입니다. 이 주제에 집중해서 설명해 주세요.` : ''}
      `;

      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      setChatSession(newChat);
      setMessages([]); // Clear history on new topic

      // Initial greeting based on topic
      if (topic) {
        setIsLoading(true);
        const prompt = `안녕하세요! 저는 오늘 '${topic.title}'에 대해 배우고 싶습니다. ${topic.prompt}`;
        
        try {
          const responseStream = await newChat.sendMessageStream({ message: prompt });
          
          let fullText = "";
          const msgId = Date.now().toString();
          
          setMessages([{ id: msgId, role: Role.MODEL, text: "", isStreaming: true }]);

          for await (const chunk of responseStream) {
            const chunkText = (chunk as GenerateContentResponse).text;
            if (chunkText) {
              fullText += chunkText;
              setMessages(prev => {
                const newArr = [...prev];
                const lastMsg = newArr[newArr.length - 1];
                if (lastMsg.id === msgId) {
                  lastMsg.text = fullText;
                }
                return newArr;
              });
            }
          }
          
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m));

        } catch (e) {
          console.error(e);
          setMessages([{ id: 'err', role: Role.MODEL, text: "오류가 발생했습니다. 다시 시도해주세요." }]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Generic welcome
        setMessages([{
          id: 'welcome',
          role: Role.MODEL,
          text: "안녕하세요! 알고선생입니다. 왼쪽 메뉴에서 배우고 싶은 알고리즘 주제를 선택하거나, 궁금한 점을 바로 질문해주세요. 모든 코드는 Python으로 알려드립니다! 🐍"
        }]);
      }

    } catch (error) {
      console.error("Failed to init chat", error);
    }
  };

  useEffect(() => {
    // Check API Key immediately
    if (!process.env.API_KEY) {
      setIsApiKeyMissing(true);
    } else {
      initChat();
    }
  }, []); // Run once on mount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTopicSelect = (topic: Topic) => {
    setActiveTopic(topic);
    initChat(topic);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !chatSession || isLoading) return;

    const userMsgText = inputValue;
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: Role.USER, text: userMsgText }]);

    try {
      const responseStream = await chatSession.sendMessageStream({ message: userMsgText });
      
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, role: Role.MODEL, text: "", isStreaming: true }]);
      
      let fullText = "";

      for await (const chunk of responseStream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
          fullText += chunkText;
          setMessages(prev => {
            const newArr = [...prev];
            const targetIndex = newArr.findIndex(m => m.id === aiMsgId);
            if (targetIndex !== -1) {
              newArr[targetIndex] = { ...newArr[targetIndex], text: fullText };
            }
            return newArr;
          });
        }
      }

      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));

    } catch (error) {
      console.error("Error sending message", error);
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: Role.MODEL, text: "죄송합니다. 오류가 발생했습니다." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isApiKeyMissing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">API 설정이 필요합니다</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Google Gemini API 키가 감지되지 않았습니다.<br/>
              앱을 실행하려면 <b>.env</b> 파일을 생성하거나<br/>
              배포 환경 변수에 <b>API_KEY</b>를 추가해주세요.
            </p>
          </div>
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Google AI Studio에서 키 발급받기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans selection:bg-green-500/30">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            AlgoSensei
          </h1>
          <p className="text-xs text-gray-500 mt-1">Python Algorithm Tutor</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
            Curriculum
          </div>
          {ALGO_TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all duration-200 group ${
                activeTopic?.id === topic.id 
                  ? 'bg-green-600/10 text-green-400 border border-green-600/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <div className="font-medium">{topic.title}</div>
              <div className="text-xs text-gray-600 mt-0.5 group-hover:text-gray-500 truncate">
                {topic.description}
              </div>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600 text-center">
          Powered by Gemini 2.5 Flash
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header (Mobile only) */}
        <header className="md:hidden p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
          <span className="font-bold text-green-400">AlgoSensei</span>
          <span className="text-xs text-gray-500">Python Edition</span>
        </header>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
        >
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
                <span className="text-3xl">🐍</span>
              </div>
              <p>주제를 선택하거나 질문을 시작하세요</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 shadow-sm ${
                  msg.role === Role.USER
                    ? 'bg-green-600 text-white rounded-br-none'
                    : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
                }`}
              >
                {msg.role === Role.MODEL && (
                  <div className="flex items-center gap-2 mb-3 border-b border-gray-700/50 pb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-black">
                      AI
                    </div>
                    <span className="text-xs font-bold text-gray-400">AlgoSensei</span>
                  </div>
                )}
                <div className="text-sm md:text-base">
                  <MessageContent text={msg.text} />
                </div>
                {msg.isStreaming && (
                  <div className="mt-2 flex space-x-1 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animation-delay-200"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animation-delay-400"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-950/80 backdrop-blur-sm border-t border-gray-800">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isLoading ? "답변을 생성 중입니다..." : "Python 알고리즘에 대해 무엇이든 물어보세요..."}
                disabled={isLoading}
                className="w-full bg-gray-900 text-gray-100 rounded-xl pl-5 pr-12 py-4 border border-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:bg-gray-700 disabled:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-600">
                AI can make mistakes. Check important info.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}