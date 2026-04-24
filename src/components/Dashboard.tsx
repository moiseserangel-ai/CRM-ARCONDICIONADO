import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Download, MoreHorizontal, ChevronRight, PlusCircle, CheckCircle, Lightbulb as Insights, Users, DollarSign, Briefcase, Clock, ArrowUpRight, ArrowDownRight, Filter, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Contact, ServiceOrder, View, User } from '../types';
import QuickOSModal from './QuickOSModal';

interface DashboardProps {
  user: User;
  onSelectContact: (contact: Contact) => void;
  onViewChange: (view: View) => void;
  searchTerm?: string;
}

export default function Dashboard({ user, onSelectContact, onViewChange, searchTerm = '' }: DashboardProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickOSModal, setShowQuickOSModal] = useState(false);
  const stages = ['INSTALAÇÃO', 'VISITA TÉCNICA', 'ORÇAMENTO', 'NEGOCIAÇÃO', 'FECHADO'];

  const normalize = (str: string) => 
    (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredContacts = contacts.filter(c => 
    normalize(c.name).includes(normalize(searchTerm)) || 
    normalize(c.address).includes(normalize(searchTerm))
  );

  const filteredServiceOrders = serviceOrders.filter(os => 
    normalize(os.subject).includes(normalize(searchTerm)) || 
    normalize(os.contactName).includes(normalize(searchTerm))
  );

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
      } else {
        setContacts(data as Contact[]);
      }
      setLoading(false);
    };

    const fetchServiceOrders = async () => {
      const { data, error } = await supabase
        .from('serviceOrders')
        .select('*')
        .order('createdAt', { ascending: false });

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
      .channel('dashboard-contacts')
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
      .channel('dashboard-so')
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

  const getContactsByStage = (stage: string) => {
    return filteredContacts.filter(contact => {
      const contactOrders = serviceOrders.filter(os => os.contactId === contact.id);
      const hasOpenOS = contactOrders.some(os => os.status === 'Aberta');
      const hasFinalizedOS = contactOrders.some(os => 
        os.status === 'Finalizada' || 
        os.status === 'Orçamento Aceito' || 
        os.status === 'Orçamento Rejeitado'
      );

      if (hasOpenOS) {
        const mostRecentOpen = contactOrders
          .filter(os => os.status === 'Aberta')
          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];
        
        const subject = (mostRecentOpen.subject || '').toLowerCase();
        let detectedStage = '';
        
        if (subject.includes('instalação')) detectedStage = 'INSTALAÇÃO';
        else if (subject.includes('visita técnica')) detectedStage = 'VISITA TÉCNICA';
        else if (subject.includes('orçamento')) detectedStage = 'ORÇAMENTO';
        else if (subject.includes('negociação')) detectedStage = 'NEGOCIAÇÃO';
        
        if (detectedStage === stage) return true;
        
        if (!detectedStage) {
          switch (stage) {
            case 'INSTALAÇÃO':
              return contact.status === 'Manutenção Pendente' || contact.status === 'Instalação Pendente';
            case 'VISITA TÉCNICA':
              return contact.status === 'Visita Técnica Agendada';
            case 'ORÇAMENTO':
              return contact.status === 'Orçamento Enviado' || contact.status === 'Aguardando Peças';
            case 'NEGOCIAÇÃO':
              return contact.status === 'Em Negociação';
            default:
              return false;
          }
        }
        return false;
      }

      if (hasFinalizedOS) {
        return stage === 'FECHADO';
      }

      switch (stage) {
        case 'INSTALAÇÃO':
          return contact.status === 'Manutenção Pendente' || contact.status === 'Instalação Pendente';
        case 'VISITA TÉCNICA':
          return contact.status === 'Visita Técnica Agendada';
        case 'ORÇAMENTO':
          return contact.status === 'Orçamento Enviado' || contact.status === 'Aguardando Peças';
        case 'NEGOCIAÇÃO':
          return contact.status === 'Em Negociação';
        case 'FECHADO':
          return contact.status === 'Serviço Concluído' || contact.status === 'Contrato Ativo';
        default:
          return false;
      }
    });
  };

  const handleExport = () => {
    if (filteredContacts.length === 0) return;
    
    const headers = ['Nome', 'Endereço', 'Status', 'Total em serviço', 'Email', 'Telefone', 'Localização'];
    const csvContent = [
      headers.join(','),
      ...filteredContacts.map(c => [
        `"${c.name}"`,
        `"${c.address}"`,
        `"${c.status}"`,
        `"${getContactFinalizedTotal(c)}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.location}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closedValue = filteredServiceOrders
    .filter(os => os.status === 'Finalizada' || os.status === 'Orçamento Aceito')
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      const value = (parseInt(digits) || 0) / 100;
      return acc + value;
    }, 0);

  const totalOpenValue = filteredServiceOrders
    .filter(os => os.status === 'Aberta')
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      return acc + (parseInt(digits) || 0) / 100;
    }, 0);

  const totalPipelineValue = closedValue + totalOpenValue;

  const getContactFinalizedTotal = (contact: Contact) => {
    const finalizedValue = serviceOrders
      .filter(os => os.contactId === contact.id && (os.status === 'Finalizada' || os.status === 'Orçamento Aceito'))
      .reduce((acc, os) => {
        const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
        return acc + (parseInt(digits) || 0) / 100;
      }, 0);
      
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalizedValue);
  };

  const activeLeadsCount = filteredContacts.filter(c => 
    c.status !== 'Serviço Concluído' && c.status !== 'Contrato Ativo'
  ).length;

  const conversionRate = filteredContacts.length > 0 
    ? (getContactsByStage('FECHADO').length / filteredContacts.length) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-primary"
        ></motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <AnimatePresence>
        {showQuickOSModal && (
          <QuickOSModal 
            user={user}
            contacts={contacts}
            onClose={() => setShowQuickOSModal(false)}
            onSuccess={(newOS, updatedContact) => {
              setServiceOrders(prev => {
                if (prev.some(so => so.id === newOS.id)) return prev;
                return [newOS, ...prev];
              });
              setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
            }}
            onViewChange={onViewChange}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-2">Visão Geral de Desempenho</p>
          <h2 className="text-4xl font-black font-headline tracking-tight text-on-surface">Painel de Controle</h2>
          <p className="text-secondary text-sm mt-1 font-medium">Acompanhe métricas, leads e ordens de serviço em tempo real.</p>
        </motion.div>
      </div>

      {/* Bento Grid: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Clients */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-7 rounded-[32px] shadow-sm border border-outline-variant/5 flex flex-col justify-between group hover:shadow-xl transition-all"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                <ArrowUpRight className="w-3 h-3" /> 12%
              </div>
            </div>
            <p className="text-secondary text-[10px] font-black mb-1 uppercase tracking-widest">TOTAL CLIENTES</p>
            <h3 className="text-4xl font-black font-headline text-on-surface">
              {filteredContacts.length}
            </h3>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Leads Cadastrados</p>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[8px] font-black text-secondary">
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Leads */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-7 rounded-[32px] shadow-sm border border-outline-variant/5 flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setShowQuickOSModal(true)}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-secondary text-[10px] font-black mb-1 uppercase tracking-widest">OPORTUNIDADES ATIVAS</p>
            <div className="flex items-end gap-4">
              <h3 className="text-4xl font-black font-headline text-on-surface">{activeLeadsCount}</h3>
              <div className="flex items-end gap-1 h-8 pb-1">
                {[40, 70, 50, 90].map((h, i) => (
                  <div key={i} className="w-1.5 bg-primary/20 rounded-t-full" style={{ height: `${h}%` }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className="w-full bg-primary rounded-t-full"
                    ></motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">
              {searchTerm ? 'Resultados filtrados' : 'Em negociação ativa'}
            </p>
          </div>
        </motion.div>

        {/* Total Revenue */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-container-lowest p-7 rounded-[32px] shadow-sm border border-outline-variant/5 flex flex-col justify-between group hover:shadow-xl transition-all"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                Meta: 150k
              </div>
            </div>
            <p className="text-secondary text-[10px] font-black mb-1 uppercase tracking-widest">VOLUME DE SERVIÇO</p>
            <h3 className="text-2xl font-black font-headline text-on-surface">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}
            </h3>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Progresso da Meta</p>
              <span className="text-[10px] font-black text-primary">{((totalPipelineValue / 150000) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalPipelineValue / 150000) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-full bg-emerald-500"
              ></motion.div>
            </div>
          </div>
        </motion.div>

        {/* Open Value */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-container-lowest p-7 rounded-[32px] shadow-sm border border-outline-variant/5 flex flex-col justify-between group hover:shadow-xl transition-all"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="p-2 bg-surface-container-low rounded-xl">
                <Clock className="w-4 h-4 text-secondary/40" />
              </div>
            </div>
            <p className="text-secondary text-[10px] font-black mb-1 uppercase tracking-widest">VALOR EM ABERTO (OS)</p>
            <h3 className="text-2xl font-black font-headline text-on-surface">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOpenValue)}
            </h3>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Soma de todas as OS abertas</p>
          </div>
        </motion.div>
      </div>

      {/* Pipeline Distribution & Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h5 className="font-black font-headline text-lg text-on-surface uppercase tracking-widest">Distribuição do Pipeline</h5>
              <p className="text-xs text-secondary font-medium">Volume de clientes em cada estágio do funil</p>
            </div>
            <div className="p-3 bg-surface-container-lowest/50 rounded-2xl shadow-sm">
              <Insights className="text-primary w-5 h-5" />
            </div>
          </div>
          
          <div className="flex items-end gap-2 md:gap-4 h-48 px-2 md:px-4">
            {stages.map((stage, i) => {
              const count = getContactsByStage(stage).length;
              const height = filteredContacts.length > 0 ? (count / filteredContacts.length) * 100 : 0;
              const colors = [
                'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]',
                'bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.3)]',
                'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]',
                'bg-rose-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]',
                'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
              ];
              
              return (
                <div key={stage} className="flex-1 flex flex-col items-center gap-2 md:gap-4 group">
                  <div className="w-full relative flex flex-col justify-end h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 8)}%` }}
                      transition={{ duration: 1, delay: 0.7 + (i * 0.1) }}
                      className={cn("w-full rounded-2xl transition-all duration-500 relative", colors[i])}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20 pointer-events-none">
                        {count} Leads
                      </div>
                    </motion.div>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-black text-secondary uppercase tracking-tighter text-center leading-tight h-8 flex items-center justify-center whitespace-pre-line break-words w-full">
                    {stage.replace(' ', '\n')}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface-container-highest p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-colors"></div>
          <div>
            <div className="flex items-center justify-between mb-8">
              <h5 className="text-[11px] font-black text-on-surface uppercase tracking-widest">Atividade Recente</h5>
              <Clock className="w-4 h-4 text-secondary/40" />
            </div>
            <div className="space-y-6">
              {[
                { label: 'Nova OS Aberta', time: 'há 2 horas', color: 'bg-blue-500' },
                { label: 'Lead movido para Negociação', time: 'há 5 horas', color: 'bg-purple-500' },
                { label: 'Orçamento Finalizado', time: 'há 1 dia', color: 'bg-emerald-500' }
              ].map((act, i) => (
                <div key={i} className="flex gap-4">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]", act.color)}></div>
                  <div>
                    <p className="text-[12px] text-on-surface font-bold leading-tight">{act.label}</p>
                    <p className="text-[10px] text-secondary font-medium mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onViewChange('pipeline')}
            className="w-full py-4 mt-8 bg-white/50 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl border border-primary/10 hover:bg-primary/5 transition-all shadow-sm"
          >
            Ver Pipeline Completo
          </button>
        </motion.div>
      </div>

      {/* Main Content: Tables & Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Pipeline Activity Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="xl:col-span-2"
        >
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h4 className="text-2xl font-black font-headline text-on-surface">Clientes Recentes</h4>
              <p className="text-xs text-secondary font-medium">Últimos contatos adicionados ao pipeline</p>
            </div>
            <button 
              onClick={() => onViewChange('contacts')}
              className="text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
            >
              Ver Todos
            </button>
          </div>
          
          <div className="bg-surface-container-lowest rounded-[32px] overflow-hidden shadow-sm border border-outline-variant/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-low/30">
                    <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-[0.15em]">Cliente</th>
                    <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-[0.15em]">Empresa</th>
                    <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-[0.15em]">Total Finalizado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-[0.15em]">Status</th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredContacts.slice(0, 6).map((contact) => (
                    <tr 
                      key={contact.id} 
                      onClick={() => onSelectContact(contact)}
                      className="hover:bg-surface-container-low/30 transition-all group cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="relative">
                            {contact.avatar ? (
                              <img src={contact.avatar} className="w-11 h-11 rounded-xl object-cover mr-4 border border-outline-variant/10 shadow-sm" alt={contact.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center font-black text-primary mr-4 border border-outline-variant/10 shadow-sm">
                                {contact.initials}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{contact.name}</p>
                            <p className="text-[10px] text-secondary font-medium uppercase tracking-tighter mt-0.5">{contact.cnpjCpf}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-on-surface-variant font-bold">{contact.address}</p>
                        <div className="flex items-center gap-1 text-secondary mt-0.5">
                          <p className="text-[10px] font-medium">{contact.location}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-on-surface">{getContactFinalizedTotal(contact)}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          contact.status === 'Serviço Concluído' || contact.status === 'Contrato Ativo' ? "bg-emerald-50 text-emerald-600" :
                          contact.status === 'Em Negociação' || contact.status === 'Orçamento Enviado' ? "bg-primary/5 text-primary" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {contact.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredContacts.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-sm text-secondary font-medium">Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Service Orders List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col"
        >
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h4 className="text-2xl font-black font-headline text-on-surface">Ordens de Serviço</h4>
              <p className="text-xs text-secondary font-medium">Atividades e serviços pendentes</p>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickOSModal(true);
              }}
              className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              title="Abrir Nova Ordem de Serviço"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            {filteredServiceOrders.length > 0 ? (
              filteredServiceOrders.slice(0, 6).map((os) => (
                <motion.div 
                  whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  key={os.id} 
                  onClick={() => {
                    const contact = contacts.find(c => c.id === os.contactId);
                    if (contact) onSelectContact(contact);
                  }}
                  className={cn(
                    "p-6 rounded-[24px] border-l-[6px] transition-all cursor-pointer relative group overflow-hidden",
                    os.status === 'Aberta' 
                      ? "bg-surface-container-low border-primary shadow-sm" 
                      : "bg-surface-container-lowest border-outline-variant/30 border shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md",
                      os.status === 'Aberta' ? "bg-primary/10 text-primary" : 
                      os.status === 'Orçamento Aceito' ? "bg-green-500/10 text-green-500" :
                      os.status === 'Orçamento Rejeitado' ? "bg-error-container/20 text-error" :
                      "bg-surface-container-high text-secondary"
                    )}>
                      {os.status}
                    </span>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <h5 className="text-base font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">{os.subject}</h5>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-2 font-medium">{os.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-[9px] font-black text-primary border border-outline-variant/10">
                        {os.contactName?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{os.contactName}</span>
                    </div>
                    <span className="text-xs font-black text-on-surface">{os.value}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-16 text-center bg-surface-container-lowest rounded-[32px] border border-dashed border-outline-variant/30">
                <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-secondary/20" />
                </div>
                <p className="text-xs text-secondary font-bold uppercase tracking-widest">Nenhuma OS encontrada</p>
              </div>
            )}
            
            <button 
              onClick={() => onViewChange('contacts')}
              className="w-full py-4 border-2 border-dashed border-outline-variant/20 rounded-[24px] text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              Ver Todas as Ordens
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
