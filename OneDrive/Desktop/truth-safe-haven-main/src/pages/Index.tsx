import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { WelcomeScreen } from '@/components/layout/WelcomeScreen';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { XPToast } from '@/components/gamification/XPToast';
import { BadgeUnlockNotification } from '@/components/gamification/BadgeUnlockNotification';
import { TruthCard } from '@/components/privacy/TruthCard';
import { FloatingParticles } from '@/components/ambient/FloatingParticles';
import { BotAvatarIcon } from '@/components/chat/BotAvatarIcon';
import { useAvatarPreference } from '@/hooks/useAvatarPreference';
import { useGamification } from '@/hooks/useGamification';
import { usePrivacy } from '@/hooks/usePrivacy';
import { X } from 'lucide-react';
import { ModeSelector } from '@/components/chat/ModeSelector';
import { streamChat } from '@/lib/ai-service';
import { ChatMessage as ChatMessageType, SourceReference, TruthCard as TruthCardType } from '@/types/chat';
import { toast } from 'sonner';
import { FloatingInputIsland } from '@/components/chat/FloatingInputIsland';

const STORAGE_KEY = 'vaccine-hunter-chat-history';

const loadFromStorage = async (): Promise<{ messages: ChatMessageType[]; truthCards: TruthCardType[] }> => {
  try {
    const { getSecureItem } = await import('@/lib/secureStorage');
    const stored = await getSecureItem<{ messages: any[]; truthCards: any[] }>(STORAGE_KEY);

    if (!stored) return { messages: [], truthCards: [] };

    return {
      messages: stored.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
      truthCards: stored.truthCards.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })),
    };
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return { messages: [], truthCards: [] };
  }
};

const Index = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [truthCards, setTruthCards] = useState<TruthCardType[]>([]);
  const [showTruthCard, setShowTruthCard] = useState<TruthCardType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modeSelectorOpen, setModeSelectorOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Track if initial data is loaded

  // Load from encrypted storage on mount
  useEffect(() => {
    loadFromStorage().then(stored => {
      setMessages(stored.messages);
      setTruthCards(stored.truthCards);
      setIsDataLoaded(true); // Mark data as loaded
    });
  }, []);

  // Persist to encrypted storage (only after initial load completes)
  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until we've loaded existing data

    import('@/lib/secureStorage').then(({ setSecureItem }) => {
      setSecureItem(STORAGE_KEY, { messages, truthCards }).catch(err => {
        console.error('Failed to persist to encrypted storage:', err);
      });
    });
  }, [messages, truthCards, isDataLoaded]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setTruthCards([]);
    import('@/lib/secureStorage').then(({ removeSecureItem }) => {
      removeSecureItem(STORAGE_KEY);
    });
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Living Background State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);




  const { progress, recentXPEvents, newBadge, awardXP, getLevelTitle, getProgressPercentage, trackAssistantUsed } = useGamification();
  const { generateTruthCard } = usePrivacy();
  const { selectedAvatar, setSelectedAvatarId, avatars } = useAvatarPreference();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track initial avatar usage
  useEffect(() => {
    trackAssistantUsed(selectedAvatar.id);
  }, [selectedAvatar.id, trackAssistantUsed]);


  // Handle mode change with greeting message
  const handleModeChange = useCallback((avatarId: string) => {
    const newAvatar = avatars.find(a => a.id === avatarId);
    if (newAvatar) { // Always add greeting if new avatar is found
      setSelectedAvatarId(avatarId);
      trackAssistantUsed(avatarId);

      setMessages(prev => {
        const greetingMessage: ChatMessageType = {
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          content: newAvatar.greetingMessage,
          timestamp: new Date(),
          isFactVerified: false,
        };
        return [...prev, greetingMessage];
      });
    }
  }, [avatars, setSelectedAvatarId, trackAssistantUsed]); // Removed selectedAvatar.id from deps to allow greeting on same avatar re-selection

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Award XP for asking question
    awardXP('question_asked', 'Asked a health question');

    // Create assistant message for streaming
    const assistantId = `msg-${Date.now()}-ai`;
    const assistantMessage: ChatMessageType = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Track streamed content for truth card
    let streamedContent = '';

    // Stream response
    await streamChat({
      messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      mode: selectedAvatar.mode,
      systemPrompt: selectedAvatar.systemPrompt,
      onToken: (token) => {
        streamedContent += token;
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: msg.content + token }
            : msg
        ));
      },
      onComplete: (sources, followUpQuestions) => {
        // Only Dr. Verify (factcheck mode) needs source verification
        // Nurse Claire and Sam provide guidance without formal sources
        const shouldShowSources = selectedAvatar.mode === 'factcheck';

        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
              ...msg,
              sources: shouldShowSources ? sources : [],
              followUpQuestions,
              isFactVerified: shouldShowSources && sources.length > 0,
              isStreaming: false
            }
            : msg
        ));
        setIsLoading(false);

        // Award XP (different message for different modes)
        if (shouldShowSources) {
          awardXP('fact_verified', 'Verified health information');
        } else {
          awardXP('question_asked', 'Received health guidance');
        }

        // Generate truth cards only for Dr. Verify's factual responses with multiple sources
        if (shouldShowSources && sources.length >= 2) {
          const card = generateTruthCard(
            content, // user's question as the claim
            'true',
            streamedContent, // Full AI answer as explanation
            sources,
            [userMessage.id, assistantId],
            true
          );
          setTruthCards(prev => [...prev, card]);
        }
      },
      onError: (error) => {
        console.error('AI response error:', error);

        // Show user-friendly toast based on error type
        const errorMessage = error.message || '';
        if (errorMessage.includes('429')) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (errorMessage.includes('402')) {
          toast.error('API credits exhausted. Please check your backend configuration.');
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          toast.error('Authentication error. Please check your API key.');
        } else {
          toast.error('Failed to get response. Please try again.');
        }

        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
              ...msg,
              content: 'I apologize, but I encountered an error. Please try asking your question again.',
              isStreaming: false
            }
            : msg
        ));
        setIsLoading(false);
      },
    });
  };

  const handleSourceClick = (source: SourceReference) => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
    awardXP('source_explored', `Explored ${source.name}`);
  };

  const handleShareTruthCard = () => {
    awardXP('truth_card_shared', 'Shared a Truth Card');
    setShowTruthCard(null);
  };

  const handleFollowUpClick = (question: string) => {
    handleSendMessage(question);
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Vaccine Hunter',
        text: 'Check out this health assistant app!',
        url: window.location.href,
      }).then(() => {
        awardXP('truth_card_shared', 'Shared the app');
        toast.success('Thanks for sharing!');
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      awardXP('truth_card_shared', 'Shared the app');
      toast.success('Link copied to clipboard!');
    }
  };


  return (
    <div
      className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-700"
      style={{
        '--mode-primary': selectedAvatar.themeColor,
        '--mode-primary-light': selectedAvatar.themeColorLight,
        '--mode-ring': selectedAvatar.ringColor,
      } as React.CSSProperties}
    >
      {/* Premium Gradient Mesh Background - Reactive */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--mode-primary),0.05),transparent_50%)]" />

        {/* Living Blobs - Move opposite to mouse for depth */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] opacity-40 animate-blob transition-transform duration-100 ease-out"
          style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * 20}px)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] opacity-40 animate-blob animation-delay-2000 transition-transform duration-100 ease-out"
          style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * -20}px)` }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[rgba(var(--mode-primary),0.03)] rounded-full blur-[120px] animation-delay-4000"
          style={{ transform: `translate(-50%, -50%) scale(${1 + Math.abs(mousePos.x) * 0.05})` }}
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      <FloatingParticles avatarId={selectedAvatar.id} />

      {/* Desktop Sidebar with Glass Effect */}
      <div className="hidden md:block z-20">
        <Sidebar
          progress={progress}
          levelTitle={getLevelTitle(progress.level)}
          progressPercentage={getProgressPercentage()}
          onShare={handleShareApp}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full animate-slide-in-left shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-white"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              progress={progress}
              levelTitle={getLevelTitle(progress.level)}
              progressPercentage={getProgressPercentage()}
              onShare={handleShareApp}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenu={true}
          onClearHistory={clearHistory}
          hasHistory={messages.length > 0}
          selectedAvatar={selectedAvatar}
          onOpenModeSelector={() => setModeSelectorOpen(true)}
        />

        <main className="flex-1 overflow-hidden flex flex-col relative">
          {/* Messages Area - Glass container */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="min-h-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col px-4 md:px-6">
                  <WelcomeScreen
                    currentAvatar={selectedAvatar}
                    allAvatars={avatars}
                    onAvatarClick={(avatar) => handleModeChange(avatar.id)}
                  />
                  <div className="mt-auto pb-60 md:pb-96 max-w-3xl mx-auto w-full">
                    <SuggestedQuestions
                      onSelect={handleSendMessage}
                      avatarId={selectedAvatar.id}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 pb-60 md:pb-96 px-4 md:px-8"> {/* Responsive padding for floating input + side spacing */}
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onSourceClick={handleSourceClick}
                      onFollowUpClick={handleFollowUpClick}
                      botAvatar={selectedAvatar}
                    />
                  ))}

                  {/* Show suggestions at the start of chat (when only greeting exists) */}
                  {messages.length === 1 && messages[0].role === 'assistant' && (
                    <div className="max-w-3xl mx-auto w-full px-4 mt-6 animate-fade-in">
                      <SuggestedQuestions
                        onSelect={handleSendMessage}
                        avatarId={selectedAvatar.id}
                      />
                    </div>
                  )}

                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <TypingIndicator botAvatar={selectedAvatar} />
                  )}

                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Extracted Component */}
          <FloatingInputIsland
            selectedAvatar={selectedAvatar}
            onOpenModeSelector={() => setModeSelectorOpen(true)}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            truthCards={truthCards}
            messages={messages}
            onShowTruthCard={setShowTruthCard}
          />
        </main>
      </div>

      {/* Truth Card Modal */}
      {showTruthCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-radix-popper-content-wrapper]')) return;
            setShowTruthCard(null);
          }}
        >
          <div
            className="max-w-md w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <TruthCard
              card={showTruthCard}
              onShare={handleShareTruthCard}
            />
          </div>
        </div>
      )}

      {/* Badge Unlock Notification */}
      {newBadge && (
        <BadgeUnlockNotification
          badge={newBadge}
          onClose={() => { }}
        />
      )}

      {/* XP Toast */}
      <XPToast events={recentXPEvents} />

      {/* Mode Selector Modal */}
      <ModeSelector
        isOpen={modeSelectorOpen}
        onClose={() => setModeSelectorOpen(false)}
        selectedAvatar={selectedAvatar}
        onSelect={handleModeChange}
      />
    </div>
  );
};
export default Index;
