import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { chatService } from '../../lib/ChatServices';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (userMessage) => {
    if (!userMessage.trim()) return;

    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Add placeholder for AI response with typing effect
    setMessages(prev => [...prev, { role: 'assistant', content: '', isTyping: true }]);

    try {
      // Simulated typing effect - replace with your actual API call
      const response = await chatService.sendMessage(userMessage);

      // Simulate typing effect
      let currentText = '';
      for (let i = 0; i < response.length; i++) {
        currentText += response[i];
        await new Promise(resolve => setTimeout(resolve, 20));
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: currentText,
            isTyping: i < response.length - 1
          };
          return newMessages;
        });
      }
    } catch (err) {
      setError('Failed to get AI response. Please try again.');
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: "I'm sorry, I encountered an error. Please try again."
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen w-full overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-700 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex-shrink-0 bg-gradient-to-r from-[oklch(30%_0.08_260)] via-[oklch(35%_0.09_270)] to-[oklch(30%_0.08_280)] backdrop-blur-md bg-opacity-80 shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3 ">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">AI Assistant</h1>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">Powered by Gemini</p>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 p-2.5 sm:p-3 mx-3 sm:mx-4 mt-2 sm:mt-3 flex-shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-red-200 break-words">{error}</p>
          </div>
        </div>
      )}

      {/* Messages Container - FIXED: Removed justify-center, added py padding */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
            <Bot className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-50" />
            <p className="text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 font-semibold tracking-tight leading-snug text-[26px] sm:text-[20px] md:text-[24px] lg:text-[30px] animate-[gradientMove_4s_ease_infinite]">
              Start a conversation with AI
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
                }`}
            >
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
              {message.isTyping && (
                <span className="inline-block w-1 h-3 sm:h-4 ml-1 bg-current animate-pulse"></span>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2 sm:gap-3 justify-start">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
            </div>
            <div className="bg-gray-800 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5">
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t border-gray-700 p-3 sm:p-4 md:p-5 bg-gray-900 z-30 shadow-lg">
        <div className="flex gap-2 sm:gap-3 w-full max-w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 min-w-0 bg-gray-800 text-white rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 flex items-center justify-center transition-colors flex-shrink-0 min-w-[52px] sm:min-w-[60px] shadow-md"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;