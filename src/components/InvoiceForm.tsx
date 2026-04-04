import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Search, User as UserIcon, Package, FileText, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Invoice, InvoiceItem, Contact, Product, User } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface InvoiceFormProps {
  user: User;
  invoice: Invoice | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function InvoiceForm({ user, invoice, onBack, onSuccess }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState<Partial<Invoice>>({
    number: invoice?.number || Math.floor(Math.random() * 100000).toString(),
    series: invoice?.series || '1',
    type: invoice?.type || 'Produto',
    contactId: invoice?.contactId || '',
    contactName: invoice?.contactName || '',
    contactCnpjCpf: invoice?.contactCnpjCpf || '',
    issueDate: invoice?.issueDate || new Date().toISOString().split('T')[0],
    items: invoice?.items || [],
    totalAmount: invoice?.totalAmount || 0,
    status: invoice?.status || 'Rascunho',
    observations: invoice?.observations || ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [contactsRes, productsRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('userId', user.id),
          supabase.from('products').select('*').eq('userId', user.id)
        ]);

        if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
        if (productsRes.data) setProducts(productsRes.data as Product[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [user]);

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    const total = newItems.reduce((acc, item) => acc + item.totalPrice, 0);
    setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
    }
    
    newItems[index] = item;
    const total = newItems.reduce((acc, item) => acc + item.totalPrice, 0);
    setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
  };

  const handleContactChange = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setFormData(prev => ({
        ...prev,
        contactId: contact.id,
        contactName: contact.name,
        contactCnpjCpf: contact.cnpjCpf || ''
      }));
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const price = parseFloat(product.price.replace(/[^\d,]/g, '').replace(',', '.'));
      handleItemChange(index, 'description', product.name);
      handleItemChange(index, 'unitPrice', price);
      handleItemChange(index, 'code', product.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const data = {
        ...formData,
        userId: user.id
      };
      
      delete (data as any).id;
      delete (data as any).createdAt;

      if (invoice) {
        const { error } = await supabase
          .from('invoices')
          .update(data)
          .eq('id', invoice.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert(data);
        
        if (error) throw error;
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-secondary hover:text-primary font-bold transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Notas
        </button>
        <div className="flex items-center gap-4">
          <span className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
            formData.status === 'Emitida' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          )}>
            Status: {formData.status}
          </span>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-10 rounded-[48px] border border-outline-variant/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        
        <form onSubmit={handleSubmit} className="space-y-10 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-outline-variant/10">
            <div>
              <h2 className="text-3xl font-black font-headline tracking-tighter text-on-surface mb-2">
                {invoice ? 'Editar Nota Fiscal' : 'Emitir Nota Fiscal'}
              </h2>
              <p className="text-secondary font-medium">Preencha os dados para emissão do documento fiscal</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Número</label>
                  <input 
                    type="text" 
                    value={formData.number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-bold w-32 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Série</label>
                  <input 
                    type="text" 
                    value={formData.series || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, series: e.target.value }))}
                    className="bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-bold w-20 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Tipo de Nota</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Produto' }))}
                    className={cn(
                      "flex-1 py-3 rounded-2xl font-bold text-sm transition-all border",
                      formData.type === 'Produto' ? "bg-primary text-white border-primary shadow-lg" : "bg-surface-container-low text-secondary border-outline-variant/20 hover:bg-surface-container-high"
                    )}
                  >
                    Produto (NF-e)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Serviço' }))}
                    className={cn(
                      "flex-1 py-3 rounded-2xl font-bold text-sm transition-all border",
                      formData.type === 'Serviço' ? "bg-primary text-white border-primary shadow-lg" : "bg-surface-container-low text-secondary border-outline-variant/20 hover:bg-surface-container-high"
                    )}
                  >
                    Serviço (NFS-e)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Cliente</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                  <select
                    required
                    value={formData.contactId || ''}
                    onChange={(e) => handleContactChange(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-medium"
                  >
                    <option value="">Selecione um cliente</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.name} - {contact.address}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Data de Emissão</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                  <input 
                    type="date" 
                    required
                    value={formData.issueDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">CPF/CNPJ do Cliente</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                  <input 
                    type="text" 
                    value={formData.contactCnpjCpf || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactCnpjCpf: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-on-surface tracking-tight">Itens da Nota</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-primary hover:bg-primary/5 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items?.map((item, index) => (
                <div key={index} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-12 lg:col-span-5 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-secondary ml-1">Descrição / Produto</label>
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-3 py-2 text-xs font-bold w-32 focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          <option value="">Produtos</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          required
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Descrição do item"
                          className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 lg:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-secondary ml-1">Qtd</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center"
                      />
                    </div>
                    <div className="md:col-span-4 lg:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-secondary ml-1">Valor Unit.</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="md:col-span-4 lg:col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-secondary ml-1">Total</label>
                      <div className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-2 text-sm font-black text-primary text-center">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalPrice)}
                      </div>
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center pb-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-secondary hover:text-error hover:bg-error/5 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(!formData.items || formData.items.length === 0) && (
                <div className="text-center py-10 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20">
                  <Package className="w-8 h-8 text-secondary/30 mx-auto mb-3" />
                  <p className="text-secondary text-sm font-medium">Nenhum item adicionado à nota fiscal.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 pt-8 border-t border-outline-variant/10">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Observações</label>
              <textarea 
                rows={4}
                value={formData.observations || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Informações complementares, dados bancários, etc."
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
              ></textarea>
            </div>
            <div className="w-full md:w-72 space-y-6">
              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm font-bold uppercase tracking-widest">Subtotal</span>
                  <span className="text-on-surface font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-primary/10">
                  <span className="text-primary text-lg font-black uppercase tracking-tighter">Total</span>
                  <span className="text-primary text-2xl font-black tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalAmount || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Status da Nota</label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Emitida">Emitida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={onBack}
              className="px-8 py-4 bg-surface-container-high text-secondary rounded-2xl font-bold hover:bg-surface-container-highest transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {invoice ? 'Atualizar Nota' : 'Emitir Nota Fiscal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
