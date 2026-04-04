import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText,
  TrendingUp,
  TrendingDown,
  User as UserIcon
} from 'lucide-react';
import { Transaction, Contact, User } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface FinanceFormProps {
  user: User;
  transaction: Transaction | null;
  onBack: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Produto',
  'Salário',
  'Energia',
  'Serviço',
  'Aluguel',
  'Manutenção',
  'Impostos',
  'Marketing',
  'Outros'
];

export default function FinanceForm({ user, transaction, onBack, onSuccess }: FinanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [formData, setFormData] = useState({
    description: transaction?.description || '',
    amount: transaction?.amount || '',
    type: transaction?.type || 'Saída' as 'Entrada' | 'Saída',
    category: transaction?.category || 'Outros',
    date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    contactId: transaction?.contactId || ''
  });

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('userId', user.id);

      if (error) {
        console.error('Error fetching contacts:', error);
      } else {
        setContacts(data as Contact[]);
      }
    };

    fetchContacts();

    // Set up real-time subscription
    const channel = supabase
      .channel('finance-form-contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `userId=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContacts(prev => prev.map(c => c.id === payload.new.id ? payload.new as Contact : c));
        } else if (payload.eventType === 'DELETE') {
          setContacts(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    const amount = Number(value) / 100;
    setFormData({ ...formData, amount: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount) });
  };

  /*const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const transactionData = {
      ...formData,
      date: new Date(formData.date).toISOString(),
      userId: user.id
    };
    */
//teste finan

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  setLoading(true);

  // --- ADICIONE ESTA LINHA PARA LIMPAR O VALOR ---
  const numericAmount = Number(formData.amount.toString().replace(/\D/g, '')) / 100;

  const transactionData = {
    ...formData,
    amount: numericAmount, // Substitui a string formatada pelo número puro
    date: new Date(formData.date).toISOString(),
    userId: user.id
  };
  
  // O restante do código permanece igual...
  //delete (transactionData as any).id;
  // ...


// fim do teste

    delete (transactionData as any).id;
    delete (transactionData as any).createdAt;
    delete (transactionData as any).isOS;
    delete (transactionData as any).osStatus;

    try {
      if (transaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transaction.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);
        
        if (error) throw error;
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all text-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
              {transaction ? 'Editar Transação' : 'Nova Transação'}
            </h1>
            <p className="text-secondary font-medium">Preencha os dados financeiros abaixo</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Info */}
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm space-y-6">
            <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              Informações Básicas
            </h2>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Descrição</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="text" 
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Pagamento de Energia"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Valor</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="text" 
                  required
                  value={formData.amount || ''}
                  onChange={handleAmountChange}
                  placeholder="R$ 0,00"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="date" 
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-sm space-y-6">
            <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-primary" />
              Classificação
            </h2>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Tipo de Transação</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Entrada' })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 transition-all font-bold",
                    formData.type === 'Entrada' 
                      ? "bg-green-500/10 border-green-500 text-green-500" 
                      : "bg-surface-container-low border-transparent text-secondary hover:bg-surface-container-high"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Saída' })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 transition-all font-bold",
                    formData.type === 'Saída' 
                      ? "bg-red-500/10 border-red-500 text-red-500" 
                      : "bg-surface-container-low border-transparent text-secondary hover:bg-surface-container-high"
                  )}
                >
                  <TrendingDown className="w-4 h-4" />
                  Saída
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Categoria</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <select 
                  required
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Cliente Relacionado (Opcional)</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <select 
                  value={formData.contactId || ''}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">Nenhum cliente</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.address})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={onBack}
            className="px-8 py-4 bg-surface-container-low text-secondary rounded-2xl font-bold hover:bg-surface-container-high transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-10 py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (
              <>
                <Save className="w-5 h-5" />
                {transaction ? 'Atualizar Transação' : 'Salvar Transação'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
