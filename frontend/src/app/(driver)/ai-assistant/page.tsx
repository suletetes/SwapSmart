'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  'When should I swap my battery?',
  'Find the nearest available station',
  'How is my battery health?',
  'Show my savings this month',
];

export default function AIAssistantPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your SwapSmart AI assistant. I can help you find the best time to swap, locate nearby stations, and answer questions about your battery health. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content.trim() }),
      });

      let assistantContent: string;
      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || data.message || 'I can help you with that!';
      } else {
        // Fallback response for demo
        assistantContent = getLocalResponse(content.trim());
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Fallback for offline/error
      const fallback: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: getLocalResponse(content.trim()),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
            AI Assistant
          </h1>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Powered by SwapSmart AI
          </p>
        </div>
        <div className="w-[44px]" />
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-card ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-bl-sm'
              }`}
            >
              <p className={`text-sm ${
                msg.role === 'user'
                  ? 'text-white'
                  : 'text-text-primary-light dark:text-text-primary-dark'
              }`}>
                {msg.content}
              </p>
              <p className={`text-xs mt-1 ${
                msg.role === 'user' ? 'text-white/60' : 'text-text-secondary-light/60 dark:text-text-secondary-dark/60'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (show only when few messages) */}
      {messages.length <= 2 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2">Suggested:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="min-h-[44px] px-3 py-2 rounded-full border border-border-light dark:border-border-dark text-xs text-text-primary-light dark:text-text-primary-dark hover:border-primary hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex-shrink-0"
      >
        {/* Voice input icon (placeholder) */}
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Voice input"
        >
          <svg className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 min-h-[44px] px-4 py-2 rounded-full border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Type your message"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

/** Local fallback responses for demo/offline */
function getLocalResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('swap') && lower.includes('when')) {
    return "Based on your usage patterns, I recommend swapping around 3:00 PM today. Station traffic is typically lower at that time, and your battery should be around 15% by then. GreenCharge Ikeja has the shortest wait time.";
  }
  if (lower.includes('nearest') || lower.includes('station') || lower.includes('find')) {
    return "The nearest available station is GreenCharge Ikeja (1.2 km, ~4 min). They have 5 batteries available right now. PowerHub Surulere is also nearby (2.1 km) with 3 batteries available.";
  }
  if (lower.includes('health') || lower.includes('battery')) {
    return "Your current battery health score is 94/100 — excellent! Based on the cycle count and temperature history, your battery is performing well. Estimated range: 58km on a full charge.";
  }
  if (lower.includes('saving') || lower.includes('cost')) {
    return "This month you've saved ₦45,000 compared to petrol costs! That's 32 swaps averaging ₦1,406 per swap vs ₦2,812 equivalent petrol cost per trip. Keep it up! 🎉";
  }
  return "I can help you with swap timing recommendations, finding nearby stations, battery health info, and cost savings analysis. What would you like to know?";
}
