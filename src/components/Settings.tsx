import React, { useState, useEffect } from 'react';
import { Building2, Upload, Download, Trash2, Save, Globe, Mail, Call as Phone, LocationOn as MapPin, Users, UserPlus, Shield, Loader2, Edit2, X, Search, AlertTriangle, ChevronRight } from './Icons';
import { SystemUser, Settings as SettingsType, User } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsProps {
  user: User;
  companyLogo: string | null;
  onLogoChange: (logo: string | null) => void;
  settings: SettingsType;
  onSave: (settings: SettingsType) => Promise<void>;
}

export default function Settings({ user, companyLogo, onLogoChange, settings, onSave }: SettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'empresa' | 'usuarios'>('empresa');
  
  // Company Settings State
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [cnpj, setCnpj] = useState(settings.cnpj);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [website, setWebsite] = useState(settings.website);
  const [saving, setSaving] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [restoreBackup, setRestoreBackup] = useState<any | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState('');
  const [restoring, setRestoring] = useState(false);

  // User Management State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    username: '',
    role: '',
    privilege: 'Técnico' as SystemUser['privilege'],
    status: 'Ativo' as SystemUser['status']
  });

  useEffect(() => {
    supabase
      .from('backup_history')
      .select('createdAt')
      .eq('accountId', user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setLastBackupAt(data?.createdAt || null);
      });
  }, [user.id]);

  useEffect(() => {
    if (activeSubTab === 'usuarios' && user) {
      setLoadingUsers(true);
      
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('systemUsers')
          .select('*')
          .eq('userId', user.id)
          .order('createdAt', { ascending: false });

        if (error) {
          console.error('Error fetching system users:', error);
        } else {
          setSystemUsers(data as SystemUser[]);
        }
        setLoadingUsers(false);
      };

      fetchUsers();

      // Set up real-time subscription
      const channel = supabase
        .channel('system-users-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'systemUsers' }, (payload) => {
          const isRelevant = 
            (payload.new && (payload.new as SystemUser).userId === user.id) || 
            (payload.old && (payload.old as SystemUser).userId === user.id) ||
            payload.eventType === 'DELETE';
            
          if (isRelevant) {
            if (payload.eventType === 'INSERT') {
              setSystemUsers(prev => {
                if (prev.some(u => u.id === payload.new.id)) return prev;
                return [payload.new as SystemUser, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setSystemUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new as SystemUser : u));
            } else if (payload.eventType === 'DELETE') {
              setSystemUsers(prev => prev.filter(u => u.id !== payload.old.id));
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeSubTab, user]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onLogoChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        companyName,
        cnpj,
        email,
        phone,
        address,
        website
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    setBackupMessage(null);

    try {
      const tables = [
        'settings',
        'contacts',
        'products',
        'serviceOrders',
        'transactions',
        'invoices',
        'systemUsers',
        'notifications'
      ] as const;

      const results = await Promise.all(
        tables.map(async table => {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('userId', user.id);
          if (error) throw new Error(`${table}: ${error.message}`);
          return [table, data || []] as const;
        })
      );

      const generatedAt = new Date();
      const fileName = `backup-crm-${generatedAt.toISOString().slice(0, 10)}.json`;
      const recordCounts = Object.fromEntries(results.map(([table, rows]) => [table, rows.length]));
      const backup = {
        format: 'cardoso-ar-crm-backup',
        version: 1,
        generatedAt: generatedAt.toISOString(),
        accountId: user.id,
        data: Object.fromEntries(results)
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const { error: historyError } = await supabase.from('backup_history').insert({
        accountId: user.id,
        createdBy: user.authId || user.id,
        fileName,
        recordCounts
      });
      if (historyError) throw historyError;
      setLastBackupAt(generatedAt.toISOString());
      setBackupMessage('Backup gerado e baixado com sucesso.');
    } catch (error: any) {
      console.error('Error exporting backup:', error);
      setBackupMessage(`Não foi possível gerar o backup: ${error.message || 'erro desconhecido'}`);
    } finally {
      setExportingBackup(false);
    }
  };

  const handleBackupFile = async (file?: File) => {
    setRestoreBackup(null);
    setRestoreConfirmation('');
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.format !== 'cardoso-ar-crm-backup' || parsed?.version !== 1 || !parsed?.data) {
        throw new Error('Formato de backup inválido ou incompatível.');
      }
      if (parsed.accountId !== user.id) {
        throw new Error('Este backup pertence a outra conta do CRM.');
      }
      setRestoreBackup(parsed);
      setBackupMessage('Arquivo validado. Confira os totais antes de restaurar.');
    } catch (error: any) {
      setBackupMessage(`Backup recusado: ${error.message || 'arquivo inválido'}`);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreBackup || restoreConfirmation !== 'RESTAURAR') return;
    setRestoring(true);
    setBackupMessage(null);

    try {
      const data = restoreBackup.data as Record<string, any[]>;
      const restoreTable = async (table: string, rows: any[] = []) => {
        if (!rows.length) return;
        const normalized = rows.map(row => ({ ...row, userId: user.id }));
        for (let index = 0; index < normalized.length; index += 250) {
          const { error } = await supabase.from(table).upsert(normalized.slice(index, index + 250), { onConflict: 'id' });
          if (error) throw new Error(`${table}: ${error.message}`);
        }
      };

      if (data.settings?.[0]) {
        const { error } = await supabase
          .from('settings')
          .update({ ...data.settings[0], userId: user.id })
          .eq('userId', user.id);
        if (error) throw new Error(`settings: ${error.message}`);
      }

      await restoreTable('contacts', data.contacts);
      await restoreTable('products', data.products);
      await restoreTable('serviceOrders', data.serviceOrders);
      await restoreTable('transactions', data.transactions);
      await restoreTable('invoices', data.invoices);
      await restoreTable('notifications', data.notifications);

      setBackupMessage('Restauração concluída. Atualize a página para carregar os dados recuperados.');
      setRestoreBackup(null);
      setRestoreConfirmation('');
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      setBackupMessage(`Restauração interrompida: ${error.message || 'erro desconhecido'}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (editingUser) {
        const payload = { ...userData };
        delete (payload as any).id;
        delete (payload as any).createdAt;
        
        const { error } = await supabase
          .from('systemUsers')
          .update(payload)
          .eq('id', editingUser.id);
        
        if (error) throw error;
      } else {
        const payload = {
          ...userData,
          userId: user.id
        };
        delete (payload as any).id;
        delete (payload as any).createdAt;
        
        const { error } = await supabase
          .from('systemUsers')
          .insert(payload);
        
        if (error) throw error;
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserData({ name: '', email: '', username: '', role: '', privilege: 'Técnico', status: 'Ativo' });
    } catch (error) {
      console.error('Error saving system user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('systemUsers')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting system user:', error);
    }
  };

  const openEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setUserData({
      name: user.name,
      email: user.email,
      username: user.username || '',
      role: user.role,
      privilege: user.privilege,
      status: user.status || 'Ativo'
    });
    setShowUserModal(true);
  };

  const filteredUsers = systemUsers.filter(user => 
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const backupOverdue = !lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-4xl font-bold font-headline tracking-tight text-on-surface">Configurações</h2>
          </div>
          <p className="text-secondary font-medium text-lg">Personalize sua experiência e gerencie sua equipe.</p>
        </div>
        
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10 shadow-inner">
          <button 
            onClick={() => setActiveSubTab('empresa')}
            className={cn(
              "relative px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all overflow-hidden",
              activeSubTab === 'empresa' ? "text-white" : "text-secondary hover:bg-surface-container-high"
            )}
          >
            {activeSubTab === 'empresa' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-primary shadow-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">Empresa</span>
          </button>
          <button 
            onClick={() => setActiveSubTab('usuarios')}
            className={cn(
              "relative px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all overflow-hidden",
              activeSubTab === 'usuarios' ? "text-white" : "text-secondary hover:bg-surface-container-high"
            )}
          >
            {activeSubTab === 'usuarios' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-primary shadow-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">Usuários</span>
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeSubTab === 'empresa' ? (
          <motion.div 
            key="empresa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Company Profile Bento Card */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-surface-container-lowest p-10 rounded-3xl shadow-sm border border-outline-variant/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold font-headline text-on-surface">Perfil da Empresa</h3>
                      <p className="text-xs text-secondary font-bold uppercase tracking-[0.2em]">Identidade & Contato</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Nome Fantasia</label>
                      <input 
                        type="text" 
                        value={companyName || ''}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        placeholder="Nome da sua empresa"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">CNPJ</label>
                      <div className="relative">
                        <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input 
                          type="text" 
                          value={cnpj || ''}
                          onChange={(e) => setCnpj(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Website Oficial</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input 
                          type="text" 
                          value={website || ''}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="www.suaempresa.com.br"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">E-mail Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input 
                          type="email" 
                          value={email || ''}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="contato@empresa.com"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Telefone Principal</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input 
                          type="text" 
                          value={phone || ''}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Localização / Sede</label>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                        <input 
                          type="text" 
                          value={address || ''}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Endereço completo"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className={cn(
                "p-4 rounded-2xl border flex items-center gap-3",
                backupOverdue ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
              )}>
                <Shield className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{backupOverdue ? 'Backup semanal pendente' : 'Backup semanal em dia'}</p>
                  <p className="text-xs opacity-80">
                    {lastBackupAt ? `Último backup: ${new Date(lastBackupAt).toLocaleString('pt-BR')}` : 'Nenhum backup registrado. Baixe a primeira cópia agora.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button
                  onClick={handleExportBackup}
                  disabled={exportingBackup}
                  className="bg-surface-container-lowest text-primary border border-primary/20 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-sm hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {exportingBackup ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {exportingBackup ? 'Gerando...' : 'Baixar Backup'}
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="milled-gradient text-white px-10 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
              {backupMessage && (
                <p className="text-sm text-secondary text-right">{backupMessage}</p>
              )}
              <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 space-y-4">
                <div>
                  <h4 className="font-bold text-on-surface">Restaurar backup</h4>
                  <p className="text-xs text-secondary mt-1">Mescla o arquivo com os dados atuais sem excluir registros. Usuários e senhas não são restaurados.</p>
                </div>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={event => void handleBackupFile(event.target.files?.[0])}
                  className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-bold"
                />
                {restoreBackup && (
                  <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {Object.entries(restoreBackup.data as Record<string, any[]>)
                        .filter(([table]) => table !== 'systemUsers')
                        .map(([table, rows]) => (
                          <div key={table} className="bg-surface-container-lowest rounded-xl p-3">
                            <p className="text-secondary">{table}</p>
                            <p className="font-bold text-on-surface text-lg">{Array.isArray(rows) ? rows.length : 0}</p>
                          </div>
                        ))}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary">Digite RESTAURAR para confirmar</label>
                      <input
                        value={restoreConfirmation}
                        onChange={event => setRestoreConfirmation(event.target.value)}
                        className="mt-2 w-full bg-surface-container-lowest rounded-xl px-4 py-3 outline-none"
                        placeholder="RESTAURAR"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreBackup}
                      disabled={restoreConfirmation !== 'RESTAURAR' || restoring}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
                      {restoring ? 'Restaurando...' : 'Restaurar dados'}
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* Logo Bento Card */}
            <div className="space-y-8">
              <section className="bg-surface-container-lowest p-10 rounded-3xl shadow-sm border border-outline-variant/10 h-full flex flex-col">
                <div className="mb-10">
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Logo da Marca</h3>
                  <p className="text-xs text-secondary font-bold uppercase tracking-[0.2em] mt-1">Visual do Sistema</p>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center gap-10">
                  <div className="relative group">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="w-48 h-48 bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 shadow-inner"
                    >
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-4" />
                      ) : (
                        <Building2 className="w-16 h-16 text-secondary/20" />
                      )}
                    </motion.div>
                    {companyLogo && (
                      <button 
                        onClick={() => onLogoChange(null)}
                        className="absolute -top-3 -right-3 w-10 h-10 bg-error text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    <label className="w-full flex flex-col items-center justify-center gap-3 py-6 bg-surface-container-low border border-outline-variant/20 rounded-3xl cursor-pointer hover:bg-surface-container-high transition-all group">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-secondary uppercase tracking-widest">Carregar Nova Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                    <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/20">
                      <p className="text-xs text-secondary/60 text-center font-bold uppercase tracking-widest leading-relaxed">
                        PNG, SVG ou JPG<br />Mínimo 512x512px recomendado
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="usuarios"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <section className="bg-surface-container-lowest p-10 rounded-3xl shadow-sm border border-outline-variant/10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-headline text-on-surface">Gestão de Usuários</h3>
                    <p className="text-xs text-secondary font-bold uppercase tracking-[0.2em]">Controle de Acessos</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative min-w-[300px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/40" />
                    <input 
                      type="text"
                      placeholder="Pesquisar equipe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl py-4 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setUserData({ name: '', email: '', username: '', role: '', privilege: 'Técnico', status: 'Ativo' });
                      setShowUserModal(true);
                    }}
                    className="px-8 py-4 milled-gradient text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <UserPlus className="w-5 h-5" />
                    Novo Usuário
                  </button>
                </div>
              </div>

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <Users className="absolute inset-0 m-auto w-6 h-6 text-primary/30" />
                  </div>
                  <p className="text-xs font-bold text-secondary/40 uppercase tracking-[0.4em]">Sincronizando Equipe...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-32 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20">
                  <div className="w-20 h-20 bg-surface-container-low rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-secondary/20" />
                  </div>
                  <h4 className="text-xl font-bold text-on-surface mb-2">Nenhum usuário encontrado</h4>
                  <p className="text-sm text-secondary font-medium max-w-xs mx-auto">
                    {searchQuery ? 'Tente ajustar os termos da sua pesquisa.' : 'Comece adicionando novos membros à sua equipe.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredUsers.map((user) => (
                    <motion.div 
                      layout
                      key={user.id} 
                      className={cn(
                        "bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 group hover:border-primary/30 transition-all relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1",
                        user.status === 'Inativo' && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      {user.status === 'Inativo' && (
                        <div className="absolute top-0 right-0 bg-error/10 text-error text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl">
                          Inativo
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-2xl relative shadow-inner">
                            {user.name.charAt(0).toUpperCase()}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-surface-container-low shadow-sm",
                              user.status === 'Ativo' ? "bg-success" : "bg-error"
                            )}></div>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-on-surface leading-tight">{user.name}</h4>
                            <p className="text-sm text-secondary font-medium">{user.email}</p>
                            {user.username && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Login:</span>
                                <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{user.username}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-secondary/50 uppercase tracking-widest">Cargo / Função</p>
                            <p className="text-sm font-bold text-on-surface truncate">{user.role || 'Não definido'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-secondary/50 uppercase tracking-widest">Privilégio</p>
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-primary" />
                              <p className="text-sm font-bold text-primary">{user.privilege}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-6 border-t border-outline-variant/10">
                          <button 
                            onClick={() => openEditUser(user)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-container-high hover:bg-primary/10 text-secondary hover:text-primary rounded-xl font-bold text-xs transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button 
                            onClick={() => setShowDeleteConfirm(user.id)}
                            className="w-12 flex items-center justify-center py-3 bg-surface-container-high hover:bg-error/10 text-secondary hover:text-error rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-container-lowest max-w-lg w-full rounded-3xl p-10 shadow-2xl border border-outline-variant/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <UserPlus className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold font-headline text-on-surface">{editingUser ? 'Editar Perfil' : 'Novo Membro'}</h3>
                      <p className="text-xs text-secondary uppercase tracking-[0.2em] font-bold">Gestão de Equipe</p>
                    </div>
                  </div>
                  <button onClick={() => setShowUserModal(false)} className="w-12 h-12 hover:bg-surface-container rounded-2xl transition-all flex items-center justify-center group">
                    <X className="w-6 h-6 text-secondary group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        value={userData.name || ''}
                        onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        placeholder="Nome do colaborador"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">E-mail Profissional</label>
                      <input 
                        type="email" 
                        required
                        value={userData.email || ''}
                        onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        placeholder="email@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Login / Usuário</label>
                      <input 
                        type="text" 
                        required
                        value={userData.username || ''}
                        onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="ex: joao.silva"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      />
                    </div>
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-secondary">
                      A senha não é armazenada pelo CRM. O acesso deve ser criado e redefinido com segurança pelo Supabase Auth.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Cargo / Função</label>
                      <input 
                        type="text" 
                        required
                        value={userData.role || ''}
                        onChange={(e) => setUserData(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="ex: Técnico HVAC"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Status da Conta</label>
                      <div className="relative">
                        <select 
                          value={userData.status}
                          onChange={(e) => setUserData(prev => ({ ...prev, status: e.target.value as any }))}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold text-on-surface"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/40 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-secondary/60 ml-1">Nível de Privilégio</label>
                    <div className="relative">
                      <select 
                        value={userData.privilege}
                        onChange={(e) => setUserData(prev => ({ ...prev, privilege: e.target.value as any }))}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none font-bold text-primary"
                      >
                        <option value="Admin">Administrador (Acesso Total)</option>
                        <option value="Técnico">Técnico (Ordens de Serviço)</option>
                        <option value="Vendedor">Vendedor (Leads & Vendas)</option>
                        <option value="Visualizador">Visualizador (Apenas Leitura)</option>
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="w-full py-5 milled-gradient text-white rounded-3xl font-bold text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingUser ? 'Atualizar Membro' : 'Confirmar Cadastro')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-container-lowest max-w-sm w-full rounded-3xl p-10 shadow-2xl border border-outline-variant/10 text-center"
            >
              <div className="w-20 h-20 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <AlertTriangle className="w-10 h-10 text-error" />
              </div>
              <h3 className="text-2xl font-bold font-headline text-on-surface mb-3">Remover Usuário?</h3>
              <p className="text-sm text-secondary font-medium mb-10 leading-relaxed">Esta ação é irreversível. O colaborador perderá acesso imediato a todas as ferramentas do sistema.</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-4 bg-surface-container-low text-secondary font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-surface-container-high transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  className="w-full py-4 bg-error text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirmar Remoção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
