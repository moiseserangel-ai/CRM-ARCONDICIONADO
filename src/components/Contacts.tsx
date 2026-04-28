import React, { useState, useEffect } from 'react';
import { FileUp, UserPlus as PersonAdd, Filter, ChevronDown, X, ChevronLeft, ChevronRight, MoreVertical, Loader2, Search, Users, TrendingUp, ShieldCheck, Zap, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Contact, ServiceOrder, User } from '../types';
import { supabase } from '../lib/supabase';

interface ContactsProps {
  user: User;
  onSelectContact: (contact: Contact) => void;
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  searchTerm?: string;
}

export default function Contacts({ user, onSelectContact, onAddContact, onEditContact, searchTerm = '' }: ContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSearchQuery(searchTerm);
  }, [searchTerm]);

  const availableStatuses = [
    'Contrato Ativo',
    'Manutenção Pendente',
    'Orçamento Enviado',
    'Instalação Pendente',
    'Visita Técnica Agendada',
    'Aguardando Peças',
    'Serviço Concluído',
    'Em Negociação'
  ];

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Fetch contacts
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        setError('Falha ao carregar contatos. Verifique suas permissões.');
      } else {
        setContacts(data as Contact[]);
      }
      setLoading(false);
    };

    // Fetch service orders
    const fetchServiceOrders = async () => {
      const { data, error } = await supabase
        .from('serviceOrders')
        .select('*')
        .eq('userId', user.id);

      if (error) {
        console.error('Error fetching service orders:', error);
      } else {
        setServiceOrders(data as ServiceOrder[]);
      }
    };

    fetchContacts();
    fetchServiceOrders();

    // Set up real-time subscriptions
    const contactsChannel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
        },
        (payload) => {
          const isRelevant = 
            (payload.new && (payload.new as Contact).userId === user.id) || 
            (payload.old && (payload.old as Contact).userId === user.id) ||
            payload.eventType === 'DELETE';
            
          if (isRelevant) {
            if (payload.eventType === 'INSERT') {
              setContacts((prev) => {
                if (prev.some(c => c.id === payload.new.id)) return prev;
                return [payload.new as Contact, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setContacts((prev) =>
                prev.map((c) => (c.id === payload.new.id ? (payload.new as Contact) : c))
              );
            } else if (payload.eventType === 'DELETE') {
              setContacts((prev) => prev.filter((c) => c.id !== payload.old.id));
            }
          }
        }
      )
      .subscribe();

    const soChannel = supabase
      .channel('so-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'serviceOrders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setServiceOrders((prev) => {
              if (prev.some(so => so.id === payload.new.id)) return prev;
              return [payload.new as ServiceOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setServiceOrders((prev) =>
              prev.map((so) => (so.id === payload.new.id ? (payload.new as ServiceOrder) : so))
            );
          } else if (payload.eventType === 'DELETE') {
            setServiceOrders((prev) => prev.filter((so) => so.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(soChannel);
    };
  }, [user]);

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactToDelete.id);
      if (error) throw error;
      
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setDeleting(false);
      setContactToDelete(null);
    }
  };

  const getContactFinalizedTotal = (contact: Contact) => {
    const finalizedValue = serviceOrders
      .filter(os => os.contactId === contact.id && os.status === 'Finalizada')
      .reduce((acc, os) => {
        const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
        return acc + (parseInt(digits) || 0) / 100;
      }, 0);
      
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalizedValue);
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      (contact.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || contact.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalManaged = filteredContacts.length;
  const activePipeline = serviceOrders
    .filter(os => os.status === 'Aberta' && filteredContacts.some(c => c.id === os.contactId))
    .reduce((sum, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      const val = (parseInt(digits) || 0) / 100;
      return sum + val;
    }, 0);

  const closedVolume = serviceOrders
    .filter(os => (os.status === 'Finalizada' || os.status === 'Orçamento Aceito') && filteredContacts.some(c => c.id === os.contactId))
    .reduce((sum, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      const val = (parseInt(digits) || 0) / 100;
      return sum + val;
    }, 0);

  const finalizedOsWithTime = serviceOrders.filter(os => os.status === 'Finalizada' && os.updatedAt);
  const avgOsTimeDays = finalizedOsWithTime.length > 0 
    ? finalizedOsWithTime.reduce((sum, os) => {
        const start = new Date(os.createdAt).getTime();
        const end = new Date(os.updatedAt!).getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / finalizedOsWithTime.length
    : 0;

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Diretório de Relacionamentos</span>
          </div>
          <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface">Cadastro</h2>
          <p className="text-secondary font-body text-sm max-w-md">Gerencie sua base de clientes, contratos e histórico de manutenções em um só lugar.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 mr-2">
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'table' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-secondary hover:text-on-surface"
              )}
            >
              Tabela
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-on-surface"
              )}
            >
              Cards
            </button>
          </div>
          <button className="flex items-center gap-2 px-6 py-3.5 bg-surface-container-low text-secondary font-black text-[10px] rounded-2xl border border-outline-variant/10 hover:bg-surface-container-high transition-all uppercase tracking-widest">
            <FileUp className="w-4 h-4" />
            Exportar
          </button>
          <button 
            onClick={onAddContact}
            className="flex items-center gap-2 px-8 py-3.5 milled-gradient text-white font-black text-[10px] rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
          >
            <PersonAdd className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Metrics Bento Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Total Gerenciado', value: totalManaged.toString(), trend: '+12%', trendColor: 'bg-primary/10 text-primary', icon: Users },
          { label: 'Pipeline Ativo', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(activePipeline), trend: 'Alta Cap', trendColor: 'bg-tertiary-container/30 text-tertiary', icon: TrendingUp },
          { label: 'Volume Fechado', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(closedVolume), trend: 'Concluído', trendColor: 'bg-emerald-500/10 text-emerald-600', icon: ShieldCheck },
          { label: 'Tempo Médio OS', value: avgOsTimeDays > 0 ? `${avgOsTimeDays.toFixed(1)}d` : 'N/A', trend: '', trendColor: 'bg-secondary-container/30 text-secondary', icon: Zap },
        ].map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-container-lowest p-6 rounded-[32px] shadow-sm border border-outline-variant/5 group hover:border-primary/20 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-surface-container-low rounded-xl text-secondary group-hover:text-primary transition-colors">
                <m.icon className="w-5 h-5" />
              </div>
              {m.trend && (
                <span className={cn("text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter", m.trendColor)}>
                  {m.trend}
                </span>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary/60 mb-1">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-headline font-black text-on-surface tracking-tight">{m.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col xl:flex-row items-center justify-between bg-surface-container-low/30 backdrop-blur-sm p-4 rounded-[32px] border border-outline-variant/10 gap-4">
        <div className="flex-1 flex items-center gap-4 w-full">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text"
              placeholder="Buscar cliente por nome ou empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest pl-12 pr-4 py-4 rounded-2xl text-sm font-semibold text-on-surface border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm outline-none"
            />
          </div>
          
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest px-5 py-4 rounded-2xl text-[10px] font-black text-secondary uppercase tracking-widest border border-outline-variant/10 cursor-pointer hover:bg-surface-container-low transition-all shrink-0">
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end shrink-0">
          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Exibindo {filteredContacts.length} Clientes</span>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-secondary hover:text-primary transition-all shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-secondary hover:text-primary transition-all shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className={cn(
        "min-h-[400px] flex flex-col",
        viewMode === 'table' ? "bg-surface-container-lowest rounded-[40px] shadow-sm border border-outline-variant/5 overflow-hidden" : ""
      )}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-32">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-secondary font-black text-[10px] uppercase tracking-[0.3em]">Sincronizando Dados...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32 text-center px-6">
            <div className="w-20 h-20 bg-error-container/20 rounded-[32px] flex items-center justify-center mb-2 border border-error/10">
              <X className="w-10 h-10 text-error" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-headline text-on-surface">Acesso Interrompido</h3>
              <p className="text-secondary max-w-md text-sm font-medium">{error}</p>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32 text-center px-6">
            <div className="w-20 h-20 bg-primary/5 rounded-[32px] flex items-center justify-center mb-2 border border-primary/10">
              <PersonAdd className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-headline text-on-surface">Nenhum Registro</h3>
              <p className="text-secondary max-w-md text-sm font-medium">Sua base de dados está vazia ou os filtros não retornaram resultados.</p>
            </div>
            <button 
              onClick={onAddContact}
              className="mt-4 px-8 py-3.5 milled-gradient text-white font-black text-[10px] rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
            >
              Adicionar Primeiro Cliente
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-low/30">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60">Cliente / Identidade</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60">Contato Direto</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60 text-right">Volume de Serviço</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60">Última Atividade</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60 text-center">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                <AnimatePresence>
                  {filteredContacts.map((contact, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={contact.id} 
                      className="hover:bg-surface-container-low/40 transition-all cursor-pointer group"
                      onClick={() => onSelectContact(contact)}
                    >
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            {contact.avatar ? (
                              <img src={contact.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-outline-variant/10" alt={contact.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black bg-surface-container-highest text-primary text-lg shadow-sm border border-outline-variant/10">
                                {contact.initials || contact.name.charAt(0)}
                              </div>
                            )}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface-container-lowest",
                              contact.status === 'Contrato Ativo' ? "bg-emerald-500" : "bg-amber-500"
                            )}></div>
                          </div>
                          <div>
                            <p className="font-headline font-black text-on-surface text-base group-hover:text-primary transition-colors line-clamp-2 break-words max-w-[150px] sm:max-w-[250px] md:max-w-[300px]">{contact.name}</p>
                            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{contact.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-sm font-bold text-on-surface">{contact.phone}</p>
                        <p className="text-[10px] font-medium text-secondary/60">{contact.email}</p>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <p className="font-headline font-black text-lg text-on-surface">{getContactFinalizedTotal(contact)}</p>
                        {contact.growth && (
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                            contact.growth.includes('+') ? "bg-emerald-50 text-emerald-600" : 
                            contact.growth.includes('-') ? "bg-error-container/20 text-error" : "bg-surface-container-high text-secondary"
                          )}>
                            {contact.growth}
                          </span>
                        )}
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{contact.lastInteraction}</span>
                          <span className="text-[10px] font-black text-secondary/60 uppercase tracking-widest">{contact.lastInteractionTime}</span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEditContact(contact); }}
                            className="p-3 bg-surface-container-low/50 rounded-xl text-secondary hover:text-primary hover:bg-primary/5 transition-all"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setContactToDelete(contact); }}
                            className="p-3 bg-surface-container-low/50 rounded-xl text-secondary hover:text-error hover:bg-error/5 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredContacts.map((contact, idx) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelectContact(contact)}
                  className="bg-surface-container-lowest p-8 rounded-[40px] shadow-sm border border-outline-variant/5 hover:border-primary/20 hover:shadow-2xl transition-all cursor-pointer group relative flex flex-col h-full"
                >
                  {/* Card Header: Status & Value */}
                  <div className="flex justify-between items-start mb-6">
                    <span className={cn(
                      "px-3 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest",
                      contact.status === 'Contrato Ativo' ? "bg-emerald-50 text-emerald-600" :
                      contact.status === 'Serviço Concluído' ? "bg-blue-50 text-blue-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {contact.status}
                    </span>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-0.5">Volume Total</p>
                      <p className="font-headline font-black text-lg text-primary">{getContactFinalizedTotal(contact)}</p>
                    </div>
                  </div>

                  {/* Identity Section */}
                  <div className="flex items-center gap-5 mb-8">
                    <div className="relative">
                      {contact.avatar ? (
                        <img src={contact.avatar} className="w-16 h-16 rounded-[24px] object-cover shadow-md border border-outline-variant/10" alt={contact.name} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-[24px] flex items-center justify-center font-black bg-surface-container-highest text-primary text-2xl shadow-md border border-outline-variant/10">
                          {contact.initials || contact.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-surface-container-lowest rounded-full shadow-sm"></div>
                    </div>
                    <div>
                      <h4 className="text-xl font-headline font-black text-on-surface group-hover:text-primary transition-colors leading-tight line-clamp-2 break-words">{contact.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TrendingUp className="w-3 h-3 text-secondary/40" />
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">{contact.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {contact.financialStatus && (
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider",
                        contact.financialStatus === 'Adimplente' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {contact.financialStatus}
                      </span>
                    )}
                    {contact.paymentMethod && (
                      <span className="px-2.5 py-1 bg-surface-container-high/50 text-secondary rounded-lg text-[8px] font-black uppercase tracking-wider border border-outline-variant/10">
                        {contact.paymentMethod}
                      </span>
                    )}
                    {contact.relationshipScore && (
                      <span className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-[8px] font-black uppercase tracking-wider border border-primary/10">
                        Score: {contact.relationshipScore}
                      </span>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-auto pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-0.5">Última Interação</p>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <p className="text-xs font-bold text-on-surface">{contact.lastInteraction}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditContact(contact); }}
                        className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary hover:bg-primary hover:text-white transition-all shadow-sm"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setContactToDelete(contact); }}
                        className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary hover:bg-error hover:text-white transition-all shadow-sm"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Excluir Cliente?</h3>
            <p className="text-secondary mb-8 leading-relaxed">
              Você está prestes a remover permanentemente o cliente <span className="font-bold text-on-surface">{contactToDelete.name}</span>. Esta ação é irreversível e todos os dados associados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setContactToDelete(null)}
                className="flex-1 py-3 bg-surface-container-low text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteContact}
                disabled={deleting}
                className="flex-1 py-3 bg-error text-white rounded-xl font-bold shadow-lg hover:bg-error/90 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Cliente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
