import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Button from "../components/ui/Button";
import ContentHeader from "../components/layout/ContentHeader";
import { ImagesPath } from "../utils/images";
import AnimatedPage from "../components/ui/AnimatedPage";

interface Message {
  id: number;
  text: string;
  sender: "ai" | "user";
}

// Component to format message text (bold, lists, line breaks)
const FormattedMessage = ({ text, isUser }: { text: string; isUser: boolean }) => {
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  return (
    <div className="space-y-2">
      {paragraphs.map((para, idx) => {
        // Check if paragraph starts with numbered list (1., 2., etc.)
        const listMatch = para.match(/^(\d+\.\s+.*(?:\n\d+\.\s+.*)*)/);
        
        if (listMatch) {
          // Render as numbered list
          const listItems = para.split(/\n(?=\d+\.\s+)/).map((item) => {
            const itemMatch = item.match(/^\d+\.\s+(.+)/);
            if (!itemMatch) return item;
            const content = itemMatch[1];
            // Parse bold text (**text**)
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={item} className="ml-4 mb-1.5">
                {parts.map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={i} className={isUser ? "text-text-primary font-semibold" : "text-white font-semibold"}>
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </li>
            );
          });
          
          return (
            <ol key={idx} className="list-decimal list-inside space-y-1.5">
              {listItems}
            </ol>
          );
        }
        
        // Regular paragraph - parse bold and line breaks
        const lines = para.split(/\n/);
        return (
          <p key={idx} className="leading-relaxed">
            {lines.map((line, lineIdx) => {
              // Parse bold text (**text**)
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <span key={lineIdx}>
                  {parts.map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return (
                        <strong key={i} className={isUser ? "text-text-primary font-semibold" : "text-white font-semibold"}>
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                  {lineIdx < lines.length - 1 && <br />}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};

const HelpPage = () => {
  const reduceMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm here to help you with any questions about MockMate - your AI-powered interview preparation platform. What would you like to know?",
      sender: "ai",
    },
  ]);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollMessagesToBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Auto-scroll on new messages (single scroll container: messages only)
  useEffect(() => {
    // wait for DOM paint (message bubble height)
    requestAnimationFrame(() => {
      scrollMessagesToBottom();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  const handleSendMessage = async () => {
    if (input.trim() === "" || loading) return;

    const userQuestion = input.trim();
    const newUserMessage: Message = {
      id: messages.length + 1,
      text: userQuestion,
      sender: "user",
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setLoading(true);
    requestAnimationFrame(() => scrollMessagesToBottom());

    try {
      const token = localStorage.getItem("token");
      
      // Call backend endpoint for help chat
      const response = await fetch("http://localhost:5000/api/help/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userQuestion,
          conversationHistory: messages.slice(-10).map((msg) => ({
            role: msg.sender === "ai" ? "assistant" : "user",
            content: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const aiResponse = data.message || data.response || "I'm sorry, I couldn't process your question. Please try again.";

      const newAiMessage: Message = {
        id: messages.length + 2,
        text: aiResponse,
        sender: "ai",
      };

      setMessages((prev) => [...prev, newAiMessage]);
      requestAnimationFrame(() => scrollMessagesToBottom());
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: "ai",
      };
      setMessages((prev) => [...prev, errorMessage]);
      requestAnimationFrame(() => scrollMessagesToBottom());
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AppLayout
      fixLayout
      // Disable AppLayout scrolling/padding for this page (we scroll only inside messages)
      mainClassName="!px-0 !pb-0 !overflow-hidden !overflow-y-hidden flex flex-col"
    >
      <AnimatedPage className="h-full" contentClassName="h-full flex flex-col">
        {/* Page Header (scrolls away like other pages) */}
        <div className="px-4 lg:px-[2vw] pt-3 lg:pt-[1.7vw] pb-1.5 lg:pb-[0.75vw] flex-shrink-0">
          <ContentHeader
            title="Help"
            description="Ask questions and get instant assistance."
            backButton
            sticky={false}
          />
        </div>

        {/* Messages (ONLY scroll area) */}
        <div
          ref={messagesScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 lg:px-[2vw] py-4 scrollbar-hide"
        >
          <div className="flex flex-col gap-4 lg:gap-[1vw]">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] rounded-2xl lg:rounded-[1.5vw] flex gap-2 lg:gap-[0.5vw] ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <img
                    src={message.sender === "ai" ? ImagesPath.botIcon : ImagesPath.userIcon}
                    alt={message.sender === "ai" ? "ai assistant" : "user"}
                    className="object-contain w-6 h-6 sm:w-8 sm:h-8 lg:w-[2.5vw] lg:h-[2.5vw] flex-shrink-0"
                  />
                  <div
                    className={`font-size-18px sm:font-size-20px font-poppins-regular rounded-2xl lg:rounded-[1.5vw] px-4 py-3 break-words ${
                      message.sender === "user"
                        ? "bg-card border border-border text-text-primary"
                        : "bg-primary text-white"
                    }`}
                  >
                    <FormattedMessage text={message.text} isUser={message.sender === "user"} />
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] rounded-2xl lg:rounded-[1.5vw] flex gap-2 lg:gap-[0.5vw]">
                  <img
                    src={ImagesPath.botIcon}
                    alt="ai"
                    className="object-contain w-6 h-6 sm:w-8 sm:h-8 lg:w-[2.5vw] lg:h-[2.5vw] flex-shrink-0"
                  />
                  <div className="bg-primary px-4 py-3 rounded-2xl lg:rounded-[1.5vw] flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-white/80" />
                    <span className="text-white text-sm sm:text-base">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input (ALWAYS bottom, no empty space below) */}
        <div className="flex-shrink-0 px-4 lg:px-[2vw] pt-4 lg:pt-[1vw] pb-4 lg:pb-[2vw] border-t border-border bg-background">
          <motion.div whileHover={reduceMotion ? undefined : { y: -1 }} className="relative flex items-center w-full">
            <textarea
              value={input}
              ref={textareaRef}
              onChange={(e) => {
                setInput(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about MockMate..."
              disabled={loading}
              className="w-full px-4 py-3 pr-12 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-transparent text-text-primary placeholder:text-text-secondary/70 resize-none scrollbar-hide"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              className="absolute right-2 p-2 rounded-md bg-transparent hover:bg-primary/10 text-primary transition-colors"
              size="icon"
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </Button>
          </motion.div>
        </div>
        </AnimatedPage>
    </AppLayout>
  );
};

export default HelpPage;
