import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileKey,
  Loader2,
  Plug,
  Save,
  ShieldCheck,
  X
} from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface FiscalSettingsWizardProps {
  user: User;
  onClose: () => void;
}

interface FiscalSettings {
  companyCnpj: string;
  municipalRegistration: string;
  municipality: string;
  state: string;
  taxRegime: 'MEI' | 'ME' | 'EPP' | 'Outro';
  simpleNational: boolean;
  emissionMode: 'manual' | 'national' | 'provider';
  provider: string;
  environment: 'homologation' | 'production';
  hasA1Certificate: boolean;
  certificateExpiresAt: string;
  portalAccessVerified: boolean;
  serviceCode: string;
  issRate: string;
}

const initialSettings: FiscalSettings = {
  companyCnpj: '',
  municipalRegistration: '',
  municipality: 'Presidente Médici',
  state: 'RO',
  taxRegime: 'ME',
  simpleNational: true,
  emissionMode: 'manual',
  provider: '',
  environment: 'homologation',
  hasA1Certificate: false,
  certificateExpiresAt: '',
  portalAccessVerified: false,
  serviceCode: '',
  issRate: ''
};

const steps = [
  { title: 'Empresa', icon: Building2 },
  { title: 'Emissão', icon: Plug },
  { title: 'Certificado', icon: FileKey },
  { title: 'Validação', icon: ShieldCheck }
];

export default function FiscalSettingsWizard({ user, onClose }: FiscalSettingsWizardProps) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<FiscalSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from('fiscal_settings')
      .select('*')
      .eq('accountId', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setMessage({
            type: 'error',
            text: error.message.includes('fiscal_settings')
              ? 'Aplique a migration fiscal no Supabase antes de salvar.'
              : error.message
          });
        } else if (data) {
          setSettings({
            companyCnpj: data.companyCnpj || '',
            municipalRegistration: data.municipalRegistration || '',
            municipality: data.municipality || 'Presidente Médici',
            state: data.state || 'RO',
            taxRegime: data.taxRegime || 'ME',
            simpleNational: data.simpleNational ?? true,
            emissionMode: data.emissionMode || 'manual',
            provider: data.provider || '',
            environment: data.environment || 'homologation',
            hasA1Certificate: data.hasA1Certificate ?? false,
            certificateExpiresAt: data.certificateExpiresAt || '',
            portalAccessVerified: data.portalAccessVerified ?? false,
            serviceCode: data.serviceCode || '',
            issRate: data.issRate?.toString() || ''
          });
        }
        setLoading(false);
      });
  }, [user.id]);

  const readiness = useMemo(() => {
    const checks = [
      { label: 'CNPJ informado', ready: settings.companyCnpj.replace(/\D/g, '').length === 14 },
      { label: 'Inscrição municipal informada', ready: Boolean(settings.municipalRegistration.trim()) },
      { label: 'Forma de emissão escolhida', ready: Boolean(settings.emissionMode) },
      { label: 'Acesso ao Portal Nacional testado', ready: settings.portalAccessVerified },
      {
        label: settings.emissionMode === 'provider' ? 'Provedor selecionado' : 'Configuração do emissor definida',
        ready: settings.emissionMode !== 'provider' || Boolean(settings.provider)
      }
    ];
    return { checks, ready: checks.every(check => check.ready) };
  }, [settings]);

  const update = <K extends keyof FiscalSettings>(field: K, value: FiscalSettings[K]) => {
    setSettings(current => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        accountId: user.id,
        ...settings,
        companyCnpj: settings.companyCnpj.replace(/\D/g, ''),
        certificateExpiresAt: settings.certificateExpiresAt || null,
        issRate: settings.issRate === '' ? null : Number(settings.issRate),
        provider: settings.emissionMode === 'provider' ? settings.provider : null,
        status: readiness.ready ? 'ready' : 'pending'
      };
      const { error } = await supabase
        .from('fiscal_settings')
        .upsert(payload, { onConflict: 'accountId' });
      if (error) throw error;
      setMessage({
        type: 'success',
        text: readiness.ready
          ? 'Configuração salva. O cadastro está pronto para conectar ao emissor fiscal.'
          : 'Rascunho salvo. Complete os itens pendentes antes da integração oficial.'
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível salvar a configuração.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="w-9 h-9 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
      <div className="min-h-full flex items-center justify-center">
        <div className="w-full max-w-4xl bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-2xl overflow-hidden">
          <div className="p-5 sm:p-7 border-b border-outline-variant/10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Configuração administrativa</p>
              <h2 className="text-2xl font-bold text-on-surface mt-1">Assistente fiscal NFS-e</h2>
              <p className="text-sm text-secondary mt-1">Presidente Médici–RO • Portal Nacional</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-secondary hover:bg-surface-container-low">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-[220px_1fr]">
            <aside className="p-5 bg-surface-container-low/60 border-r border-outline-variant/10">
              <div className="grid grid-cols-4 md:grid-cols-1 gap-2">
                {steps.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setStep(index)}
                      className={cn(
                        'flex flex-col md:flex-row items-center gap-2 md:gap-3 p-3 rounded-xl text-xs md:text-sm font-bold transition-all',
                        step === index ? 'bg-primary text-white shadow-md' : 'text-secondary hover:bg-surface-container-lowest'
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{index + 1}. {item.title}</span>
                    </button>
                  );
                })}
              </div>
              <div className="hidden md:block mt-7 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-secondary leading-relaxed">
                  Certificados e senhas não são armazenados nesta tela. A conexão segura será feita pelo backend.
                </p>
              </div>
            </aside>

            <main className="p-5 sm:p-8 min-h-[470px]">
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Dados fiscais da empresa</h3>
                    <p className="text-sm text-secondary mt-1">Informe os dados vinculados ao cadastro municipal.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="CNPJ">
                      <input value={settings.companyCnpj} onChange={e => update('companyCnpj', e.target.value)} placeholder="00.000.000/0000-00" className="fiscal-input" />
                    </Field>
                    <Field label="Inscrição municipal">
                      <input value={settings.municipalRegistration} onChange={e => update('municipalRegistration', e.target.value)} placeholder="Número da inscrição" className="fiscal-input" />
                    </Field>
                    <Field label="Município">
                      <input value={settings.municipality} disabled className="fiscal-input opacity-70" />
                    </Field>
                    <Field label="UF">
                      <input value={settings.state} disabled className="fiscal-input opacity-70" />
                    </Field>
                    <Field label="Enquadramento">
                      <select value={settings.taxRegime} onChange={e => update('taxRegime', e.target.value as FiscalSettings['taxRegime'])} className="fiscal-input">
                        <option value="MEI">MEI</option>
                        <option value="ME">ME</option>
                        <option value="EPP">EPP</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </Field>
                    <Field label="Simples Nacional">
                      <select value={settings.simpleNational ? 'yes' : 'no'} onChange={e => update('simpleNational', e.target.value === 'yes')} className="fiscal-input">
                        <option value="yes">Sim</option>
                        <option value="no">Não</option>
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Forma de emissão</h3>
                    <p className="text-sm text-secondary mt-1">Escolha como o CRM trabalhará com a NFS-e.</p>
                  </div>
                  <div className="grid gap-3">
                    {[
                      ['manual', 'Controle manual', 'O CRM registra a nota, mas a emissão é feita no Portal Nacional.'],
                      ['national', 'Integração direta', 'Preparar conexão direta com o padrão nacional por backend seguro.'],
                      ['provider', 'Provedor fiscal', 'Usar uma empresa intermediária para emissão, consulta e cancelamento.']
                    ].map(([value, title, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update('emissionMode', value as FiscalSettings['emissionMode'])}
                        className={cn(
                          'text-left p-4 rounded-2xl border transition-all',
                          settings.emissionMode === value ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-outline-variant/15 hover:border-primary/40'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn('mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center', settings.emissionMode === value && 'bg-primary border-primary text-white')}>
                            {settings.emissionMode === value && <Check className="w-3 h-3" />}
                          </span>
                          <span>
                            <span className="block font-bold text-on-surface">{title}</span>
                            <span className="block text-sm text-secondary mt-1">{description}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {settings.emissionMode === 'provider' && (
                    <Field label="Provedor">
                      <select value={settings.provider} onChange={e => update('provider', e.target.value)} className="fiscal-input">
                        <option value="">Selecione depois da contratação</option>
                        <option value="Focus NFe">Focus NFe</option>
                        <option value="Nuvem Fiscal">Nuvem Fiscal</option>
                        <option value="PlugNotas">PlugNotas</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Ambiente">
                    <select value={settings.environment} onChange={e => update('environment', e.target.value as FiscalSettings['environment'])} className="fiscal-input">
                      <option value="homologation">Homologação (testes)</option>
                      <option value="production">Produção (emissão oficial)</option>
                    </select>
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Certificado e acesso</h3>
                    <p className="text-sm text-secondary mt-1">Registre a situação atual sem enviar segredos pelo navegador.</p>
                  </div>
                  <label className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low cursor-pointer">
                    <input type="checkbox" checked={settings.hasA1Certificate} onChange={e => update('hasA1Certificate', e.target.checked)} className="mt-1 accent-primary" />
                    <span>
                      <span className="block font-bold text-on-surface">A empresa possui certificado digital A1</span>
                      <span className="block text-sm text-secondary mt-1">O upload seguro será habilitado somente após a escolha da API fiscal.</span>
                    </span>
                  </label>
                  {settings.hasA1Certificate && (
                    <Field label="Validade do certificado">
                      <input type="date" value={settings.certificateExpiresAt} onChange={e => update('certificateExpiresAt', e.target.value)} className="fiscal-input" />
                    </Field>
                  )}
                  <label className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low cursor-pointer">
                    <input type="checkbox" checked={settings.portalAccessVerified} onChange={e => update('portalAccessVerified', e.target.checked)} className="mt-1 accent-primary" />
                    <span>
                      <span className="block font-bold text-on-surface">Acesso ao Portal Nacional confirmado</span>
                      <span className="block text-sm text-secondary mt-1">Marque após conseguir entrar e consultar os dados da empresa.</span>
                    </span>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Código municipal do serviço">
                      <input value={settings.serviceCode} onChange={e => update('serviceCode', e.target.value)} placeholder="Definir com o contador" className="fiscal-input" />
                    </Field>
                    <Field label="Alíquota ISS (%)">
                      <input type="number" min="0" max="100" step="0.01" value={settings.issRate} onChange={e => update('issRate', e.target.value)} placeholder="Ex.: 5,00" className="fiscal-input" />
                    </Field>
                  </div>
                  <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-sm text-secondary">
                    Confirme código de serviço, alíquota e retenções com o contador antes de emitir em produção.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Validação da configuração</h3>
                    <p className="text-sm text-secondary mt-1">Confira o que está pronto e o que ainda precisa ser informado.</p>
                  </div>
                  <div className="space-y-3">
                    {readiness.checks.map(check => (
                      <div key={check.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low">
                        <span className={cn('w-7 h-7 rounded-full flex items-center justify-center', check.ready ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')}>
                          {check.ready ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">!</span>}
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{check.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={cn('p-5 rounded-2xl border', readiness.ready ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20')}>
                    <div className="flex gap-3">
                      <CheckCircle2 className={cn('w-6 h-6 shrink-0', readiness.ready ? 'text-green-600' : 'text-amber-600')} />
                      <div>
                        <p className="font-bold text-on-surface">{readiness.ready ? 'Cadastro fiscal pronto' : 'Configuração incompleta'}</p>
                        <p className="text-sm text-secondary mt-1">
                          {readiness.ready
                            ? 'Os dados podem ser conectados ao emissor quando a API for contratada e configurada.'
                            : 'Você pode salvar como rascunho e concluir as informações posteriormente.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div className={cn('mt-6 p-3.5 rounded-xl text-sm font-medium', message.type === 'success' ? 'bg-green-500/10 text-green-700' : 'bg-error/10 text-error')}>
                  {message.text}
                </div>
              )}

              <div className="mt-8 pt-5 border-t border-outline-variant/10 flex flex-wrap items-center justify-between gap-3">
                <button type="button" disabled={step === 0} onClick={() => setStep(current => current - 1)} className="px-4 py-2.5 rounded-xl font-bold text-secondary hover:bg-surface-container-low disabled:opacity-30 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={save} disabled={saving} className="px-4 py-2.5 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/15 flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                  {step < steps.length - 1 && (
                    <button type="button" onClick={() => setStep(current => current + 1)} className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white flex items-center gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      {children}
    </label>
  );
}
