import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  BedDouble
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  action?: 'book' | 'whatsapp';
}

interface ChatWidgetProps {
  onTriggerBooking: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onTriggerBooking }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialGreeting: ChatMessage = {
    id: 'welcome-msg',
    sender: 'bot',
    text: '¡Hola! Qué gusto saludarte. Soy Don Joaquín "Don Juaco", anfitrión de Finca La Colmena en Montenegro, Quindío.\n\nPuedes preguntarme sobre nuestras 7 habitaciones campestres, las tarifas ($85.000 regular / $120.000 alta con desayuno campesino incluido), cómo llegar desde el Parque del Café o Armenia, o nuestras experiencias: amplia zona verde para mascotas, parque infantil con columpios y piscina campestre.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const sampleQuestions = [
    '¿Cuánto cuesta la noche y qué incluye?',
    '¿Cómo es la zona verde para mascotas?',
    '¿Tienen piscina y columpios para niños?',
    '¿Cómo son las 7 habitaciones?'
  ];

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([initialGreeting]);
    }
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'welcome-msg' || messages.length === 1)
        .slice(-20)
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: historyPayload
        })
      });

      if (!res.ok) {
        throw new Error('Error en el servicio de IA');
      }

      const data = await res.json();
      const botReplyText = data.answer || 'Con gusto te atiende Don Juaco. ¿En qué más te puedo colaborar?';

      const lowerText = botReplyText.toLowerCase();
      let suggestedAction: 'book' | 'whatsapp' | undefined = undefined;
      if (lowerText.includes('reservar') || lowerText.includes('habitaciones') || lowerText.includes('disponibilidad')) {
        suggestedAction = 'book';
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: suggestedAction
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '¡Con gusto te atiende Don Juaco! Tenemos 7 habitaciones con desayuno campesino incluido ($85.000 COP regular / $120.000 COP alta). Si deseas atención personalizada inmediata, puedes escribirme directamente al WhatsApp +57 301 567 7776.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'whatsapp'
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...initialGreeting,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      
      {/* Discreet, Small, Less-Invasive Floating Trigger Button (No bee, Forest Green) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center space-x-2 px-3 py-2 bg-[#1B4332] hover:bg-[#143225] text-white rounded-full shadow-lg border border-[#2D6A4F]/60 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Abrir chat con Don Juaco"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-300" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium tracking-tight pr-0.5">Chat con Don Juaco</span>
        </button>
      )}

      {/* Chat Window Container (Warm Wood & Forest Green) */}
      {isOpen && (
        <div className="bg-[#FAF6F0] w-[90vw] sm:w-[380px] h-[520px] rounded-2xl shadow-2xl border border-[#D7C7B2] flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
          
          {/* Header */}
          <div className="bg-[#1B4332] text-white px-4 py-3 flex items-center justify-between border-b border-[#143225]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-serif font-bold text-white text-sm leading-tight">
                    Don Juaco (IA Concierge)
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#2D6A4F] text-emerald-100 font-bold text-3xs uppercase tracking-wider">
                    En vivo
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-3xs text-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Finca La Colmena • Montenegro</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                title="Reiniciar conversación"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Questions Pills */}
          <div className="px-3 py-2 bg-[#EFE7DC] border-b border-[#D7C7B2] overflow-x-auto scrollbar-none flex gap-1.5 text-2xs">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#FAF6F0] hover:bg-[#1B4332] text-[#2C1E16] hover:text-white border border-[#D7C7B2] hover:border-[#1B4332] font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#EAE0D2]/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#1B4332] text-white rounded-br-xs'
                      : 'bg-[#FAF6F0] text-[#2C1E16] border border-[#D7C7B2] rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'bot' && (
                    <div className="flex items-center gap-1 text-2xs font-bold text-[#1B4332] mb-1 tracking-wider uppercase">
                      <Sparkles className="w-3 h-3 text-[#2D6A4F]" />
                      <span>Don Juaco</span>
                    </div>
                  )}

                  <p className="whitespace-pre-line text-xs leading-relaxed">
                    {msg.text}
                  </p>

                  <span
                    className={`text-3xs block mt-1 text-right ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-[#8C7A6B]'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {/* Suggested Action buttons */}
                {msg.sender === 'bot' && msg.action === 'book' && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onTriggerBooking();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4332] hover:bg-[#143225] text-white text-2xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>Ver y Reservar Habitaciones</span>
                    </button>
                    <a
                      href="https://wa.me/573015677776?text=Hola%20Don%20Juaco,%20quiero%20hacer%20una%20reserva%20en%20Finca%20La%20Colmena"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-2xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Directo</span>
                    </a>
                  </div>
                )}

                {msg.sender === 'bot' && msg.action === 'whatsapp' && (
                  <div className="mt-1.5">
                    <a
                      href="https://wa.me/573015677776?text=Hola%20Don%20Juaco,%20tengo%20una%20consulta%20sobre%20la%20finca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-2xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Escribir por WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-[#5A4535] text-xs py-1.5 bg-[#FAF6F0] px-3 rounded-2xl border border-[#D7C7B2] w-fit shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F] animate-spin" />
                <span className="font-medium text-xs">Don Juaco está escribiendo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 bg-[#FAF6F0] border-t border-[#D7C7B2]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe tu mensaje a Don Juaco..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#D7C7B2] focus:outline-hidden focus:ring-2 focus:ring-[#1B4332] bg-[#EFE7DC] text-[#2C1E16] placeholder:text-[#8C7A6B]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="p-2 bg-[#1B4332] hover:bg-[#143225] disabled:bg-[#D7C7B2] disabled:cursor-not-allowed text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                title="Enviar mensaje"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-1 text-3xs text-[#7A6856]">
              <span>IA Finca La Colmena</span>
              <a
                href="https://wa.me/573015677776"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1B4332] hover:underline font-semibold"
              >
                WhatsApp: +57 301 567 7776
              </a>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
