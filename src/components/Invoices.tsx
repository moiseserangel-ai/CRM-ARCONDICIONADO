import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Download, Trash2, MoreVertical, ExternalLink, AlertCircle } from 'lucide-react';
import { Invoice, User } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface InvoicesProps {
  user: User;
  onAddInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  searchTerm: string;
}

export default function Invoices({ user, onAddInvoice, onEditInvoice, searchTerm }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'Todos' | 'Produto' | 'Serviço'>('Todos');

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
      } else {
        setInvoices(data as Invoice[]);
      }
      setLoading(false);
    };

    fetchInvoices();

    // Set up real-time subscription
    const channel = supabase
      .channel('invoices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `userId=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setInvoices(prev => [payload.new as Invoice, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setInvoices(prev => prev.map(inv => inv.id === payload.new.id ? payload.new as Invoice : inv));
        } else if (payload.eventType === 'DELETE') {
          setInvoices(prev => prev.filter(inv => inv.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta nota fiscal?')) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      (invoice.contactName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.number || '').includes(searchTerm);
    const matchesType = filterType === 'Todos' || invoice.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Emitida': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Cancelada': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Rascunho': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Notas Fiscais</h2>
          <p className="text-secondary font-medium">Gerencie suas emissões de produtos e serviços</p>
        </div>
        <button
          onClick={onAddInvoice}
          className="milled-gradient text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Emitir Nova Nota
        </button>
      </div>

      <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10">
        <button
          onClick={() => setFilterType('Todos')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
            filterType === 'Todos' ? "bg-primary text-white shadow-md" : "text-secondary hover:bg-surface-container-high"
          )}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterType('Produto')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
            filterType === 'Produto' ? "bg-primary text-white shadow-md" : "text-secondary hover:bg-surface-container-high"
          )}
        >
          Produtos (NF-e)
        </button>
        <button
          onClick={() => setFilterType('Serviço')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
            filterType === 'Serviço' ? "bg-primary text-white shadow-md" : "text-secondary hover:bg-surface-container-high"
          )}
        >
          Serviços (NFS-e)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-secondary font-bold text-sm uppercase tracking-widest">Carregando Notas...</p>
          </div>
        ) : filteredInvoices.length > 0 ? (
          filteredInvoices.map((invoice) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={invoice.id}
              className="bg-surface-container-lowest p-6 rounded-[32px] border border-outline-variant/10 hover:shadow-xl transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                    invoice.type === 'Produto' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" : "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
                  )}>
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-on-surface tracking-tight">#{invoice.number}</h3>
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                        {invoice.status}
                      </span>
                      <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest bg-surface-container px-2 py-1 rounded-md">
                        {invoice.type}
                      </span>
                    </div>
                    <p className="text-on-surface font-semibold">{invoice.contactName}</p>
                    <p className="text-secondary text-xs font-medium">Emitida em: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <p className="text-2xl font-black text-primary tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}
                  </p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Valor Total</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onEditInvoice(invoice)}
                    className="p-3 text-secondary hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                    title="Editar"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-3 text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(invoice.id)}
                    className="p-3 text-secondary hover:text-error hover:bg-error/5 rounded-2xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-container-low rounded-[48px] border-2 border-dashed border-outline-variant/20">
            <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-secondary/30" />
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Nenhuma nota fiscal encontrada</h3>
            <p className="text-secondary font-medium mb-8 text-center max-w-xs">
              Você ainda não emitiu nenhuma nota fiscal ou sua busca não retornou resultados.
            </p>
            <button
              onClick={onAddInvoice}
              className="bg-surface-container-highest text-primary px-8 py-3 rounded-2xl font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              Emitir Primeira Nota
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
