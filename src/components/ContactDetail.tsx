import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Mail, Call, LocationOn, TrendingUp, Videocam, Handshake, Psychology, CheckCircle, Warning, Lightbulb, Add, SmartToy, EditNote, Filter, Calendar, Trash2, Loader2, FileText, Printer, Download, X as CloseIcon, Clock, ShieldCheck, Package, PlusCircle, Briefcase, DollarSign, ArrowRight, CheckCircle2 } from './Icons';
import { generateOSPDF } from '../lib/pdf-utils';
import { Contact, View, ServiceOrder, Product, UsedProduct, User } from '../types';
import { cn } from '../lib/utils';
import { supabase, createNotification } from '../lib/supabase';

interface ContactDetailProps {
  user: User;
  contact: Contact;
  onBack: () => void;
  onEdit: () => void;
  onViewChange: (view: View) => void;
  companyLogo?: string | null;
  companyName?: string;
}

export default function ContactDetail({ user, contact, onBack, onEdit, onViewChange, companyLogo, companyName = 'Cardoso Ar Condicionado' }: ContactDetailProps) {
  const [deleting, setDeleting] = useState(false);
  const [savingOS, setSavingOS] = useState(false);
  const [finalizingOS, setFinalizingOS] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [expandedOSId, setExpandedOSId] = useState<string | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOS, setLoadingOS] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro'>('geral');
  const [osStatusFilter, setOsStatusFilter] = useState<string>('Todos');
  const [osDateFilter, setOsDateFilter] = useState<string>('');
  
  const filteredServiceOrders = serviceOrders.filter(os => {
    const matchesStatus = osStatusFilter === 'Todos' || os.status === osStatusFilter;
    const matchesDate = !osDateFilter || os.createdAt.startsWith(osDateFilter);
    return matchesStatus && matchesDate;
  });

  const openOSValue = serviceOrders
    .filter(os => os.status === 'Aberta')
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      return acc + (parseInt(digits) || 0) / 100;
    }, 0);

  const closedOSValue = serviceOrders
    .filter(os => os.status === 'Finalizada' || os.status === 'Orçamento Aceito')
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      return acc + (parseInt(digits) || 0) / 100;
    }, 0);

  const formattedOpenValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(openOSValue);

  const formattedClosedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(closedOSValue);

  const handleRecalculateFinance = async () => {
    if (!user) return;
    setRecalculating(true);
    try {
      const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(closedOSValue);
      
      const { error } = await supabase
        .from('contacts')
        .update({ portfolioValue: formattedValue })
        .eq('id', contact.id);

      if (error) throw error;
      alert('Valores financeiros recalculados com sucesso!');
    } catch (err) {
      console.error('Error recalculating finance:', err);
    } finally {
      setRecalculating(false);
    }
  };

  // OS Form State
  const [osData, setOsData] = useState({
    subject: '',
    description: '',
    materials: '',
    value: 'R$ 0,00'
  });

  const [finalizeData, setFinalizeData] = useState<{
    materials: string;
    finalizationNotes: string;
    usedProducts: UsedProduct[];
  }>({
    materials: '',
    finalizationNotes: '',
    usedProducts: []
  });

  const getProductStock = (p: Product) => {
    if (p.stock_quantity !== undefined && p.stock_quantity !== null) return p.stock_quantity;
    if (p.sku) {
      try {
        const skuData = JSON.parse(p.sku);
        if (skuData.stock !== undefined) return skuData.stock;
        if (skuData.stock_quantity !== undefined) return skuData.stock_quantity;
      } catch (e) {
        // Ignore
      }
    }
    return 0;
  };

  const getProductUnit = (p: Product) => {
    if (p.unit !== undefined && p.unit !== null) return p.unit;
    if (p.sku) {
      try {
        const skuData = JSON.parse(p.sku);
        if (skuData.unit !== undefined) return skuData.unit;
      } catch (e) {
        // Ignore
      }
    }
    return 'un';
  };

  const handleDownloadPDFFromForm = async () => {
    if (!osData.subject || !osData.description) {
      alert('Preencha o assunto e a descrição para gerar o PDF.');
      return;
    }
    
    const tempOS: ServiceOrder = {
      id: 'TEMP-' + Date.now(),
      contactId: contact.id,
      contactName: contact.name,
      subject: osData.subject,
      description: osData.description,
      materials: '',
      value: osData.value,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'Aberta'
    };

    try {
      await generateOSPDF(tempOS, contact, companyLogo, companyName);
    } catch (err) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handlePrint = () => {
    if (!osData.subject || !osData.description) {
      alert('Preencha o assunto e a descrição para imprimir.');
      return;
    }
    
    // Create a temporary OS object for printing
    const tempOS: ServiceOrder = {
      id: 'TEMP-' + Date.now(),
      contactId: contact.id,
      contactName: contact.name,
      subject: osData.subject,
      description: osData.description,
      materials: osData.materials || '',
      value: osData.value,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'Aberta'
    };
    
    handlePrintExistingOS(tempOS);
  };

  const handleSaveOS = async () => {
    if (!user) return;
    if (!osData.subject || !osData.description) {
      alert('Por favor, preencha o assunto e a descrição do serviço.');
      return;
    }

    setSavingOS(true);
    try {
      const payload = {
        contactId: contact.id,
        contactName: contact.name,
        subject: osData.subject,
        description: osData.description,
        materials: '', // Materials will be added on finalization
        value: osData.value,
        status: 'Aberta',
        userId: user.id
      };
      
      const { error: osError } = await supabase.from('serviceOrders').insert(payload);

      if (osError) throw osError;

      // Update Contact Status based on subject to move it in the Pipeline
      let newStatus = contact.status;
      const subjectLower = osData.subject.toLowerCase();
      
      if (subjectLower.includes('visita técnica')) {
        newStatus = 'Visita Técnica Agendada';
      } else if (subjectLower.includes('orçamento')) {
        newStatus = 'Orçamento Enviado';
      } else if (subjectLower.includes('instalação')) {
        newStatus = 'Instalação Pendente';
      } else {
        // Default to Visita Técnica if it's an open OS but doesn't match other categories
        // to ensure it appears in the Pipeline
        if (contact.status === 'Serviço Concluído' || contact.status === 'Contrato Ativo') {
          newStatus = 'Visita Técnica Agendada';
        }
      }

      if (newStatus !== contact.status) {
        const { error: contactError } = await supabase
          .from('contacts')
          .update({ status: newStatus })
          .eq('id', contact.id);
        
        if (contactError) throw contactError;
      }

      await createNotification(
        user.id,
        'Nova OS Aberta',
        `Uma nova Ordem de Serviço foi aberta para ${contact.name}: "${osData.subject}".`,
        'os'
      );

      setShowOSModal(false);
      setOsData({ subject: '', description: '', materials: '', value: 'R$ 0,00' });
      alert('Ordem de Serviço aberta com sucesso!');
    } catch (err: any) {
      console.error('Error saving OS:', err);
      alert('Erro ao salvar OS: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setSavingOS(false);
    }
  };

  const handleFinalizeOS = async (finalStatus: 'Orçamento Aceito' | 'Orçamento Rejeitado' | 'Finalizada') => {
    if (!user || !selectedOS) return;
    if (finalStatus !== 'Orçamento Rejeitado' && (!finalizeData.materials || !finalizeData.finalizationNotes)) {
      alert('Por favor, descreva os materiais utilizados e o que foi realizado na finalização.');
      return;
    }

    setFinalizingOS(true);
    try {
      const { error: osError } = await supabase
        .from('serviceOrders')
        .update({
          materials: finalizeData.materials,
          finalizationNotes: finalizeData.finalizationNotes,
          usedProducts: finalizeData.usedProducts,
          status: finalStatus
        })
        .eq('id', selectedOS.id);
      
      if (osError) throw osError;

      // Deduct stock if OS is finalized or accepted
      if (finalStatus === 'Finalizada' || finalStatus === 'Orçamento Aceito') {
        for (const usedProd of finalizeData.usedProducts) {
          const currentProduct = products.find(p => p.id === usedProd.productId);
          if (currentProduct) {
            const currentStock = getProductStock(currentProduct);
            const newStock = Math.max(0, currentStock - usedProd.quantity);
            
            // Update both stock_quantity and sku to ensure backward compatibility
            let newSku = currentProduct.sku;
            try {
              const skuData = currentProduct.sku ? JSON.parse(currentProduct.sku) : {};
              skuData.stock = newStock;
              skuData.stock_quantity = newStock;
              newSku = JSON.stringify(skuData);
            } catch (e) {
              newSku = JSON.stringify({ stock: newStock, stock_quantity: newStock, unit: getProductUnit(currentProduct) });
            }

            const { error: prodError } = await supabase
              .from('products')
              .update({
                stock_quantity: newStock,
                sku: newSku
              })
              .eq('id', usedProd.productId);
            
            if (prodError) throw prodError;
          }
        }
      }

      // Calculate new portfolio value based on ALL finalized OS including this one (if accepted or finalized)
      const finalizedOrders = serviceOrders.filter(os => 
        os.id !== selectedOS.id && (os.status === 'Finalizada' || os.status === 'Orçamento Aceito')
      );
      
      let totalFinalizedValue = finalizedOrders.reduce((acc, os) => {
        const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
        return acc + (parseInt(digits) || 0) / 100;
      }, 0);

      // Add current OS if accepted or finalized
      if (finalStatus === 'Orçamento Aceito' || finalStatus === 'Finalizada') {
        const digits = (selectedOS.value || 'R$ 0,00').replace(/[^0-9]/g, '');
        totalFinalizedValue += (parseInt(digits) || 0) / 100;
      }
      
      const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFinalizedValue);

      // Check if there are other open OS
      const otherOpenOS = serviceOrders.filter(os => os.id !== selectedOS.id && os.status === 'Aberta');
      
      let newStatus = contact.status;
      if (otherOpenOS.length === 0) {
        newStatus = 'Serviço Concluído';
      }

      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          status: newStatus,
          portfolioValue: formattedValue
        })
        .eq('id', contact.id);
      
      if (contactError) throw contactError;

      await createNotification(
        user.id,
        'OS Finalizada',
        `A Ordem de Serviço "${selectedOS.subject}" para ${contact.name} foi marcada como ${finalStatus}.`,
        'os'
      );

      setShowFinalizeModal(false);
      setSelectedOS(null);
      setFinalizeData({ materials: '', finalizationNotes: '', usedProducts: [] });
      
      let successMessage = 'OS finalizada com sucesso!';
      if (finalStatus === 'Orçamento Aceito') successMessage = 'Orçamento aceito e OS finalizada!';
      else if (finalStatus === 'Orçamento Rejeitado') successMessage = 'Orçamento rejeitado e OS encerrada.';
      
      alert(successMessage);
    } catch (err) {
      console.error('Error finalizing OS:', err);
    } finally {
      setFinalizingOS(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchServiceOrders = async () => {
      const { data, error } = await supabase
        .from('serviceOrders')
        .select('*')
        .eq('contactId', contact.id)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching service orders:', error);
      } else {
        setServiceOrders(data as ServiceOrder[]);
        setLoadingOS(false);
      }
    };

    fetchServiceOrders();

    const channel = supabase
      .channel('serviceOrders_contact_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'serviceOrders',
          filter: `contactId=eq.${contact.id}`
        },
        () => {
          fetchServiceOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contact.id]);

  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('userId', user.id);

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data as Product[]);
      }
    };

    fetchProducts();

    const channel = supabase
      .channel('products_detail_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `userId=eq.${user.id}`
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDownloadPDF = async (os: ServiceOrder) => {
    try {
      await generateOSPDF(os, contact, companyLogo, companyName);
    } catch (err) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handlePrintExistingOS = (os: ServiceOrder) => {
    const logoHtml = companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço - ${contact.name || 'Cliente'}</title>
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
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #000; }
            .footer { margin-top: 80px; }
            .signatures { display: flex; justify-content: space-between; gap: 50px; margin-top: 60px; }
            .sig-box { flex: 1; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; text-transform: uppercase; }
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
                <h1>Ordem de Serviço</h1>
                <p>${companyName}</p>
              </div>
            </div>
            <div class="status-badge">${os.status}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Dados do Cliente</h3>
              <p><strong>Nome:</strong> ${contact.name || 'Cliente'}</p>
              <p><strong>Endereço:</strong> ${contact.address}</p>
              <p><strong>Telefone:</strong> ${contact.phone}</p>
            </div>
            <div class="info-box">
              <h3>Detalhes da OS</h3>
              <p><strong>ID:</strong> ${os.id?.substring(0, 8).toUpperCase() || 'OS'}</p>
              <p><strong>Data:</strong> ${new Date(os.createdAt).toLocaleDateString('pt-BR')}</p>
              <p><strong>Assunto:</strong> ${os.subject}</p>
              <p><strong>Valor:</strong> ${os.value || 'R$ 0,00'}</p>
            </div>
          </div>

          <div class="section">
            <h3>Descrição do Serviço</h3>
            <div class="content">${os.description}</div>
          </div>

          ${os.finalizationNotes ? `
          <div class="section">
            <h3>Relatório de Finalização</h3>
            <div class="content">${os.finalizationNotes}</div>
          </div>
          ` : ''}

          <div class="section">
            <h3>Materiais Utilizados</h3>
            <div class="content">${os.materials || 'Nenhum material registrado.'}</div>
          </div>

          <div class="footer">
            <div class="signatures">
              <div class="sig-box">Assinatura do Técnico</div>
              <div class="sig-box">Assinatura do Cliente</div>
            </div>
            <p style="text-align: center; font-size: 10px; color: #999; margin-top: 40px;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              // Close the window if it was opened via window.open
              if (window.name === 'print_os') {
                setTimeout(() => window.close(), 500);
              }
            };
          </script>
        </body>
      </html>
    `;

    // Try window.open first as it's often more reliable for printing complex HTML
    const printWindow = window.open('', 'print_os', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      // Fallback to iframe if popup is blocked
      const printFrame = document.createElement('iframe');
      printFrame.style.visibility = 'hidden';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          document.body.removeChild(printFrame);
        }, 1000);
      }
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id);

      if (error) throw error;
      onBack();
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="w-16 h-16 bg-error-container/20 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-error" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Encerrar Relacionamento?</h3>
            <p className="text-secondary mb-8 leading-relaxed">
              Você está prestes a remover permanentemente o dossiê de <span className="font-bold text-on-surface">{contact.name}</span>. Esta ação é irreversível e todos os dados associados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-surface-container-low text-secondary rounded-xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-error text-white rounded-xl font-bold shadow-lg hover:bg-error/90 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <button onClick={onBack} className="text-secondary hover:text-primary transition-colors">Cadastro de Cliente</button>
          <ChevronRight className="w-4 h-4 text-outline-variant" />
          <span className="text-on-surface">{contact.name}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowOSModal(true)}
            className="px-6 py-3 milled-gradient text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Abrir OS
          </button>
          <button 
            onClick={onEdit}
            className="px-6 py-3 bg-surface-container-low text-secondary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-container-high transition-all border border-outline-variant/10 flex items-center gap-2"
          >
            <EditNote className="w-4 h-4" />
            Editar Perfil
          </button>
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            className="px-6 py-3 bg-error-container/10 text-error rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-error-container/20 transition-all border border-error/10 flex items-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Encerrar
          </button>
        </div>
      </div>

      {/* Bento Layout Header */}
      <div className="grid grid-cols-12 gap-8">
        {/* Main Identity Card */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-[40px] p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-10 group border border-outline-variant/5">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative">
              {contact.avatar ? (
                <img src={contact.avatar} className="w-32 h-32 rounded-[32px] border-4 border-surface shadow-xl object-cover" alt={contact.name} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-32 h-32 rounded-[32px] border-4 border-surface shadow-xl bg-surface-container-highest flex items-center justify-center text-4xl font-black text-primary">
                  {contact.initials}
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-surface-container-lowest rounded-full shadow-lg"></span>
            </div>
            <div className="text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-3">
                <h2 className="text-4xl font-black font-headline tracking-tight text-on-surface">{contact.name}</h2>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Enterprise</span>
              </div>
              <p className="text-lg text-secondary font-medium mb-6">
                {contact.cnpjCpf} • 
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address || contact.location || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-black hover:underline transition-all"
                  title="Ver no Google Maps"
                >
                  {contact.address}
                </a>
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-6">
                <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                  <Mail className="w-4 h-4 text-primary/60" />
                  {contact.email}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                  <Call className="w-4 h-4 text-primary/60" />
                  {contact.phone}
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address || contact.location || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors"
                  title="Ver no Google Maps"
                >
                  <LocationOn className="w-4 h-4 text-primary/60" />
                  {contact.location}
                </a>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-surface-container rounded-full opacity-30 group-hover:scale-110 transition-transform duration-700"></div>
        </div>

        {/* Relationship Score */}
        <div className="col-span-12 lg:col-span-4 milled-gradient text-white rounded-[40px] p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-80">Relationship Score</p>
            <h3 className="text-8xl font-black font-headline leading-none mb-4">94</h3>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">+12% este mês</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
        </div>
      </div>

      {/* Body Section */}
      <div className="flex gap-10 border-b border-outline-variant/10 mb-8 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveTab('geral')}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
            activeTab === 'geral' ? "text-primary" : "text-secondary hover:text-on-surface"
          )}
        >
          Visão Geral
          {activeTab === 'geral' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('financeiro')}
          className={cn(
            "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
            activeTab === 'financeiro' ? "text-primary" : "text-secondary hover:text-on-surface"
          )}
        >
          Financeiro & OS
          {activeTab === 'financeiro' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {activeTab === 'geral' ? (
          <>
            {/* Timeline & Notes */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              {/* Technical Specs Section */}
              <section className="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm border border-outline-variant/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
                    <SmartToy className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black font-headline text-on-surface">Especificações Técnicas</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Equipamento', value: contact.equipmentType },
                    { label: 'Marca', value: contact.equipmentBrand },
                    { label: 'Modelo', value: contact.equipmentModel },
                    { label: 'Quantidade', value: contact.equipmentQuantity },
                    { label: 'Capacidade', value: contact.btus ? `${contact.btus} BTUs` : null },
                    { label: 'Última Manutenção', value: contact.lastMaintenanceDate ? new Date(contact.lastMaintenanceDate).toLocaleDateString('pt-BR') : null },
                    { label: 'Próxima Manutenção', value: contact.nextMaintenanceDate ? new Date(contact.nextMaintenanceDate).toLocaleDateString('pt-BR') : null, highlight: true },
                    { label: 'Data de Instalação', value: contact.installationDate ? new Date(contact.installationDate).toLocaleDateString('pt-BR') : null },
                    { label: 'Data de Nascimento', value: contact.birthDate ? new Date(contact.birthDate).toLocaleDateString('pt-BR') : null },
                  ].map((spec, i) => (
                    <div key={i} className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/5">
                      <p className="text-[9px] font-black text-secondary/60 uppercase tracking-[0.2em] mb-1.5">{spec.label}</p>
                      <p className={cn("text-sm font-bold", spec.highlight ? "text-primary" : "text-on-surface")}>
                        {spec.value || 'Não informado'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-container-lowest rounded-[32px] p-8 shadow-sm border border-outline-variant/5">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-secondary/5 rounded-xl text-secondary">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Histórico de Interações</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-3 rounded-xl bg-surface-container-low text-secondary hover:bg-surface-container-high transition-all">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative pl-10">
                  <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-outline-variant/20"></div>
                  
                  <div className="relative mb-12 group">
                    <div className="absolute -left-[41px] top-0 w-12 h-12 rounded-2xl bg-white border border-outline-variant/10 shadow-sm flex items-center justify-center z-10 group-hover:scale-110 group-hover:border-primary/30 transition-all">
                      <Videocam className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-on-surface mb-1">Visita Técnica: Avaliação de Sistema VRF</p>
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-4">Hoje às 11:30 • Técnico Moises</p>
                        <div className="bg-surface-container-low/60 p-5 rounded-2xl border border-outline-variant/10 text-sm leading-relaxed text-on-surface-variant max-w-2xl">
                          Realizada avaliação completa do condensador. Identificada necessidade de limpeza química e troca de filtros. Cliente aprovou o orçamento verbalmente.
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">Prioridade Alta</span>
                    </div>
                  </div>

                  <div className="relative mb-12 group">
                    <div className="absolute -left-[41px] top-0 w-12 h-12 rounded-2xl bg-white border border-outline-variant/10 shadow-sm flex items-center justify-center z-10">
                      <Mail className="w-6 h-6 text-secondary/60" />
                    </div>
                    <div>
                      <p className="text-base font-black text-on-surface mb-1">Envio de Orçamento: Manutenção Preventiva</p>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">24 Out, 2023 • Sistema Automático</p>
                      <p className="text-sm text-on-surface-variant">Orçamento #8821 enviado para o e-mail do cliente. Aguardando confirmação para agendamento.</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute -left-[41px] top-0 w-12 h-12 rounded-2xl bg-white border border-outline-variant/10 shadow-sm flex items-center justify-center z-10">
                      <Handshake className="w-6 h-6 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-base font-black text-on-surface mb-1">Fechamento de Contrato Anual</p>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">12 Out, 2023 • Gestão Comercial</p>
                      <p className="text-sm text-on-surface-variant">Contrato de manutenção preventiva anual assinado. Cobertura para 5 unidades evaporadoras.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-tertiary/5 rounded-xl text-tertiary">
                      <EditNote className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Notas Estratégicas</h3>
                  </div>
                  <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline">
                    <Add className="w-4 h-4" />
                    Nova Nota
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-container-high/40 p-8 rounded-[32px] border-l-8 border-tertiary shadow-sm">
                    <p className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-3">Insight Crítico</p>
                    <p className="text-sm leading-relaxed text-on-surface font-bold">Cliente extremamente exigente com horários. Prefere atendimentos antes das 09:00 ou após as 18:00.</p>
                    <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                      <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Adicionado por Alex S.</p>
                      <p className="text-[9px] font-bold text-secondary/60">2 dias atrás</p>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/5 shadow-sm">
                    <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] mb-3">Detalhe Pessoal</p>
                    <p className="text-sm leading-relaxed text-on-surface font-bold">Possui pets no local. Necessário cuidado redobrado com as portas durante a manutenção.</p>
                    <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                      <p className="text-[9px] font-black text-secondary uppercase tracking-widest">Adicionado por Sarah M.</p>
                      <p className="text-[9px] font-bold text-secondary/60">1 semana atrás</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar for Geral */}
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <section className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10 relative overflow-hidden shadow-sm">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
                      <Psychology className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-black font-headline uppercase tracking-[0.2em] text-on-surface">Análise de IA Cardoso</h3>
                  </div>
                  <ul className="space-y-6">
                    <li className="flex items-start gap-4">
                      <div className="mt-1 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed"><span className="font-black text-on-surface uppercase tracking-tighter mr-1">Intenção:</span> Alta frequência de solicitações de orçamento indica expansão iminente.</p>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-1 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Warning className="w-3 h-3 text-amber-600" />
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed"><span className="font-black text-on-surface uppercase tracking-tighter mr-1">Risco:</span> Moderado. Equipamento antigo pode gerar insatisfação se não houver troca preventiva.</p>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed"><span className="font-black text-on-surface uppercase tracking-tighter mr-1">Oportunidade:</span> Oferecer contrato de limpeza semestral para as 5 unidades.</p>
                    </li>
                  </ul>
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
              </section>

              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address || contact.location || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-lowest rounded-[32px] overflow-hidden shadow-sm h-64 relative group border border-outline-variant/10 block"
                title="Abrir no Google Maps"
              >
                <img 
                  src="https://picsum.photos/seed/hvac-map/800/600?grayscale" 
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" 
                  alt="Map" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                  <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">{contact.location || 'Localização'}</p>
                  <p className="text-[9px] font-bold text-secondary/60 uppercase tracking-tighter">{contact.address}</p>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <LocationOn className="w-10 h-10 text-primary relative z-10" />
                  </div>
                </div>
              </a>
            </div>
          </>
        ) : (
          <div className="col-span-12 space-y-10">
            {/* Financial Tab Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total em Serviço', value: formattedClosedValue, sub: 'Soma de ordens finalizadas', icon: TrendingUp, trend: 'Acumulado', color: 'primary' },
                { label: 'Valor em Aberto', value: formattedOpenValue, sub: 'Soma de ordens pendentes', icon: Clock, trend: 'Pendente', color: 'amber' },
                { label: 'Status Financeiro', value: contact.financialStatus || 'Adimplente', sub: `Forma: ${contact.paymentMethod || 'Pix'}`, icon: ShieldCheck, trend: 'Status', color: 'emerald' },
                { label: 'Ordens Ativas', value: serviceOrders.filter(os => os.status === 'Aberta').length.toString(), sub: 'Serviços em andamento', icon: FileText, trend: 'Volume', color: 'primary' },
              ].map((m, i) => (
                <div key={i} className="bg-surface-container-lowest p-8 rounded-[32px] shadow-sm border border-outline-variant/5 group hover:border-primary/20 transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                      "p-3 rounded-2xl transition-colors",
                      m.color === 'primary' ? "bg-primary/5 text-primary" :
                      m.color === 'amber' ? "bg-amber-50 text-amber-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      <m.icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                      m.color === 'primary' ? "bg-primary/10 text-primary" :
                      m.color === 'amber' ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {m.trend}
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary/60 mb-1.5">{m.label}</p>
                  <h3 className="text-2xl font-black font-headline text-on-surface tracking-tight">{m.value}</h3>
                  <p className="text-[10px] font-bold text-secondary/40 mt-3 uppercase tracking-tighter">{m.sub}</p>
                  
                  {m.label === 'Total em Serviço' && (
                    <button 
                      onClick={handleRecalculateFinance}
                      disabled={recalculating}
                      className="absolute bottom-8 right-8 p-2 rounded-xl bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 disabled:opacity-50"
                      title="Recalcular"
                    >
                      {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <section className="bg-surface-container-lowest rounded-[40px] p-10 shadow-sm border border-outline-variant/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Histórico de Ordens de Serviço</h3>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">Gestão de serviços e orçamentos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowOSModal(true)}
                  className="px-8 py-4 milled-gradient text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                  <Add className="w-5 h-5" />
                  Nova OS
                </button>
              </div>

              {/* OS Filters */}
              <div className="flex flex-wrap gap-4 mb-8 p-6 bg-surface-container-low/30 rounded-[32px] border border-outline-variant/10">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary ml-1 flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Status da OS
                  </label>
                  <select 
                    value={osStatusFilter}
                    onChange={(e) => setOsStatusFilter(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Finalizada">Finalizada</option>
                    <option value="Orçamento Aceito">Orçamento Aceito</option>
                    <option value="Orçamento Rejeitado">Orçamento Rejeitado</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary ml-1 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Data de Criação
                  </label>
                  <input 
                    type="date"
                    value={osDateFilter}
                    onChange={(e) => setOsDateFilter(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                {(osStatusFilter !== 'Todos' || osDateFilter) && (
                  <div className="flex items-end">
                    <button 
                      onClick={() => { setOsStatusFilter('Todos'); setOsDateFilter(''); }}
                      className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-2xl transition-all border border-primary/10"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>
              
              {loadingOS ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                  <p className="text-[10px] font-black text-secondary/40 uppercase tracking-[0.3em]">Carregando Ordens...</p>
                </div>
              ) : serviceOrders.length === 0 ? (
                <div className="text-center py-20 bg-surface-container-low/30 rounded-[32px] border border-dashed border-outline-variant/20">
                  <p className="text-sm text-secondary font-bold">Nenhuma ordem de serviço registrada para este cliente.</p>
                </div>
              ) : filteredServiceOrders.length === 0 ? (
                <div className="text-center py-20 bg-surface-container-low/30 rounded-[32px] border border-dashed border-outline-variant/20">
                  <p className="text-sm text-secondary font-bold">Nenhuma ordem de serviço corresponde aos filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-[10px] font-black text-secondary uppercase tracking-widest">
                        <th className="p-4">Data</th>
                        <th className="p-4">Assunto</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Valor</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServiceOrders.map((os) => {
                        const isExpanded = expandedOSId === os.id;
                        return (
                          <React.Fragment key={os.id}>
                            <tr 
                              onClick={() => setExpandedOSId(isExpanded ? null : os.id)}
                              className="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors cursor-pointer group"
                            >
                              <td className="p-4 text-sm font-medium text-on-surface whitespace-nowrap">
                                {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="p-4">
                                <p className="text-sm font-bold text-on-surface">{os.subject}</p>
                                <p className="text-xs text-secondary line-clamp-1">{os.description}</p>
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap",
                                  os.status === 'Orçamento Aceito' || os.status === 'Finalizada' 
                                    ? "bg-green-100 text-green-700" 
                                    : os.status === 'Orçamento Rejeitado'
                                      ? "bg-error-container/20 text-error"
                                      : "bg-amber-100 text-amber-700"
                                )}>
                                  {os.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-black text-on-surface whitespace-nowrap">
                                {os.value}
                              </td>
                              <td className="p-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {os.status === 'Aberta' && (
                                  <button 
                                    onClick={() => {
                                      setSelectedOS(os);
                                      setShowFinalizeModal(true);
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-xl text-green-600 transition-all inline-flex items-center justify-center"
                                    title="Finalizar OS"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handlePrintExistingOS(os)}
                                  className="p-2 hover:bg-surface-container rounded-xl text-secondary transition-all inline-flex items-center justify-center"
                                  title="Imprimir OS"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => generateOSPDF(os, contact, companyLogo, companyName)}
                                  className="p-2 hover:bg-surface-container rounded-xl text-secondary transition-all inline-flex items-center justify-center"
                                  title="Baixar PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <ChevronRight className={cn("w-4 h-4 text-secondary transition-transform inline-block ml-2", isExpanded && "rotate-90")} />
                              </td>
                            </tr>
                            <AnimatePresence>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="p-0 border-b border-outline-variant/10">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden bg-surface-container-lowest/50"
                                    >
                                      <div className="p-6 space-y-4">
                                        {os.materials && (
                                          <div className="bg-surface-container-high/50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Materiais Utilizados</p>
                                            <p className="text-xs text-on-surface-variant italic leading-relaxed">{os.materials}</p>
                                          </div>
                                        )}

                                        {os.usedProducts && os.usedProducts.length > 0 && (
                                          <div className="bg-surface-container-high/50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Produtos do Estoque</p>
                                            <div className="space-y-2">
                                              {os.usedProducts.map((up, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs bg-surface-container-lowest/50 p-2 rounded-lg">
                                                  <span className="font-bold text-on-surface">{up.name}</span>
                                                  <span className="text-secondary font-black">{up.quantity} {up.unit}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {os.finalizationNotes && (
                                          <div className="bg-surface-container-high/50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Relatório de Finalização</p>
                                            <p className="text-xs text-on-surface-variant leading-relaxed">{os.finalizationNotes}</p>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="bg-surface-container-high/30 p-3 rounded-xl">
                                            <p className="text-[8px] font-black text-secondary uppercase tracking-widest mb-1">ID da OS</p>
                                            <p className="text-[10px] font-mono font-bold text-on-surface">{os.id.substring(0, 12).toUpperCase()}</p>
                                          </div>
                                          <div className="bg-surface-container-high/30 p-3 rounded-xl">
                                            <p className="text-[8px] font-black text-secondary uppercase tracking-widest mb-1">Valor do Serviço</p>
                                            <p className="text-[10px] font-bold text-on-surface">{os.value}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 milled-gradient text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 group">
        <Add className="w-6 h-6" />
        <span className="absolute right-full mr-4 bg-on-background text-white px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Quick Log</span>
      </button>

      {/* OS Modal */}
      {showOSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Nova Ordem de Serviço</h3>
                  <p className="text-xs text-secondary uppercase tracking-widest font-bold">{contact.name}</p>
                </div>
              </div>
              <button onClick={() => setShowOSModal(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <CloseIcon className="w-6 h-6 text-secondary" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Assunto da OS</label>
                  <input 
                    type="text" 
                    value={osData.subject || ''}
                    onChange={(e) => setOsData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="ex: Manutenção Preventiva Mensal"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Valor do Serviço</label>
                  <input 
                    type="text" 
                    value={osData.value || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const digits = val.replace(/\D/g, '');
                      const number = parseInt(digits) / 100;
                      const formatted = isNaN(number) 
                        ? 'R$ 0,00' 
                        : new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(number);
                      setOsData(prev => ({ ...prev, value: formatted }));
                    }}
                    placeholder="R$ 0,00"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Descrição do Serviço</label>
                <textarea 
                  rows={6}
                  value={osData.description || ''}
                  onChange={(e) => setOsData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente o serviço realizado..."
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowOSModal(false)}
                className="flex-1 py-4 bg-surface-container-low text-secondary rounded-2xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveOS}
                disabled={savingOS}
                className="flex-1 py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {savingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Abrir OS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize OS Modal */}
      {showFinalizeModal && selectedOS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-[32px] p-8 shadow-2xl border border-outline-variant/10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Finalizar Ordem de Serviço</h3>
                  <p className="text-xs text-secondary uppercase tracking-widest font-bold">{selectedOS.subject}</p>
                </div>
              </div>
              <button onClick={() => setShowFinalizeModal(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <CloseIcon className="w-6 h-6 text-secondary" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Descrição Original</p>
                <p className="text-sm text-on-surface">{selectedOS.description}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Package className="w-3 h-3" /> Produtos do Estoque
                </label>
                <div className="space-y-3">
                  {finalizeData.usedProducts.map((used, index) => (
                    <div key={index} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-on-surface">{used.name}</p>
                        <p className="text-[10px] text-secondary uppercase tracking-tighter">{used.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          min="1"
                          value={used.quantity || ''}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1;
                            const newList = [...finalizeData.usedProducts];
                            newList[index].quantity = qty;
                            setFinalizeData(prev => ({ ...prev, usedProducts: newList }));
                          }}
                          className="w-16 bg-white border border-outline-variant/20 rounded-lg py-1 px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button 
                          onClick={() => {
                            const newList = finalizeData.usedProducts.filter((_, i) => i !== index);
                            setFinalizeData(prev => ({ ...prev, usedProducts: newList }));
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="relative">
                    <select 
                      onChange={(e) => {
                        const prodId = e.target.value;
                        if (!prodId) return;
                        const product = products.find(p => p.id === prodId);
                        if (product) {
                          if (finalizeData.usedProducts.some(p => p.productId === prodId)) {
                            alert('Este produto já foi adicionado.');
                            return;
                          }
                          setFinalizeData(prev => ({
                            ...prev,
                            usedProducts: [
                              ...prev.usedProducts,
                              {
                                productId: product.id,
                                name: product.name,
                                quantity: 1,
                                unit: product.unit
                              }
                            ]
                          }));
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs font-bold text-secondary appearance-none cursor-pointer"
                    >
                      <option value="">+ Adicionar produto do estoque...</option>
                      {products
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Estoque: {getProductStock(p)} {getProductUnit(p)})
                          </option>
                        ))}
                    </select>
                    <PlusCircle className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1 flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> Materiais Utilizados (Texto Livre)
                </label>
                <textarea 
                  rows={3}
                  value={finalizeData.materials || ''}
                  onChange={(e) => setFinalizeData(prev => ({ ...prev, materials: e.target.value }))}
                  placeholder="Descreva os materiais utilizados..."
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" /> Relatório de Finalização
                </label>
                <textarea 
                  rows={4}
                  value={finalizeData.finalizationNotes || ''}
                  onChange={(e) => setFinalizeData(prev => ({ ...prev, finalizationNotes: e.target.value }))}
                  placeholder="Descreva o que foi feito para concluir o serviço..."
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button 
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-4 bg-surface-container-low text-secondary rounded-2xl font-bold hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              {selectedOS.subject.toLowerCase().includes('orçamento') ? (
                <>
                  <button 
                    onClick={() => handleFinalizeOS('Orçamento Rejeitado')}
                    disabled={finalizingOS}
                    className="flex-1 py-4 bg-error-container/20 text-error rounded-2xl font-black uppercase tracking-widest text-[10px] border border-error/20 hover:bg-error-container/30 transition-all flex items-center justify-center gap-3"
                  >
                    {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloseIcon className="w-5 h-5" />}
                    Rejeitar
                  </button>
                  <button 
                    onClick={() => handleFinalizeOS('Orçamento Aceito')}
                    disabled={finalizingOS}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Aceitar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleFinalizeOS('Finalizada')}
                  disabled={finalizingOS}
                  className="flex-[2] py-4 milled-gradient text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Finalizar OS
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
