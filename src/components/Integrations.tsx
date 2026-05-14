import React, { useState, useEffect } from 'react';
import { Plug, Save, CheckCircle, Smartphone, Mail, Workflow } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface IntegrationsProps {
  user: User;
}

export interface IntegrationSettings {
  n8n: {
    webhookUrl: string;
    authType: 'none' | 'bearer' | 'basic';
    token: string;
    username?: string;
    password?: string;
  };
  emailType: 'sendgrid' | 'nodemailer' | 'none';
  sendgrid: {
    apiKey: string;
    fromEmail: string;
  };
  nodemailer: {
    host: string;
    port: string;
    user: string;
    pass: string;
    fromEmail: string;
  };
  chatwoot: {
    baseUrl: string;
    accountId: string;
    inboxId: string;
    apiAccessToken: string;
  };
}

const defaultSettings: IntegrationSettings = {
  n8n: { webhookUrl: '', authType: 'none', token: '' },
  emailType: 'none',
  sendgrid: { apiKey: '', fromEmail: '' },
  nodemailer: { host: '', port: '', user: '', pass: '', fromEmail: '' },
  chatwoot: { baseUrl: 'https://app.chatwoot.com', accountId: '', inboxId: '', apiAccessToken: '' }
};

export default function Integrations({ user }: IntegrationsProps) {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'n8n' | 'email' | 'chatwoot'>('n8n');

  useEffect(() => {
    const savedSettings = localStorage.getItem('@cardoso:integrations');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem('@cardoso:integrations', JSON.stringify(settings));
    
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  const updateSettings = (tab: keyof IntegrationSettings, field: string, value: string) => {
    if (tab === 'emailType') {
      setSettings(prev => ({ ...prev, emailType: value as any }));
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab as keyof IntegrationSettings] as any,
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">Integrações</h1>
        <p className="text-secondary font-medium">Conecte sua conta a serviços externos (N8N, Email, Chatwoot).</p>
      </div>

      <div className="flex border-b border-outline-variant/30 mb-6">
        <button
          onClick={() => setActiveTab('n8n')}
          className={cn(
            "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors",
            activeTab === 'n8n' ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-on-surface"
          )}
        >
          <Workflow className="w-4 h-4" />
          N8N
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={cn(
            "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors",
            activeTab === 'email' ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-on-surface"
          )}
        >
          <Mail className="w-4 h-4" />
          Email Server
        </button>
        <button
          onClick={() => setActiveTab('chatwoot')}
          className={cn(
            "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors",
            activeTab === 'chatwoot' ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-on-surface"
          )}
        >
          <Smartphone className="w-4 h-4" />
          Chatwoot (WhatsApp)
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-sm">
        {activeTab === 'n8n' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-headline mb-2">Configuração do N8N</h2>
              <p className="text-secondary text-sm">Integre com seus fluxos do N8N enviando webhooks em eventos do sistema.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Webhook URL Global</label>
                <input
                  type="url"
                  placeholder="https://n8n.exemplo.com/webhook/..."
                  value={settings.n8n.webhookUrl}
                  onChange={(e) => updateSettings('n8n', 'webhookUrl', e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Autenticação</label>
                  <select
                    value={settings.n8n.authType}
                    onChange={(e) => updateSettings('n8n', 'authType', e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="none">Nenhuma</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                {settings.n8n.authType === 'bearer' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Token</label>
                    <input
                      type="password"
                      value={settings.n8n.token}
                      onChange={(e) => updateSettings('n8n', 'token', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                )}
                {settings.n8n.authType === 'basic' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Usuário</label>
                      <input
                        type="text"
                        value={settings.n8n.username || ''}
                        onChange={(e) => updateSettings('n8n', 'username', e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Senha</label>
                      <input
                        type="password"
                        value={settings.n8n.password || ''}
                        onChange={(e) => updateSettings('n8n', 'password', e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'email' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-headline mb-2">Serviço de Email (Lembretes)</h2>
              <p className="text-secondary text-sm">Configure o provedor para envio de lembretes e notas fiscais por email.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Provedor de Email</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low px-4 py-3 border border-outline-variant/20 rounded-xl">
                    <input type="radio" value="none" checked={settings.emailType === 'none'} onChange={(e) => updateSettings('emailType', '', e.target.value)} className="accent-primary" />
                    <span className="text-sm font-bold">Nenhum</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low px-4 py-3 border border-outline-variant/20 rounded-xl">
                    <input type="radio" value="sendgrid" checked={settings.emailType === 'sendgrid'} onChange={(e) => updateSettings('emailType', '', e.target.value)} className="accent-primary" />
                    <span className="text-sm font-bold">SendGrid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low px-4 py-3 border border-outline-variant/20 rounded-xl">
                    <input type="radio" value="nodemailer" checked={settings.emailType === 'nodemailer'} onChange={(e) => updateSettings('emailType', '', e.target.value)} className="accent-primary" />
                    <span className="text-sm font-bold">SMTP (Nodemailer)</span>
                  </label>
                </div>
              </div>

              {settings.emailType === 'sendgrid' && (
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">SendGrid API Key</label>
                    <input
                      type="password"
                      value={settings.sendgrid.apiKey}
                      onChange={(e) => updateSettings('sendgrid', 'apiKey', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Email de Remetente (From)</label>
                    <input
                      type="email"
                      value={settings.sendgrid.fromEmail}
                      onChange={(e) => updateSettings('sendgrid', 'fromEmail', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              )}

              {settings.emailType === 'nodemailer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Servidor SMTP</label>
                    <input
                      type="text"
                      placeholder="smtp.exemplo.com"
                      value={settings.nodemailer.host}
                      onChange={(e) => updateSettings('nodemailer', 'host', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Porta</label>
                    <input
                      type="number"
                      placeholder="587"
                      value={settings.nodemailer.port}
                      onChange={(e) => updateSettings('nodemailer', 'port', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Usuário</label>
                    <input
                      type="text"
                      value={settings.nodemailer.user}
                      onChange={(e) => updateSettings('nodemailer', 'user', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Senha</label>
                    <input
                      type="password"
                      value={settings.nodemailer.pass}
                      onChange={(e) => updateSettings('nodemailer', 'pass', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Email de Remetente (From)</label>
                    <input
                      type="email"
                      value={settings.nodemailer.fromEmail}
                      onChange={(e) => updateSettings('nodemailer', 'fromEmail', e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'chatwoot' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-headline mb-2">Configuração Chatwoot</h2>
              <p className="text-secondary text-sm">Dispare mensagens de WhatsApp automatizadas pela sua API do Chatwoot.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">URL Base do Chatwoot</label>
                <input
                  type="url"
                  placeholder="https://app.chatwoot.com"
                  value={settings.chatwoot.baseUrl}
                  onChange={(e) => updateSettings('chatwoot', 'baseUrl', e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Account ID</label>
                <input
                  type="text"
                  placeholder="Ex: 1"
                  value={settings.chatwoot.accountId}
                  onChange={(e) => updateSettings('chatwoot', 'accountId', e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">Inbox ID (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="Ex: 15"
                  value={settings.chatwoot.inboxId}
                  onChange={(e) => updateSettings('chatwoot', 'inboxId', e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">User API Access Token</label>
                <input
                  type="password"
                  placeholder="Token de acesso da API"
                  value={settings.chatwoot.apiAccessToken}
                  onChange={(e) => updateSettings('chatwoot', 'apiAccessToken', e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
