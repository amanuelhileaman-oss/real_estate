import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { chatService } from '../../services/chatService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Building2,
  ExternalLink,
  Shield,
  Briefcase,
  User,
  Check,
  CheckCheck,
  X,
  Sparkles
} from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Chat Modal state
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  const initialConvId = searchParams.get('conversationId');
  const initialRecipientId = searchParams.get('recipientId');
  const initialPropertyId = searchParams.get('propertyId');

  // Load conversations
  const loadConversations = async (autoSelectId = null) => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);

      if (autoSelectId) {
        const found = data.find((c) => c.id === autoSelectId);
        if (found) {
          setActiveConversation(found);
        }
      } else if (!activeConversation && data.length > 0 && !initialRecipientId) {
        setActiveConversation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // If initiated from property details or user link
  useEffect(() => {
    async function initFromParams() {
      if (initialRecipientId) {
        try {
          const conv = await chatService.startConversation({
            recipientId: initialRecipientId,
            propertyId: initialPropertyId || null,
            initialMessage: searchParams.get('initialMessage') || null
          });
          await loadConversations(conv.id);
        } catch (err) {
          addToast(err.message || 'Failed to start chat', 'error');
          loadConversations();
        }
      } else {
        loadConversations(initialConvId);
      }
    }
    initFromParams();
  }, [initialRecipientId, initialConvId]);

  // Load messages whenever active conversation changes
  const loadMessages = async (convId) => {
    if (!convId) return;
    try {
      const data = await chatService.getMessages(convId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
      // Auto-polling for active chat every 3 seconds
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        loadMessages(activeConversation.id);
      }, 3000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeConversation?.id]);

  // Auto-scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessageText.trim() || !activeConversation || sending) return;

    const text = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      const sent = await chatService.sendMessage(activeConversation.id, text);
      setMessages((prev) => [...prev, sent]);
      // Update snippet in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, last_message_text: text, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      addToast(err.message || 'Failed to send message', 'error');
      setNewMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const openNewChatModal = async () => {
    setNewChatModalOpen(true);
    setLoadingContacts(true);
    try {
      const list = await chatService.getContacts();
      setContacts(list);
    } catch (err) {
      addToast('Failed to load contacts list', 'error');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectContact = async (recipient) => {
    try {
      setNewChatModalOpen(false);
      const conv = await chatService.startConversation({
        recipientId: recipient.id,
        title: `Chat with ${recipient.first_name}`
      });
      await loadConversations(conv.id);
    } catch (err) {
      addToast(err.message || 'Could not initiate conversation', 'error');
    }
  };

  const handleContactAdminSupport = async () => {
    try {
      setNewChatModalOpen(false);
      const conv = await chatService.startConversation({
        type: 'SUPPORT',
        title: 'Platform Admin Support'
      });
      await loadConversations(conv.id);
      addToast('Connected with Platform Support', 'success');
    } catch (err) {
      addToast(err.message || 'Admin support unavailable', 'error');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    const otherName = `${c.other_first_name || ''} ${c.other_last_name || ''}`.toLowerCase();
    const propTitle = (c.property_title || '').toLowerCase();
    const lastMsg = (c.last_message_text || '').toLowerCase();
    return otherName.includes(term) || propTitle.includes(term) || lastMsg.includes(term);
  });

  const filteredContacts = contacts.filter((ct) => {
    const term = contactSearch.toLowerCase();
    const name = `${ct.first_name} ${ct.last_name}`.toLowerCase();
    const email = ct.email.toLowerCase();
    const agency = (ct.agency_name || '').toLowerCase();
    return name.includes(term) || email.includes(term) || agency.includes(term);
  });

  const getRoleBadgeVariant = (role) => {
    if (role === 'ADMIN') return 'rose';
    if (role === 'AGENT') return 'indigo';
    return 'default';
  };

  return (
    <DashboardLayout
      title="Multi-Role Live Chat"
      subtitle="Direct messaging between Customers, Licensed Agents, and Platform Administration."
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row h-[720px] transition-colors">
        {/* Left 35%: Conversations List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">Conversations</h2>
              </div>
              <button
                onClick={openNewChatModal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                title="Start a new chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations scroll area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400 animate-pulse">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No conversations yet.</p>
                <button
                  onClick={openNewChatModal}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Start your first conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activeConversation?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConversation(c)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {c.other_first_name?.[0] || 'U'}
                      </div>
                      {c.other_role === 'ADMIN' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">
                          ★
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {c.other_first_name} {c.other_last_name}
                        </span>
                        <Badge variant={getRoleBadgeVariant(c.other_role)} className="text-[9px] py-0 px-1.5 uppercase font-mono">
                          {c.other_role}
                        </Badge>
                      </div>

                      {/* Property context if attached */}
                      {c.property_title && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate mb-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.property_title}</span>
                        </div>
                      )}

                      {/* Last message snippet */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {c.last_message_text || 'No messages yet'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {c.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 65%: Chat Viewport */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
            {/* Chat Top Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {activeConversation.other_first_name?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeConversation.other_first_name} {activeConversation.other_last_name}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(activeConversation.other_role)} className="text-[9px] py-0 px-1.5 uppercase font-mono">
                      {activeConversation.other_role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeConversation.other_agency_name || activeConversation.other_email}
                  </p>
                </div>
              </div>

              {/* Property link banner if conversation has property attached */}
              {activeConversation.property_title && (
                <Link
                  to={`/properties/${activeConversation.property_slug || activeConversation.property_id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50 dark:bg-slate-800/60 transition-colors shrink-0"
                  title="View property details"
                >
                  <img
                    src={activeConversation.property_image_url || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=100&q=80'}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                  <div className="hidden sm:block text-left text-[11px]">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                      {activeConversation.property_title}
                    </div>
                    {activeConversation.property_price && (
                      <div className="text-blue-600 dark:text-blue-400 font-semibold">
                        {formatCurrency(activeConversation.property_price, activeConversation.property_currency)}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                  <Sparkles className="w-8 h-8 text-blue-400 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No messages yet in this conversation.
                  </p>
                  <p className="text-[11px]">Say hello and send your first inquiry or update below!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && (
                        <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {m.sender_first_name?.[0] || 'U'}
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs space-y-1 ${
                          isMine
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                        }`}
                      >
                        {!isMine && (
                          <div className="font-bold text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                            {m.sender_first_name} ({m.sender_role})
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                        <div
                          className={`text-[9px] flex items-center justify-end gap-1 ${
                            isMine ? 'text-blue-100/80' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatDate(m.created_at)}</span>
                          {isMine && (m.is_read ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your message..."
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sending}
                className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-white dark:bg-slate-900 text-slate-400">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-1" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No active conversation selected</h3>
            <p className="text-xs max-w-sm text-slate-500 dark:text-slate-400">
              Select an existing chat from the left panel, or start a new conversation with an agent or administrator.
            </p>
            <Button variant="primary" size="sm" onClick={openNewChatModal}>
              <Plus className="w-4 h-4" />
              <span>Start New Chat</span>
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">Start a New Conversation</h3>
                <p className="text-xs text-slate-400">Select a verified advisor, client, or platform support</p>
              </div>
              <button
                onClick={() => setNewChatModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick action: Contact Admin Support */}
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Platform Administrator Desk</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Compliance, verification & support</div>
                </div>
              </div>
              <button
                onClick={handleContactAdminSupport}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Message Admin
              </button>
            </div>

            {/* Contacts search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search by name, email, or agency..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
              {loadingContacts ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No matching contacts found.</div>
              ) : (
                filteredContacts.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => handleSelectContact(ct)}
                    className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {ct.first_name?.[0] || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ct.first_name} {ct.last_name}
                          </span>
                          <Badge variant={getRoleBadgeVariant(ct.role)} className="text-[9px] py-0 px-1.5 uppercase font-mono">
                            {ct.role}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {ct.agency_name ? `${ct.agency_name} • ` : ''}{ct.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      Message →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
