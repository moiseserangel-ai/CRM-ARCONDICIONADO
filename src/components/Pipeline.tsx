import React, { useState, useEffect, useRef } from 'react';
import { Filter, MoreHorizontal, MessageSquare as ChatBubble, Calendar as Schedule, Eye as Visibility, Handshake, CheckCircle, TrendingUp, Lightbulb as Insights, PlusCircle, X, Loader2, CheckCircle2, DollarSign, Briefcase, User, ArrowRight, Clock, Package, FileText, Edit as EditNote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Contact, View, ServiceOrder, Product, UsedProduct, User as UserType } from '../types';
import QuickOSModal from './QuickOSModal';

interface PipelineProps {
  user: UserType;
  onViewChange: (view: View) => void;
  onSelectContact: (contact: Contact) => void;
  searchTerm?: string;
}

export default function Pipeline({ user, onViewChange, onSelectContact, searchTerm = '' }: PipelineProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [showQuickOSModal, setShowQuickOSModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const sigCanvas = useRef<SignaturePadRef>(null);
  const [selectedContactForFinalize, setSelectedContactForFinalize] = useState<Contact | null>(null);
  const [selectedContactForOS, setSelectedContactForOS] = useState<Contact | null>(null);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
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
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [finalizingOS, setFinalizingOS] = useState(false);
  const [defaultOSSubject, setDefaultOSSubject] = useState('');
  const stageConfigs: Record<string, { color: string; icon: any }> = {
    'INSTALAÇÃO': { color: 'text-blue-500 bg-blue-50', icon: Briefcase },
    'VISITA TÉCNICA': { color: 'text-purple-500 bg-purple-50', icon: Schedule },
    'ORÇAMENTO': { color: 'text-amber-500 bg-amber-50', icon: DollarSign },
    'NEGOCIAÇÃO': { color: 'text-rose-500 bg-rose-50', icon: Handshake },
    'FECHADO': { color: 'text-emerald-500 bg-emerald-50', icon: CheckCircle },
  };

  const stages = Object.keys(stageConfigs);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchData = async () => {
      const [contactsRes, soRes, productsRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('userId', user.id).order('createdAt', { ascending: false }),
        supabase.from('serviceOrders').select('*').eq('userId', user.id),
        supabase.from('products').select('*').eq('userId', user.id)
      ]);

      if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
      if (soRes.data) setServiceOrders(soRes.data as ServiceOrder[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      setLoading(false);
    };

    fetchData();

    // Set up real-time subscriptions
    const contactsChannel = supabase
      .channel('pipeline-contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        const isRelevant = 
          (payload.new && (payload.new as Contact).userId === user.id) || 
          (payload.old && (payload.old as Contact).userId === user.id) ||
          payload.eventType === 'DELETE'; // For DELETE, we might not have userId, so we process it anyway
          
        if (isRelevant) {
          if (payload.eventType === 'INSERT') setContacts(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [payload.new as Contact, ...prev];
          });
          else if (payload.eventType === 'UPDATE') setContacts(prev => prev.map(c => c.id === payload.new.id ? payload.new as Contact : c));
          else if (payload.eventType === 'DELETE') setContacts(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    const soChannel = supabase
      .channel('pipeline-so')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'serviceOrders' }, (payload) => {
        const isRelevant =
          (payload.new && (payload.new as ServiceOrder).userId === user.id) ||
          (payload.old && (payload.old as ServiceOrder).userId === user.id);

        if (!isRelevant) return;

        if (payload.eventType === 'INSERT') setServiceOrders(prev => {
          if (prev.some(so => so.id === payload.new.id)) return prev;
          return [payload.new as ServiceOrder, ...prev];
        });
        else if (payload.eventType === 'UPDATE') setServiceOrders(prev => prev.map(so => so.id === payload.new.id ? payload.new as ServiceOrder : so));
        else if (payload.eventType === 'DELETE') setServiceOrders(prev => prev.filter(so => so.id !== payload.old.id));
      })
      .subscribe();

    const productsChannel = supabase
      .channel('pipeline-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        const isRelevant = 
          (payload.new && (payload.new as Product).userId === user.id) || 
          (payload.old && (payload.old as Product).userId === user.id) ||
          payload.eventType === 'DELETE';
          
        if (isRelevant) {
          if (payload.eventType === 'INSERT') setProducts(prev => {
            if (prev.some(p => p.id === payload.new.id)) return prev;
            return [payload.new as Product, ...prev];
          });
          else if (payload.eventType === 'UPDATE') setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
          else if (payload.eventType === 'DELETE') setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(soChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [user]);

  const normalize = (str: string) => 
    (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const getContactsByStage = (stage: string) => {
    const normalizedSearch = normalize(localSearchTerm);
    
    return contacts.filter(contact => {
      const matchesSearch = normalize(contact.name).includes(normalizedSearch) || 
                           normalize(contact.address).includes(normalizedSearch) ||
                           normalize(stage).includes(normalizedSearch);
      
      if (!matchesSearch) return false;

      const contactOrders = serviceOrders.filter(os => os.contactId === contact.id);
      const hasOpenOS = contactOrders.some(os => os.status === 'Aberta');
      const hasFinalizedOS = contactOrders.some(os => 
        os.status === 'Finalizada' || 
        os.status === 'Orçamento Aceito' || 
        os.status === 'Orçamento Rejeitado'
      );

      // If contact has an open OS, they should be in an active stage
      if (hasOpenOS) {
        // Find the most recent open OS to determine the stage
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
        
        // If we couldn't detect a stage from the OS subject, fallback to contact status
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

      // If no open OS, but has finalized OS, they belong in FECHADO
      if (hasFinalizedOS) {
        return stage === 'FECHADO';
      }

      // Fallback for contacts without OS
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
    });
  };

  const allFilteredContacts = contacts.filter(contact => {
    const normalizedSearch = normalize(localSearchTerm);
    return normalize(contact.name).includes(normalizedSearch) || 
           normalize(contact.address).includes(normalizedSearch);
  });

  const filteredContactIds = new Set(allFilteredContacts.map(c => c.id));

  const totalOpenValue = serviceOrders
    .filter(os => os.status === 'Aberta' && filteredContactIds.has(os.contactId))
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      return acc + (parseInt(digits) || 0) / 100;
    }, 0);

  const closedValue = serviceOrders
    .filter(os => os.status === 'Finalizada' && filteredContactIds.has(os.contactId))
    .reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      const value = (parseInt(digits) || 0) / 100;
      return acc + value;
    }, 0);

  const totalValue = totalOpenValue + closedValue;

  const getCardDisplayValue = (contact: Contact, stage: string) => {
    if (stage === 'FECHADO') return contact.portfolioValue;
    
    const openValue = serviceOrders
      .filter(os => os.contactId === contact.id && os.status === 'Aberta')
      .reduce((acc, os) => {
        const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
        return acc + (parseInt(digits) || 0) / 100;
      }, 0);
      
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(openValue);
  };

  const getContactStats = (contactId: string) => {
    const contactOrders = serviceOrders.filter(os => os.contactId === contactId);
    
    const lastOS = [...contactOrders].sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    )[0];
    
    const totalValue = contactOrders.reduce((acc, os) => {
      const digits = (os.value || 'R$ 0,00').replace(/[^0-9]/g, '');
      return acc + (parseInt(digits) || 0) / 100;
    }, 0);

    return {
      lastStatus: lastOS ? lastOS.status : 'Nenhum',
      totalValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)
    };
  };

  const handleAddOS = (stage: string, contact: Contact | null = null) => {
    let subject = '';
    if (stage === 'VISITA TÉCNICA') {
      subject = 'Visita Técnica';
    } else if (stage === 'ORÇAMENTO') {
      subject = 'Elaboração de Orçamento';
    } else if (stage === 'INSTALAÇÃO') {
      subject = 'Instalação';
    } else if (stage === 'NEGOCIAÇÃO') {
      subject = 'Negociação';
    }
    setDefaultOSSubject(subject);
    setSelectedContactForOS(contact);
    setShowQuickOSModal(true);
  };

  const handleFinalizeOS = async (finalStatus: 'Orçamento Aceito' | 'Orçamento Rejeitado' | 'Finalizada') => {
    if (!user || !selectedOS || !selectedContactForFinalize) return;
    if (finalStatus !== 'Orçamento Rejeitado' && (!finalizeData.materials || !finalizeData.finalizationNotes)) {
      alert('Por favor, descreva os materiais utilizados e o que foi realizado na finalização.');
      return;
    }

    const signatureData = sigCanvas.current && !sigCanvas.current.isEmpty() 
      ? sigCanvas.current.toDataURL('image/png') 
      : null;

    setFinalizingOS(true);
    try {
      const { data: updatedOS, error: osError } = await supabase.rpc('finalize_service_order', {
        p_service_order_id: selectedOS.id,
        p_status: finalStatus,
        p_materials: finalizeData.materials,
        p_finalization_notes: finalizeData.finalizationNotes,
        p_used_products: finalizeData.usedProducts,
        p_signature: signatureData
      });

      if (osError) throw osError;

      if (updatedOS) {
        setServiceOrders(prev => prev.map(so => so.id === updatedOS.id ? (updatedOS as ServiceOrder) : so));
      }

      // Update contact status and value
      const contactOrders = serviceOrders.filter(os => os.contactId === selectedContactForFinalize.id);
      const finalizedOrders = contactOrders.filter(os => 
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
      const otherOpenOS = contactOrders.filter(os => os.id !== selectedOS.id && os.status === 'Aberta');
      
      let newStatus = selectedContactForFinalize.status;
      if (otherOpenOS.length === 0) {
        newStatus = 'Serviço Concluído';
      }

      const { data: updatedContact, error: contactError } = await supabase
        .from('contacts')
        .update({
          status: newStatus,
          portfolioValue: formattedValue
        })
        .eq('id', selectedContactForFinalize.id)
        .select()
        .single();

      if (contactError) throw contactError;

      if (updatedContact) {
        setContacts(prev => prev.map(c => c.id === updatedContact.id ? (updatedContact as Contact) : c));
      }

      setShowFinalizeModal(false);
      setSelectedOS(null);
      setSelectedContactForFinalize(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {showQuickOSModal && (
        <QuickOSModal 
          user={user}
          contacts={contacts}
          onClose={() => {
            setShowQuickOSModal(false);
            setSelectedContactForOS(null);
          }}
          onSuccess={(newOS, updatedContact) => {
            setServiceOrders(prev => {
              if (prev.some(so => so.id === newOS.id)) return prev;
              return [newOS, ...prev];
            });
            setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
          }}
          onViewChange={onViewChange}
          defaultSubject={defaultOSSubject}
          initialContact={selectedContactForOS}
        />
      )}

      {showFinalizeModal && selectedContactForFinalize && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-outline-variant/10"
          >
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Finalizar Serviço</h3>
                  <p className="text-xs text-secondary font-bold uppercase tracking-[0.2em] mt-0.5">
                    Cliente: {selectedContactForFinalize.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowFinalizeModal(false);
                  setSelectedOS(null);
                  setSelectedContactForFinalize(null);
                }} 
                className="p-2.5 hover:bg-surface-container rounded-xl transition-colors text-secondary/60 hover:text-secondary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {!selectedOS ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-secondary">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <p className="text-xs font-bold uppercase tracking-widest">Selecione a Ordem de Serviço</p>
                  </div>
                  <div className="grid gap-3">
                    {serviceOrders
                      .filter(os => os.contactId === selectedContactForFinalize.id && os.status === 'Aberta')
                      .map(os => (
                        <button
                          key={os.id}
                          onClick={() => setSelectedOS(os)}
                          className="w-full text-left p-5 rounded-2xl border border-outline-variant/20 hover:border-primary/40 hover:bg-primary/5 transition-all group relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-on-surface group-hover:text-primary transition-colors">{os.subject}</h5>
                            <span className="text-primary font-bold text-sm">{os.value}</span>
                          </div>
                          <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{os.description}</p>
                          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    {serviceOrders.filter(os => os.contactId === selectedContactForFinalize.id && os.status === 'Aberta').length === 0 && (
                      <div className="text-center py-12 bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/20">
                        <p className="text-sm text-secondary font-medium">Nenhuma OS aberta encontrada.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-surface-container-low/50 p-6 rounded-2xl border border-outline-variant/10 relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Serviço Selecionado</p>
                        <h5 className="text-lg font-bold text-on-surface">{selectedOS.subject}</h5>
                      </div>
                      <button 
                        onClick={() => setSelectedOS(null)}
                        className="p-2 hover:bg-surface-container-lowest/50 rounded-lg text-secondary hover:text-primary transition-all"
                        title="Trocar OS"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed mb-4">{selectedOS.description}</p>
                    <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/10">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-on-surface uppercase tracking-widest">Valor: {selectedOS.value}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                        <Package className="w-3 h-3" /> Produtos do Estoque
                      </label>
                      <div className="space-y-3">
                        {finalizeData.usedProducts.map((used, index) => (
                          <div key={index} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-on-surface">{used.name}</p>
                              <p className="text-xs text-secondary uppercase tracking-tighter">{used.unit}</p>
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
                                <X className="w-3.5 h-3.5" />
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

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Materiais Utilizados (Texto Livre)
                      </label>
                      <textarea
                        value={finalizeData.materials || ''}
                        onChange={(e) => setFinalizeData(prev => ({ ...prev, materials: e.target.value }))}
                        placeholder="Ex: 2m de tubo de cobre, 1 carga de gás R410A..."
                        rows={3}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none placeholder:text-secondary/40"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                        <ChatBubble className="w-3 h-3" /> Relatório de Finalização
                      </label>
                      <textarea
                        value={finalizeData.finalizationNotes || ''}
                        onChange={(e) => setFinalizeData(prev => ({ ...prev, finalizationNotes: e.target.value }))}
                        placeholder="Descreva detalhadamente o que foi realizado para concluir este serviço..."
                        rows={4}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none placeholder:text-secondary/40"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-secondary flex items-center gap-2">
                          <EditNote className="w-3 h-3" /> Assinatura do Cliente
                        </label>
                        <button 
                          onClick={() => sigCanvas.current?.clear()}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Limpar
                        </button>
                      </div>
                      <div className="bg-white border-2 border-dashed border-outline-variant/30 rounded-2xl overflow-hidden touch-none h-40 relative">
                        <SignaturePad 
                          ref={sigCanvas}
                          penColor="black"
                          canvasProps={{
                            className: 'w-full h-full cursor-crosshair'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={() => setSelectedOS(null)}
                      className="flex-1 py-4 bg-surface-container-low text-secondary rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-surface-container-high transition-all"
                    >
                      Voltar
                    </button>
                    {(selectedOS.subject || '').toLowerCase().includes('orçamento') ? (
                      <>
                        <button
                          onClick={() => handleFinalizeOS('Orçamento Rejeitado')}
                          disabled={finalizingOS}
                          className="flex-1 py-4 bg-error-container/20 text-error rounded-2xl font-bold uppercase tracking-widest text-xs border border-error/20 hover:bg-error-container/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                          Rejeitar
                        </button>
                        <button
                          onClick={() => handleFinalizeOS('Orçamento Aceito')}
                          disabled={finalizingOS}
                          className="flex-[1.5] py-4 milled-gradient text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          Aceitar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleFinalizeOS('Finalizada')}
                        disabled={finalizingOS}
                        className="flex-[2.5] py-4 milled-gradient text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {finalizingOS ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Finalizar OS
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Sales Pipeline</span>
          </div>
          <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Fluxo de Trabalho</h2>
          <p className="text-secondary font-body text-sm max-w-md">Acompanhe seus leads desde o primeiro contato até o fechamento do contrato.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-right pr-4 border-r border-outline-variant/10">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-0.5">Pipeline Ativo</p>
              <p className="text-xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOpenValue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-0.5">Conversão Total</p>
              <p className="text-xl font-bold text-on-surface">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(closedValue)}
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <input
              type="text"
              placeholder="Buscar no pipeline..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all w-72 group-hover:border-primary/30"
            />
            <Filter className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 items-start overflow-x-auto pb-6 snap-x custom-scrollbar">
        {stages.map((stage) => {
          const stageContacts = getContactsByStage(stage);
          const config = stageConfigs[stage];
          const StageIcon = config.icon;
          
          return (
            <div key={stage} className="flex flex-col gap-5 min-w-[280px] w-[280px] shrink-0 snap-start">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color)}>
                    <StageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
                      {stage}
                    </h3>
                    <p className="text-xs font-medium text-secondary uppercase tracking-wider">
                      {stageContacts.length} {stageContacts.length === 1 ? 'Contato' : 'Contatos'}
                    </p>
                  </div>
                </div>
                <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-secondary/40 hover:text-secondary">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto pr-2 pb-6 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {stageContacts.map((contact) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={contact.id} 
                      onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}
                      className={cn(
                        "bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/20 group hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden",
                        stage === 'FECHADO' && "opacity-80 grayscale-[0.3]",
                        expandedContactId === contact.id && "ring-2 ring-primary/20 shadow-lg"
                      )}
                    >
                      {/* Status Badge */}
                      <div className="flex justify-between items-start mb-4">
                        {stage === 'FECHADO' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">
                            <CheckCircle className="w-3 h-3" /> Ganho
                          </div>
                        ) : (
                          <span className={cn(
                            "px-2 py-1 text-xs font-bold rounded-full uppercase tracking-tighter",
                            contact.status === 'Orçamento Enviado' ? "bg-amber-50 text-amber-600" :
                            contact.status === 'Manutenção Pendente' ? "bg-blue-50 text-blue-600" :
                            "bg-primary/5 text-primary"
                          )}>
                            {contact.status}
                          </span>
                        )}
                        <span className={cn("font-headline font-bold text-sm", stage === 'FECHADO' ? "text-secondary" : "text-primary")}>
                          {getCardDisplayValue(contact, stage)}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{contact.name}</h4>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectContact(contact);
                            }}
                            className="p-1 hover:bg-surface-container rounded-lg text-secondary/40 hover:text-primary transition-all"
                            title="Ver Detalhes"
                          >
                            <Visibility className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-secondary">
                          <Briefcase className="w-3 h-3" />
                          <p className="text-xs font-medium line-clamp-1">{contact.address}</p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedContactId === contact.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 pb-2 space-y-3 border-t border-outline-variant/10 mt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-secondary/60" />
                                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Último Status</span>
                                </div>
                                <span className={cn(
                                  "text-xs font-bold px-2 py-0.5 rounded-md",
                                  getContactStats(contact.id).lastStatus === 'Finalizada' ? "bg-emerald-50 text-emerald-600" :
                                  getContactStats(contact.id).lastStatus === 'Aberta' ? "bg-blue-50 text-blue-600" :
                                  "bg-surface-container-high text-secondary"
                                )}>
                                  {getContactStats(contact.id).lastStatus}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-secondary/60" />
                                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Contratos</span>
                                </div>
                                <span className="text-xs font-bold text-on-surface">
                                  {getContactStats(contact.id).totalValue}
                                </span>
                              </div>
                              {stage !== 'FECHADO' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddOS(stage, contact);
                                  }}
                                  className="w-full mt-3 py-3 px-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                  Abrir Ordem de Serviço
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Financial Info Tags */}
                      {(contact.financialStatus || contact.paymentMethod) && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {contact.financialStatus && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider",
                              contact.financialStatus === 'Adimplente' ? "bg-emerald-50 text-emerald-600" :
                              contact.financialStatus === 'Inadimplente' ? "bg-rose-50 text-rose-600" :
                              "bg-amber-50 text-amber-600"
                            )}>
                              {contact.financialStatus}
                            </span>
                          )}
                          {contact.paymentMethod && (
                            <span className="px-2 py-0.5 bg-surface-container-high/50 text-secondary rounded-md text-[8px] font-bold uppercase tracking-wider">
                              {contact.paymentMethod}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Footer & Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            {contact.avatar ? (
                              <img src={contact.avatar} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" alt={contact.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border-2 border-white shadow-sm">
                                {contact.initials}
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface leading-tight">{contact.name.split(' ')[0]}</span>
                            <span className="text-[8px] text-secondary font-medium">Responsável</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          {stage !== 'FECHADO' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddOS(stage, contact);
                                }}
                                className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                                title="Abrir OS"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContactForFinalize(contact);
                                  setShowFinalizeModal(true);
                                }}
                                className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                                title="Finalizar"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <div className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {stage !== 'FECHADO' && (
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAddOS(stage)}
                    className="w-full py-6 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-surface-container-low hover:border-primary/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary/40 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-secondary/40 uppercase tracking-widest group-hover:text-primary transition-colors">Novo Negócio</span>
                  </motion.button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Metrics Section */}
      <section className="pt-12 pb-20 border-t border-outline-variant/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Insights className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Análise de Performance</h3>
            <p className="text-xs text-secondary font-medium">Insights baseados no seu pipeline atual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+8.4%</span>
            </div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Valor em Aberto</p>
            <h4 className="text-2xl font-headline font-bold text-on-surface">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOpenValue)}
            </h4>
            <div className="mt-4 h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%]"></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12.2%</span>
            </div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">Negócios Fechados</p>
            <h4 className="text-2xl font-headline font-bold text-on-surface">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(closedValue)}
            </h4>
            <div className="mt-4 h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[82%]"></div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider">Distribuição</h5>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-secondary/30"></div>)}
              </div>
            </div>
            <div className="flex items-end gap-2.5 h-20">
              {stages.map((stage, i) => {
                const count = getContactsByStage(stage).length;
                const height = contacts.length > 0 ? (count / contacts.length) * 100 : 0;
                const colors = ['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400', 'bg-emerald-400'];
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 8)}%` }}
                      className={cn("w-full rounded-t-md transition-all duration-500", colors[i])}
                    ></motion.div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-3">
              {['INST', 'VIST', 'ORÇAM', 'NEGOC', 'FECH'].map(s => (
                <span key={s} className="text-[8px] font-bold text-secondary uppercase tracking-tighter">{s}</span>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider">Atividade</h5>
                <Clock className="w-3.5 h-3.5 text-secondary/40" />
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"></div>
                  <div>
                    <p className="text-xs text-on-surface font-bold leading-tight">Arthur enviou proposta</p>
                    <p className="text-xs text-secondary font-medium">há 2 horas</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                  <div>
                    <p className="text-xs text-on-surface font-bold leading-tight">Novo lead: Eco Varejo</p>
                    <p className="text-xs text-secondary font-medium">há 5 horas</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full py-2.5 mt-4 bg-white/50 backdrop-blur-sm text-primary text-xs font-bold uppercase tracking-wider rounded-xl border border-primary/10 hover:bg-primary/5 transition-all">Relatório Completo</button>
          </div>
        </div>
      </section>
    </div>
  );
}
