import { useState, useRef, useEffect } from 'react';
import { chatbot } from '../api';
import { Send, Bot, User, Trash2 } from 'lucide-react';

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asesor financiero. Pregúntame sobre tus finanzas, presupuestos o metas de ahorro.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await chatbot.send(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el asistente. Asegúrate de que Ollama esté corriendo.' }]);
    }
    setLoading(false);
  };

  const handleClear = async () => {
    await chatbot.clear().catch(() => {});
    setMessages([
      { role: 'assistant', content: 'Conversación reiniciada. ¿En qué puedo ayudarte?' }
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border flex flex-col" style={{ height: '500px' }}>
      <div className="flex items-center justify-between p-4 border-b bg-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold">Asesor Financiero</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="p-1 hover:bg-indigo-500 rounded transition-colors" title="Reiniciar conversación">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-indigo-500 rounded transition-colors">
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-1.5 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                {msg.role === 'user' ? <User size={14} className="text-indigo-600" /> : <Bot size={14} className="text-gray-600" />}
              </div>
              <div className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-500 flex items-center gap-2">
              <div className="animate-pulse">Escribiendo</div>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre tus finanzas..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
