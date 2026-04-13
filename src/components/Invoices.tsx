import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Download, Trash2, MoreVertical, ExternalLink, AlertCircle, Printer, Loader2 } from 'lucide-react';
import { Invoice, User } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateInvoicePDF } from '../lib/pdf-utils';

interface InvoicesProps {
  user: User;
  onAddInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  searchTerm: string;
  companyLogo?: string | null;
  companyName?: string;
}

export default function Invoices({ user, onAddInvoice, onEditInvoice, searchTerm, companyLogo, companyName = 'Cardoso Ar Condicionado' }: InvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'Todos' | 'Produto' | 'Serviço'>('Todos');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        const isRelevant = 
          (payload.new && (payload.new as Invoice).userId === user.id) || 
          (payload.old && (payload.old as Invoice).userId === user.id) ||
          payload.eventType === 'DELETE';
          
        if (isRelevant) {
          if (payload.eventType === 'INSERT') {
            setInvoices(prev => {
              if (prev.some(inv => inv.id === payload.new.id)) return prev;
              return [payload.new as Invoice, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setInvoices(prev => prev.map(inv => inv.id === payload.new.id ? payload.new as Invoice : inv));
          } else if (payload.eventType === 'DELETE') {
            setInvoices(prev => prev.filter(inv => inv.id !== payload.old.id));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDelete = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;
      
      setInvoices(prev => prev.filter(i => i.id !== invoiceToDelete.id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
    } finally {
      setDeleting(false);
      setInvoiceToDelete(null);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      await generateInvoicePDF(invoice, companyLogo, companyName);
    } catch (err) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const logoHtml = companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />` : '';
    
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalPrice)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota Fiscal - ${invoice.number}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .header-left { display: flex; align-items: center; gap: 20px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-weight: bold; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .info-box h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .info-box p { margin: 5px 0; font-size: 14px; }
            .section { margin-bottom: 35px; }
            .section h3 { font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000; }
            .content { font-size: 15px; white-space: pre-wrap; padding: 0 12px; }
            .status-badge { display: inline-block; margin-top: 5px; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #000; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { padding: 8px; border-bottom: 2px solid #000; text-align: left; }
            th.center { text-align: center; }
            th.right { text-align: right; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            tfoot td { padding: 12px 8px; font-weight: bold; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              ${logoHtml}
              <div>
                <h1>Nota Fiscal de ${invoice.type}</h1>
                <p>${companyName}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: bold;">Nº ${invoice.number}</div>
              <div style="font-size: 12px; color: #666;">Série: ${invoice.series}</div>
              <div class="status-badge">${invoice.status}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Dados do Cliente</h3>
              <p><strong>Nome:</strong> ${invoice.contactName}</p>
              <p><strong>CPF/CNPJ:</strong> ${invoice.contactCnpjCpf}</p>
            </div>
            <div class="info-box">
              <h3>Detalhes da Nota</h3>
              <p><strong>Data de Emissão:</strong> ${new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
              <p><strong>Valor Total:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}</p>
            </div>
          </div>

          <div class="section">
            <h3>Itens</h3>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th class="center">Qtd</th>
                  <th class="right">V. Unitário</th>
                  <th class="right">V. Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="right">Total da Nota:</td>
                  <td class="right" style="font-size: 16px;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${invoice.observations ? `
          <div class="section">
            <h3>Observações</h3>
            <div class="content">${invoice.observations}</div>
          </div>
          ` : ''}

          <div style="margin-top: 80px; text-align: center; font-size: 10px; color: #999;">
            <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
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
                    onClick={() => handlePrintInvoice(invoice)}
                    className="p-3 text-secondary hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                    title="Imprimir"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDownloadInvoice(invoice)}
                    className="p-3 text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setInvoiceToDelete(invoice)}
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

      {/* Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Excluir Nota Fiscal?</h3>
            <p className="text-secondary mb-8 leading-relaxed">
              Você está prestes a remover permanentemente a nota fiscal <span className="font-bold text-on-surface">Nº {invoiceToDelete.number}</span>. Esta ação é irreversível e todos os dados associados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-3 bg-surface-container-low text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-error text-white rounded-xl font-bold shadow-lg hover:bg-error/90 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Nota'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
