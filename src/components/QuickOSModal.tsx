import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, UserPlus, PlusCircle, Loader2, Printer, Download, CheckCircle, FileText, ArrowRight, User as UserIcon, DollarSign, AlignLeft, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateOSPDF } from '../lib/pdf-utils';
import { Contact, View, ServiceOrder, User } from '../types';
import { supabase } from '../lib/supabase';

interface QuickOSModalProps {
  user: User;
  contacts: Contact[];
  onClose: () => void;
  onViewChange: (view: View) => void;
  defaultSubject?: string;
  initialContact?: Contact | null;
}

export default function QuickOSModal({ user, contacts, onClose, onViewChange, defaultSubject = '', initialContact = null }: QuickOSModalProps) {
  const [step, setStep] = useState<'select' | 'form'>(initialContact ? 'form' : 'select');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(initialContact);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [osData, setOsData] = useState({
    subject: defaultSubject,
    description: '',
    value: 'R$ 0,00'
  });

  // Update subject if defaultSubject changes (e.g. if modal is reused)
  useEffect(() => {
    setOsData(prev => ({ ...prev, subject: defaultSubject }));
  }, [defaultSubject]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [contacts, search]);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = (parseInt(digits) || 0) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOsData(prev => ({ ...prev, value: formatCurrency(e.target.value) }));
  };

  const handleDownloadPDF = async (os: ServiceOrder, contact: Contact) => {
    try {
      await generateOSPDF(os, contact);
    } catch (err) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handlePrintExistingOS = (os: ServiceOrder, contact: Contact) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço - ${contact.name}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
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
            <div>
              <h1>Ordem de Serviço</h1>
              <p>Cardoso Ar Condicionado</p>
            </div>
            <div class="status-badge">${os.status}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Dados do Cliente</h3>
              <p><strong>Nome:</strong> ${contact.name}</p>
              <p><strong>Endereço:</strong> ${contact.address}</p>
              <p><strong>Telefone:</strong> ${contact.phone}</p>
            </div>
            <div class="info-box">
              <h3>Detalhes da OS</h3>
              <p><strong>ID:</strong> ${os.id.substring(0, 8).toUpperCase()}</p>
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
              if (window.name === 'print_os') {
                setTimeout(() => window.close(), 500);
              }
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', 'print_os', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleDownloadPDFFromForm = async () => {
    if (!selectedContact || !osData.subject || !osData.description) {
      alert('Preencha o assunto e a descrição para gerar o PDF.');
      return;
    }
    
    const tempOS: ServiceOrder = {
      id: 'TEMP-' + Date.now(),
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      subject: osData.subject,
      description: osData.description,
      materials: '',
      value: osData.value,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'Aberta'
    };

    try {
      await generateOSPDF(tempOS, selectedContact);
    } catch (err) {
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handlePrint = () => {
    if (!selectedContact || !osData.subject || !osData.description) {
      alert('Preencha o assunto e a descrição para imprimir.');
      return;
    }
    
    const tempOS: ServiceOrder = {
      id: 'TEMP-' + Date.now(),
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      subject: osData.subject,
      description: osData.description,
      materials: '',
      value: osData.value,
      userId: user.id,
      createdAt: new Date().toISOString(),
      status: 'Aberta'
    };
    
    handlePrintExistingOS(tempOS, selectedContact);
  };

  const handleSave = async () => {
    if (!user || !selectedContact) return;
    if (!osData.subject || !osData.description) {
      alert('Por favor, preencha o assunto e a descrição.');
      return;
    }

    setSaving(true);
    try {
      // Create OS
      const payload = {
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        subject: osData.subject,
        description: osData.description,
        materials: '',
        value: osData.value,
        status: 'Aberta',
        userId: user.id
      };
      
      const { error: osError } = await supabase.from('serviceOrders').insert(payload);

      if (osError) throw osError;

      // Update Contact Status based on subject to move it in the Pipeline
      let newStatus = selectedContact.status;
      const subjectLower = (osData.subject || '').toLowerCase();
      
      if (subjectLower.includes('visita técnica')) {
        newStatus = 'Visita Técnica Agendada';
      } else if (subjectLower.includes('orçamento')) {
        newStatus = 'Orçamento Enviado';
      } else if (subjectLower.includes('instalação')) {
        newStatus = 'Instalação Pendente';
      } else {
        // Default to Visita Técnica if it's an open OS but doesn't match other categories
        // to ensure it appears in the Pipeline
        if (selectedContact.status === 'Serviço Concluído' || selectedContact.status === 'Contrato Ativo') {
          newStatus = 'Visita Técnica Agendada';
        }
      }

      if (newStatus !== selectedContact.status) {
        const { error: contactError } = await supabase
          .from('contacts')
          .update({ status: newStatus })
          .eq('id', selectedContact.id);
        
        if (contactError) throw contactError;
      }

      onClose();
      alert('Ordem de Serviço aberta com sucesso!');
    } catch (err: any) {
      console.error('Error saving OS:', err);
      alert('Erro ao salvar Ordem de Serviço: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface-container-lowest w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-outline-variant/10"
      >
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-black font-headline text-on-surface">Nova Ordem de Serviço</h3>
              <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mt-0.5">
                {step === 'select' ? 'Selecione o Cliente' : `Cliente: ${selectedContact?.name}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-surface-container rounded-xl transition-colors text-secondary/60 hover:text-secondary"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 'select' ? (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/40 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-secondary/40"
                  />
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          setStep('form');
                        }}
                        className="w-full flex items-center p-4.5 rounded-2xl hover:bg-primary/5 transition-all border border-transparent hover:border-primary/20 group text-left"
                      >
                        <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary font-black text-xs mr-4 group-hover:scale-110 group-hover:bg-white transition-all shadow-sm border border-outline-variant/10">
                          {contact.initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{contact.name}</p>
                          <p className="text-[9px] text-secondary font-black uppercase tracking-widest mt-0.5">{contact.address}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowRight className="w-4 h-4 text-primary" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                      <p className="text-sm text-secondary font-medium">Nenhum cliente encontrado.</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-outline-variant/10">
                  <button
                    onClick={() => {
                      onClose();
                      onViewChange('contact-form');
                    }}
                    className="w-full py-4.5 bg-surface-container-low text-primary rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-primary/5 transition-all border border-primary/10"
                  >
                    <UserPlus className="w-5 h-5" />
                    Cadastrar Novo Cliente
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                      <Briefcase className="w-3 h-3" /> Assunto do Serviço
                    </label>
                    <input
                      type="text"
                      value={osData.subject || ''}
                      onChange={(e) => setOsData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ex: Manutenção Preventiva"
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-secondary/40"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> Valor do Serviço
                    </label>
                    <input
                      type="text"
                      value={osData.value || ''}
                      onChange={handleValueChange}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-black text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" /> Descrição Detalhada
                  </label>
                  <textarea
                    value={osData.description || ''}
                    onChange={(e) => setOsData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva detalhadamente o que será realizado..."
                    rows={6}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none placeholder:text-secondary/40"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={() => setStep('select')}
                    className="flex-1 min-w-[120px] py-4 bg-surface-container-low text-secondary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-surface-container-high transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full md:w-auto md:flex-[1.5] py-4 milled-gradient text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Abrir OS
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
