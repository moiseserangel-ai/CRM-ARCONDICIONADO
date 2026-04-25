import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  PiggyBank,
  Receipt,
  CreditCard,
  BarChart3,
  Clock
} from 'lucide-react';
import { Transaction, Contact, ServiceOrder, User } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FinanceProps {
  user: User;
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  searchTerm: string;
}

export default function Finance({ user, onAddTransaction, onEditTransaction, searchTerm }: FinanceProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'Todos' | 'Entrada' | 'Saída'>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [selectedPeriod, setSelectedPeriod] = useState<'Geral' | 'Mensal' | 'Anual'>('Geral');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };

    const fetchServiceOrders = async () => {
      const { data, error } = await supabase
        .from('serviceOrders')
        .select('*')
        .eq('userId', user.id)
        .in('status', ['Finalizada', 'Orçamento Aceito']);

      if (error) {
        console.error('Error fetching service orders:', error);
      } else {
        setServiceOrders(data as ServiceOrder[]);
      }
    };

    fetchTransactions();
    fetchServiceOrders();

    // Set up real-time subscriptions
    const transChannel = supabase
      .channel('finance-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const isRelevant = 
            (payload.new && (payload.new as Transaction).userId === user.id) || 
            (payload.old && (payload.old as Transaction).userId === user.id) ||
            payload.eventType === 'DELETE';
            
          if (isRelevant) {
            if (payload.eventType === 'INSERT') {
              setTransactions((prev) => {
                if (prev.some(t => t.id === payload.new.id)) return prev;
                return [payload.new as Transaction, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setTransactions((prev) =>
                prev.map((t) => (t.id === payload.new.id ? (payload.new as Transaction) : t))
              );
            } else if (payload.eventType === 'DELETE') {
              setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
            }
          }
        }
      )
      .subscribe();

    const soChannel = supabase
      .channel('finance-so')
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
      supabase.removeChannel(transChannel);
      supabase.removeChannel(soChannel);
    };
  }, [user]);

  const allMovements = useMemo(() => {
    const osMovements: Transaction[] = serviceOrders
      .filter(os => os.status === 'Finalizada' || os.status === 'Orçamento Aceito')
      .map(os => ({
        id: os.id,
        description: `OS: ${os.subject}`,
        amount: os.value,
        type: 'Entrada',
        category: 'Serviço',
        date: os.createdAt,
        userId: os.userId,
        createdAt: os.createdAt,
        isOS: true,
        osStatus: os.status
      } as Transaction));

    return [...transactions, ...osMovements].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, serviceOrders]);

  const categories = useMemo(() => {
    const cats = new Set(allMovements.map(t => t.category));
    return ['Todas', ...Array.from(cats)];
  }, [allMovements]);

  const periodMovements = useMemo(() => {
    return allMovements.filter(t => {
      const transDate = new Date(t.date);
      let matchesPeriod = true;
      if (selectedPeriod === 'Mensal') {
        matchesPeriod = transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
      } else if (selectedPeriod === 'Anual') {
        matchesPeriod = transDate.getFullYear() === currentYear;
      }
      return matchesPeriod;
    });
  }, [allMovements, selectedPeriod, currentMonth, currentYear]);

  const filteredTransactions = useMemo(() => {
    return periodMovements.filter(t => {
      const matchesSearch = (t.description || '').toLowerCase().includes(localSearchTerm.toLowerCase()) ||
                          (t.category || '').toLowerCase().includes(localSearchTerm.toLowerCase());
      const matchesType = filterType === 'Todos' || t.type === filterType;
      const matchesCategory = filterCategory === 'Todas' || t.category === filterCategory;
      const isNotOS = !t.isOS;

      return matchesSearch && matchesType && matchesCategory && isNotOS;
    });
  }, [periodMovements, localSearchTerm, filterType, filterCategory]);

  const stats = useMemo(() => {
    const income = periodMovements
      .filter(t => t.type === 'Entrada')
      .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
    
    const expenses = periodMovements
      .filter(t => t.type === 'Saída')
      .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
    
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [periodMovements]);

  const annualStats = useMemo(() => {
    const yearIncome = allMovements
      .filter(t => t.type === 'Entrada' && new Date(t.date).getFullYear() === currentYear)
      .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
    
    const yearExpenses = allMovements
      .filter(t => t.type === 'Saída' && new Date(t.date).getFullYear() === currentYear)
      .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
    
    return {
      income: yearIncome,
      expenses: yearExpenses,
      balance: yearIncome - yearExpenses
    };
  }, [allMovements, currentYear]);

  function parseCurrency(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    // Remove everything except digits and the decimal comma
    const cleanValue = value.replace(/[^0-9,]+/g, "").replace(",", ".");
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id);
      if (error) throw error;
      
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setDeleting(false);
      setTransactionToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-secondary font-black text-[10px] uppercase tracking-widest">Sincronizando Finanças...</p>
      </div>
    );
  }

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Financial Intelligence</span>
          </div>
          <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface">Gestão Financeira</h2>
          <p className="text-secondary font-body text-sm max-w-md">Controle o fluxo de caixa, acompanhe lucros e gerencie despesas operacionais.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/10 rounded-2xl p-1 flex">
            {(['Geral', 'Mensal', 'Anual'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedPeriod === period 
                    ? "bg-surface-container-lowest text-primary shadow-sm" 
                    : "text-secondary hover:text-on-surface"
                )}
              >
                {period}
              </button>
            ))}
          </div>
          
          <button 
            onClick={onAddTransaction}
            className="flex items-center gap-2 px-6 py-3.5 milled-gradient text-white font-headline font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Period Selectors (Conditional) */}
      {(selectedPeriod === 'Mensal' || selectedPeriod === 'Anual') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-4 bg-surface-container-low/30 p-4 rounded-2xl border border-outline-variant/10"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">Selecionar Período:</span>
          </div>
          
          {selectedPeriod === 'Mensal' && (
            <select 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
          )}

          <select 
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {Array.from({ length: 26 }, (_, i) => 2015 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/5 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-7 h-7 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Entradas</span>
          </div>
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 relative z-10">
            {selectedPeriod === 'Geral' ? 'Total histórico' : 
             selectedPeriod === 'Mensal' ? `Total em ${months[currentMonth]}` : `Total em ${currentYear}`}
          </p>
          <h3 className="text-3xl font-headline font-black text-on-surface relative z-10">{formatCurrency(stats.income)}</h3>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 relative z-10">
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Fluxo Positivo</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/5 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-rose-500/10 transition-all" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingDown className="w-7 h-7 text-rose-600" />
            </div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">Saídas</span>
          </div>
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 relative z-10">
            {selectedPeriod === 'Geral' ? 'Total histórico' : 
             selectedPeriod === 'Mensal' ? `Gasto em ${months[currentMonth]}` : `Gasto em ${currentYear}`}
          </p>
          <h3 className="text-3xl font-headline font-black text-on-surface relative z-10">{formatCurrency(stats.expenses)}</h3>
          <div className="mt-6 flex items-center gap-2 text-rose-600 relative z-10">
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Despesas Operacionais</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/5 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden"
        >
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl transition-all",
            stats.balance >= 0 ? "bg-primary/5 group-hover:bg-primary/10" : "bg-rose-500/5 group-hover:bg-rose-500/10"
          )} />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
              stats.balance >= 0 ? "bg-primary/5" : "bg-rose-50"
            )}>
              <Wallet className={cn("w-7 h-7", stats.balance >= 0 ? "text-primary" : "text-rose-600")} />
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
              stats.balance >= 0 ? "text-primary bg-primary/5" : "text-rose-600 bg-rose-50"
            )}>Saldo Período</span>
          </div>
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 relative z-10">Balanço Consolidado</p>
          <h3 className="text-3xl font-headline font-black text-on-surface relative z-10">{formatCurrency(stats.balance)}</h3>
          <div className="mt-6 flex items-center gap-2 relative z-10">
            <div className={cn("w-2 h-2 rounded-full", stats.balance >= 0 ? "bg-primary" : "bg-rose-500")} />
            <span className={cn("text-[10px] font-black uppercase tracking-tighter", stats.balance >= 0 ? "text-primary" : "text-rose-600")}>
              {stats.balance >= 0 ? 'Resultado Positivo' : 'Resultado Negativo'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Annual Summary Dashboard (Only if Anual is selected) */}
      {selectedPeriod === 'Anual' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-8"
        >
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-headline font-black text-on-surface">Desempenho Mensal</h4>
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">{currentYear}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-5">
              {months.map((month, index) => {
                const monthMovements = allMovements.filter(t => {
                  const d = new Date(t.date);
                  return d.getMonth() === index && d.getFullYear() === currentYear;
                });
                const monthIncome = monthMovements
                  .filter(t => t.type === 'Entrada')
                  .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
                const monthExpenses = monthMovements
                  .filter(t => t.type === 'Saída')
                  .reduce((acc, t) => acc + parseCurrency(t.amount), 0);
                const monthBalance = monthIncome - monthExpenses;
                
                const maxVal = Math.max(...months.map((_, i) => {
                  const m = allMovements.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === i && d.getFullYear() === currentYear;
                  });
                  return m.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + parseCurrency(t.amount), 0);
                }), 1);

                return (
                  <div key={month} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-secondary uppercase tracking-tighter">{month}</span>
                      <span className={cn("text-[11px] font-black", monthBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(monthBalance)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-container-low rounded-full overflow-hidden flex relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(monthIncome / maxVal) * 100}%` }}
                        className="h-full bg-primary transition-all duration-500 relative z-10" 
                      />
                      <div className="absolute inset-0 bg-surface-container-high/30" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-primary p-10 rounded-[40px] shadow-2xl text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-surface-container-lowest/10 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-white/15 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 opacity-70">
                <PiggyBank className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Resumo Anual Consolidado</span>
              </div>
              <h4 className="text-xl font-headline font-bold mb-1 opacity-80">Balanço de {currentYear}</h4>
              <h2 className="text-6xl font-headline font-black mb-10 tracking-tighter">{formatCurrency(annualStats.balance)}</h2>
              
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <ArrowUpRight className="w-3 h-3" /> Total Entradas
                  </p>
                  <p className="text-2xl font-headline font-black text-emerald-300">{formatCurrency(annualStats.income)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <ArrowDownRight className="w-3 h-3" /> Total Saídas
                  </p>
                  <p className="text-2xl font-headline font-black text-rose-300">{formatCurrency(annualStats.expenses)}</p>
                </div>
              </div>
            </div>
            
            <div className="relative z-10 mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Margem Bruta</p>
                <p className="text-lg font-black">
                  {((annualStats.income / (annualStats.income + annualStats.expenses || 1)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters & Table */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-outline-variant/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-surface-container-low/20">
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-surface-container-low p-1 rounded-2xl flex border border-outline-variant/10">
              {(['Todos', 'Entrada', 'Saída'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === type 
                      ? "bg-surface-container-lowest text-primary shadow-sm" 
                      : "text-secondary hover:text-on-surface"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none bg-surface-container-low border border-outline-variant/10 rounded-2xl pl-5 pr-10 py-2.5 text-[10px] font-black text-secondary uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Buscar transação..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all"
              />
            </div>
            <button className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all text-secondary hover:text-primary border border-outline-variant/10">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Data</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Descrição</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Categoria</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary">Valor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              <AnimatePresence mode="popLayout">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={t.id} 
                      className="hover:bg-surface-container-low/20 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                            t.type === 'Entrada' ? "bg-emerald-50" : "bg-rose-50"
                          )}>
                            {t.type === 'Entrada' ? (
                              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-rose-600" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-on-surface">
                              {new Date(t.date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter">
                              {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-on-surface group-hover:text-primary transition-colors">{t.description}</span>
                          {t.isOS && t.osStatus && (
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                t.osStatus === 'Orçamento Aceito' || t.osStatus === 'Finalizada' ? "bg-emerald-500" : "bg-secondary/40"
                              )} />
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                t.osStatus === 'Orçamento Aceito' || t.osStatus === 'Finalizada' 
                                  ? "text-emerald-600" 
                                  : "text-secondary"
                              )}>
                                {t.osStatus}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 bg-surface-container-low text-secondary text-[9px] font-black uppercase tracking-widest rounded-full border border-outline-variant/10">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-base font-black font-headline",
                            t.type === 'Entrada' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === 'Entrada' ? '+' : '-'} {typeof t.amount === 'number' ? formatCurrency(t.amount) : t.amount}
                          </span>
                          <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter">Liquidado</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {!(t as any).isOS ? (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTransaction(t);
                                }}
                                className="p-2.5 hover:bg-primary/10 rounded-xl transition-all text-primary"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransactionToDelete(t);
                                }}
                                className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-all text-rose-500"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-xl border border-outline-variant/10">
                              <Clock className="w-3.5 h-3.5 text-secondary/60" />
                              <span className="text-[9px] font-black text-secondary/60 uppercase tracking-widest">
                                Automático (OS)
                              </span>
                            </div>
                          )}
                          <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-5">
                        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center border border-dashed border-outline-variant/20">
                          <AlertCircle className="w-10 h-10 text-secondary/20" />
                        </div>
                        <div>
                          <p className="text-lg font-headline font-black text-on-surface">Nenhuma transação encontrada</p>
                          <p className="text-sm text-secondary font-medium">Tente ajustar seus filtros ou adicione uma nova transação.</p>
                        </div>
                        <button 
                          onClick={onAddTransaction}
                          className="px-8 py-3 bg-primary/10 text-primary font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-primary/20 transition-all"
                        >
                          Lançar Primeira Transação
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary Section */}
      <section className="pt-12 pb-20 border-t border-outline-variant/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-black text-on-surface">Resumo de Ativos</h3>
            <p className="text-xs text-secondary font-medium">Projeção financeira baseada no fluxo atual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-[32px] shadow-sm border border-outline-variant/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Receipt className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+4.2%</span>
            </div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Ticket Médio</p>
            <h4 className="text-2xl font-headline font-black text-on-surface">
              {formatCurrency(stats.income / (periodMovements.filter(t => t.type === 'Entrada').length || 1))}
            </h4>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-[32px] shadow-sm border border-outline-variant/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <CreditCard className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">-2.1%</span>
            </div>
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Custo Operacional</p>
            <h4 className="text-2xl font-headline font-black text-on-surface">
              {formatCurrency(stats.expenses / (periodMovements.filter(t => t.type === 'Saída').length || 1))}
            </h4>
          </div>

          <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Saúde Financeira</span>
              <span className="text-[10px] font-black text-primary">Excelente</span>
            </div>
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[85%]" />
            </div>
          </div>

          <div className="bg-surface-container-highest p-6 rounded-[32px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[11px] font-black text-on-surface uppercase tracking-widest">Próxima Meta</h5>
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xs text-secondary font-medium leading-tight mb-4">Atingir R$ 50k em faturamento mensal.</p>
            <button className="w-full py-2.5 bg-white/50 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/10 hover:bg-primary/5 transition-all">Ver Metas</button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Excluir Transação?</h3>
            <p className="text-secondary mb-8 leading-relaxed">
              Você está prestes a remover permanentemente a transação <span className="font-bold text-on-surface">{transactionToDelete.description}</span>. Esta ação é irreversível e afetará o saldo.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 py-3 bg-surface-container-low text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Transação'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
