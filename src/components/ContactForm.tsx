import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, X, User as UserIcon, Briefcase, DollarSign, Zap, MapPin, Phone, Mail, FileText, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, User } from '../types';
import { supabase, createNotification } from '../lib/supabase';
import { cn } from '../lib/utils';

interface ContactFormProps {
  user: User;
  contact?: Contact | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ContactForm({ user, contact, onBack, onSuccess }: ContactFormProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    address: '',
    cnpjCpf: '',
    email: '',
    phone: '',
    location: '',
    status: 'Orçamento Enviado',
    portfolioValue: 'R$ 0,00',
    growth: '+0%',
    lastInteraction: new Date().toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' }),
    lastInteractionTime: new Date().toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' }),
    initials: '',
    equipmentType: '',
    equipmentBrand: '',
    equipmentModel: '',
    equipmentQuantity: '',
    btus: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    installationDate: '',
    birthDate: '',
    financialStatus: 'Adimplente',
    paymentMethod: 'Pix',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    }
  }, [contact]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'portfolioValue') {
      const digits = value.replace(/\D/g, '');
      const number = parseInt(digits) / 100;
      const formatted = isNaN(number) 
        ? 'R$ 0,00' 
        : new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(number);
      
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'name') {
      const initials = value.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      setFormData(prev => ({ ...prev, initials }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        userId: user.id
      };
      
      // Merge address into location since address column is missing in DB
      if (data.address) {
        data.location = data.address + (data.location ? ' - ' + data.location : '');
      }
      
      // Remove id from payload to avoid updating primary key
      delete (data as any).id;
      // Remove createdAt to avoid column not found error, use createdAt if needed
      delete (data as any).createdAt;
      // Remove address as it's missing in the schema
      delete (data as any).address;

      if (contact?.id) {
        const { error } = await supabase
          .from('contacts')
          .update(data)
          .eq('id', contact.id);
        
        if (error) throw error;

        await createNotification(
          user.id,
          'Contato Atualizado',
          `As informações de ${data.name} foram atualizadas com sucesso.`,
          'contact'
        );
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert(data);
        
        if (error) throw error;

        await createNotification(
          user.id,
          'Novo Lead Cadastrado',
          `${data.name} foi adicionado ao sistema como um novo lead.`,
          'lead'
        );
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setError(`Falha ao salvar contato: ${err.message || 'Verifique suas permissões.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-10 pb-20"
    >
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm mb-4">
            <button 
              onClick={onBack} 
              className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary transition-colors"
            >
              Diretório de Clientes
            </button>
            <ChevronRight className="w-3 h-3 text-outline-variant" />
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">
              {contact ? 'Edição de Perfil' : 'Novo Registro'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-primary">
            <div className="p-2 bg-primary/10 rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Gestão de Identidade</span>
          </div>
          <h2 className="text-4xl font-headline font-black tracking-tight text-on-surface">
            {contact ? 'Atualizar Cliente' : 'Cadastro de Cliente'}
          </h2>
          <p className="text-secondary font-body text-sm max-w-md">
            {contact ? 'Modifique as informações e especificações técnicas do cliente selecionado.' : 'Insira os dados fundamentais para iniciar o acompanhamento deste novo relacionamento.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3.5 bg-surface-container-low text-secondary rounded-2xl font-black uppercase tracking-widest text-[10px] border border-outline-variant/10 hover:bg-surface-container-high transition-all"
          >
            Descartar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "px-8 py-3.5 milled-gradient text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Zap className="w-4 h-4" />
                </motion.div>
                Processando...
              </span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {contact ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Identity & Contact */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface-container-lowest rounded-[40px] p-10 shadow-sm border border-outline-variant/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <UserIcon className="w-32 h-32" />
            </div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-5 bg-primary rounded-full"></div>
              <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight">Identidade & Localização</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Nome Completo
                </label>
                <input
                  required
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="ex: Julianne Sterling"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Endereço Completo
                </label>
                <input
                  required
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="ex: Rua das Flores, 123 - Centro"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> CPF / CNPJ
                </label>
                <input
                  required
                  name="cnpjCpf"
                  value={formData.cnpjCpf || ''}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> E-mail de Contato
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="cliente@exemplo.com"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Telefone / WhatsApp
                </label>
                <input
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+55 (11) 99999-9999"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Data de Nascimento
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Cidade / UF
                </label>
                <input
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  placeholder="ex: São Paulo, SP"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30"
                />
              </div>
            </div>
            <div className="space-y-2.5 mt-8">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                <FileText className="w-3 h-3" /> Observações Internas
              </label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Histórico do cliente, preferências, detalhes de acesso..."
                rows={4}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold placeholder:text-secondary/30 resize-none"
              />
            </div>
          </div>

          {/* Technical Specs Bento Section */}
          <div className="bg-surface-container-lowest rounded-[40px] p-10 shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-5 bg-tertiary rounded-full"></div>
              <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight">Especificações Técnicas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Tipo de Equipamento</label>
                  <input
                    name="equipmentType"
                    value={formData.equipmentType || ''}
                    onChange={handleChange}
                    placeholder="ex: Split Hi-Wall"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Marca / Fabricante</label>
                  <input
                    name="equipmentBrand"
                    value={formData.equipmentBrand || ''}
                    onChange={handleChange}
                    placeholder="ex: Daikin, LG"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Modelo / Série</label>
                  <input
                    name="equipmentModel"
                    value={formData.equipmentModel || ''}
                    onChange={handleChange}
                    placeholder="ex: Inverter 2024"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Capacidade (BTUs)</label>
                  <input
                    name="btus"
                    value={formData.btus || ''}
                    onChange={handleChange}
                    placeholder="ex: 12.000"
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="bg-surface-container-low/50 rounded-3xl p-6 border border-outline-variant/10 flex flex-col justify-center items-center text-center gap-4">
                <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary mb-2 block">Quantidade de Unidades</label>
                  <input
                    name="equipmentQuantity"
                    value={formData.equipmentQuantity || ''}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-20 bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 text-center font-black text-xl focus:ring-2 focus:ring-tertiary/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Instalação
                </label>
                <input
                  type="date"
                  name="installationDate"
                  value={formData.installationDate || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Última Manutenção
                </label>
                <input
                  type="date"
                  name="lastMaintenanceDate"
                  value={formData.lastMaintenanceDate || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Próxima Revisão
                </label>
                <input
                  type="date"
                  name="nextMaintenanceDate"
                  value={formData.nextMaintenanceDate || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial & Status */}
        <div className="space-y-8">
          <div className="bg-surface-container-lowest rounded-[40px] p-8 shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
              <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight">Financeiro</h3>
            </div>

            <div className="space-y-6">
              <div className="bg-surface-container-low/50 p-6 rounded-3xl border border-outline-variant/10">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary mb-3 block">Volume Total em Serviço</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                  <input
                    name="portfolioValue"
                    value={formData.portfolioValue || ''}
                    onChange={handleChange}
                    placeholder="R$ 0,00"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl py-5 pl-12 pr-5 text-2xl font-black text-on-surface focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Status de Adimplência</label>
                <select
                  name="financialStatus"
                  value={formData.financialStatus || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold appearance-none"
                >
                  <option value="Adimplente">Adimplente</option>
                  <option value="Inadimplente">Inadimplente</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Método Preferencial</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod || ''}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold appearance-none"
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[40px] p-8 shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
              <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight">Pipeline</h3>
            </div>
            
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary ml-1">Estágio Atual</label>
              <select
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-bold appearance-none"
              >
                <option value="Contrato Ativo">Contrato Ativo</option>
                <option value="Manutenção Pendente">Manutenção Pendente</option>
                <option value="Orçamento Enviado">Orçamento Enviado</option>
                <option value="Instalação Pendente">Instalação Pendente</option>
                <option value="Visita Técnica Agendada">Visita Técnica Agendada</option>
                <option value="Aguardando Peças">Aguardando Peças</option>
                <option value="Serviço Concluído">Serviço Concluído</option>
                <option value="Em Negociação">Em Negociação</option>
              </select>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-error-container/20 border border-error/20 text-error rounded-[32px] flex items-start gap-4"
            >
              <X className="w-6 h-6 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">Erro de Sincronização</p>
                <p className="text-sm font-medium leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </div>
      </form>
    </motion.div>
  );
}
