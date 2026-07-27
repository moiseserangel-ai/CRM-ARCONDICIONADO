import React, { lazy, Suspense, useState, useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { View, Contact, Product, Transaction, Settings as SettingsType, Invoice, User } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { SmartToy, Loader2, Mail, Lock, User as UserIcon, Wind, Snowflake, AlertTriangle } from './components/Icons';
import { cn } from './lib/utils';

const Sidebar = lazy(() => import('./components/Sidebar'));
const TopBar = lazy(() => import('./components/TopBar'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Pipeline = lazy(() => import('./components/Pipeline'));
const Contacts = lazy(() => import('./components/Contacts'));
const ContactDetail = lazy(() => import('./components/ContactDetail'));
const ContactForm = lazy(() => import('./components/ContactForm'));
const Products = lazy(() => import('./components/Products'));
const ProductForm = lazy(() => import('./components/ProductForm'));
const Finance = lazy(() => import('./components/Finance'));
const FinanceForm = lazy(() => import('./components/FinanceForm'));
const Invoices = lazy(() => import('./components/Invoices'));
const InvoiceForm = lazy(() => import('./components/InvoiceForm'));
const Settings = lazy(() => import('./components/Settings'));
const Integrations = lazy(() => import('./components/Integrations'));
const Reports = lazy(() => import('./components/Reports'));
const Activities = lazy(() => import('./components/Activities'));

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(localStorage.getItem('companyLogo'));
  const [settings, setSettings] = useState<SettingsType>({
    companyName: 'Cardoso Ar Condicionado',
    cnpj: '',
    email: 'contato@cardosoar.com.br',
    phone: '(11) 99999-9999',
    address: 'São Paulo, SP',
    website: 'www.cardosoar.com.br'
  });
  const [toast, setToast] = useState<{ message: string; subtext: string; type: 'success' | 'error' } | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuthenticatedUser = async (authUser: any) => {
      if (!authUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      const { data, error } = await supabase.rpc('get_access_context');
      const access = Array.isArray(data) ? data[0] : data;

      if (error || !access?.account_id || access.status !== 'Ativo') {
        console.error('Error loading access context:', error);
        setLoginError('Seu usuário não está ativo ou ainda não foi vinculado a uma empresa.');
        await supabase.auth.signOut();
        setUser(null);
        setAuthReady(true);
        return;
      }

      setUser({
        id: access.account_id,
        authId: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
        privilege: access.privilege,
        isOwner: access.is_owner
      });
      setAuthReady(true);
    };

    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error.message);
        // If there's an error getting the session (e.g., invalid refresh token), sign out
        supabase.auth.signOut().catch(console.error);
        // Force clear any stale refresh tokens from local storage
        if (error.message.includes('Refresh Token') || error.message.includes('refresh_token')) {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
      void loadAuthenticatedUser(session?.user ?? null);
    }).catch(err => {
      console.error('Unexpected error getting session:', err);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } else {
        setAuthReady(false);
        void loadAuthenticatedUser(session?.user ?? null);
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          companyName: data.companyName || 'Cardoso Ar Condicionado',
          cnpj: data.cnpj || '',
          email: data.email || 'contato@cardosoar.com.br',
          phone: data.phone || '(11) 99999-9999',
          address: data.address || 'São Paulo, SP',
          website: data.website || 'www.cardosoar.com.br'
        });
        if (data.companyName) {
          localStorage.setItem('companyName', data.companyName);
        }
        if (data.logo) {
          setCompanyLogo(data.logo);
          localStorage.setItem('companyLogo', data.logo);
        }
      }
    };

    fetchSettings();

    // Set up real-time subscription for settings
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'settings',
      }, (payload) => {
        if (payload.new && (payload.new as any).userId === user.id) {
          const data = payload.new;
          setSettings({
            companyName: data.companyName || 'Cardoso Ar Condicionado',
            cnpj: data.cnpj || '',
            email: data.email || 'contato@cardosoar.com.br',
            phone: data.phone || '(11) 99999-9999',
            address: data.address || 'São Paulo, SP',
            website: data.website || 'www.cardosoar.com.br'
          });
          if (data.logo) {
            setCompanyLogo(data.logo);
            localStorage.setItem('companyLogo', data.logo);
          }
          if (data.companyName) {
            localStorage.setItem('companyName', data.companyName);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Inactivity Timeout
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 30 minutes = 30 * 60 * 1000 = 1800000 ms
      timeoutId = setTimeout(() => {
        supabase.auth.signOut();
        showToast('Sessão Expirada', 'Você foi desconectado por inatividade.', 'error');
      }, 1800000);
    };

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const showToast = (message: string, subtext: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, subtext, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (value?: any) => {
      const text = String(value ?? '');
      const isError = /erro|inválid|insuficiente|não foi possível/i.test(text);
      const isSuccess = /sucesso|atualizad|finalizad|aberta/i.test(text);
      showToast(
        isError ? 'Não foi possível concluir' : isSuccess ? 'Operação concluída' : 'Atenção',
        text,
        isError ? 'error' : 'success'
      );
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  const canAccessView = (view: View) => {
    const privilege = user?.privilege || 'Visualizador';
    if (privilege === 'Admin') return true;

    const viewsByPrivilege: Record<Exclude<NonNullable<User['privilege']>, 'Admin'>, View[]> = {
      'Técnico': ['dashboard', 'contacts', 'contact-detail', 'contact-form', 'products', 'pipeline', 'reports'],
      'Vendedor': ['dashboard', 'contacts', 'contact-detail', 'contact-form', 'products', 'finance', 'finance-form', 'expenses', 'expenses-form', 'invoices', 'invoice-form', 'pipeline', 'reports'],
      'Visualizador': ['dashboard', 'contacts', 'contact-detail', 'products', 'finance', 'expenses', 'invoices', 'pipeline', 'reports']
    };

    return viewsByPrivilege[privilege].includes(view);
  };

  const handleViewChange = (view: View) => {
    if (!canAccessView(view)) {
      showToast('Acesso Restrito', 'Seu perfil não possui permissão para acessar esta função.', 'error');
      return;
    }
    setCurrentView(view);
    setSelectedContact(null);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentView('contact-detail');
  };

  const handleEditContact = (contact: Contact) => {
    if (!canAccessView('contact-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar os cadastros.', 'error');
      return;
    }
    setSelectedContact(contact);
    setCurrentView('contact-form');
  };

  const handleAddContact = () => {
    if (!canAccessView('contact-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar os cadastros.', 'error');
      return;
    }
    setSelectedContact(null);
    setCurrentView('contact-form');
  };

  const handleAddProduct = () => {
    if (!canAccessView('product-form')) {
      showToast('Acesso Restrito', 'Somente administradores podem alterar produtos.', 'error');
      return;
    }
    setSelectedProduct(null);
    setCurrentView('product-form');
  };

  const handleEditProduct = (product: Product) => {
    if (!canAccessView('product-form')) {
      showToast('Acesso Restrito', 'Somente administradores podem alterar produtos.', 'error');
      return;
    }
    setSelectedProduct(product);
    setCurrentView('product-form');
  };

  const handleAddTransaction = () => {
    if (!canAccessView('finance-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar as finanças.', 'error');
      return;
    }
    setSelectedTransaction(null);
    setCurrentView('finance-form');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (!canAccessView('finance-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar as finanças.', 'error');
      return;
    }
    setSelectedTransaction(transaction);
    setCurrentView('finance-form');
  };

  const handleAddInvoice = () => {
    if (!canAccessView('invoice-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar as notas fiscais.', 'error');
      return;
    }
    setSelectedInvoice(null);
    setCurrentView('invoice-form');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    if (!canAccessView('invoice-form')) {
      showToast('Acesso Restrito', 'Seu perfil permite apenas consultar as notas fiscais.', 'error');
      return;
    }
    setSelectedInvoice(invoice);
    setCurrentView('invoice-form');
  };

  const handleLogoChange = async (logo: string | null) => {
    setCompanyLogo(logo);
    if (logo) {
      localStorage.setItem('companyLogo', logo);
      const favicon = document.getElementById('favicon-link') as HTMLLinkElement;
      if (favicon) favicon.href = logo;
      const appleIcon = document.getElementById('apple-touch-icon-link') as HTMLLinkElement;
      if (appleIcon) appleIcon.href = logo;
    } else {
      localStorage.removeItem('companyLogo');
      const fallbackIcon = "/icons/logo.png";
      const favicon = document.getElementById('favicon-link') as HTMLLinkElement;
      if (favicon) favicon.href = fallbackIcon;
      const appleIcon = document.getElementById('apple-touch-icon-link') as HTMLLinkElement;
      if (appleIcon) appleIcon.href = fallbackIcon;
    }
    
    if (user) {
      try {
        const { error } = await supabase
          .from('settings')
          .update({ logo: logo })
          .eq('userId', user.id);
        
        if (error) throw error;
        showToast('Logo Atualizada', 'A identidade visual da empresa foi atualizada. Atualize a página para recarregar o ícone do aplicativo na web.');
      } catch (error) {
        console.error(error);
        showToast('Erro ao Salvar', 'Não foi possível atualizar a logo.', 'error');
      }
    } else {
      showToast('Logo Atualizada', 'A identidade visual da empresa foi atualizada. Atualize a página para recarregar o ícone do aplicativo na web.');
    }
  };

  const handleSaveSettings = async (newSettings: typeof settings) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          userId: user.id,
          companyName: newSettings.companyName,
          cnpj: newSettings.cnpj,
          email: newSettings.email,
          phone: newSettings.phone,
          address: newSettings.address,
          website: newSettings.website
        }, { onConflict: 'userId' });

      if (error) throw error;
      localStorage.setItem('companyName', newSettings.companyName);
      showToast('Configurações Salvas', 'As informações da empresa foram atualizadas com sucesso.');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Erro ao Salvar', error.message || 'Não foi possível salvar as configurações.', 'error');
    }
  };

  const renderView = () => {
    if (!user) return null;
    if (!canAccessView(currentView)) {
      return <Dashboard user={user} onSelectContact={handleSelectContact} onViewChange={handleViewChange} searchTerm={globalSearchTerm} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onSelectContact={handleSelectContact} onViewChange={handleViewChange} searchTerm={globalSearchTerm} />;
      case 'pipeline':
        return <Pipeline user={user} onViewChange={setCurrentView} onSelectContact={handleSelectContact} searchTerm={globalSearchTerm} />;
      case 'contacts':
        return <Contacts user={user} onSelectContact={handleSelectContact} onAddContact={handleAddContact} onEditContact={handleEditContact} searchTerm={globalSearchTerm} />;
      case 'products':
        return <Products user={user} onAddProduct={handleAddProduct} onEditProduct={handleEditProduct} searchTerm={globalSearchTerm} />;
      case 'finance':
        return <Finance user={user} onAddTransaction={handleAddTransaction} onEditTransaction={handleEditTransaction} searchTerm={globalSearchTerm} />;
      case 'expenses':
        return <Finance user={user} onAddTransaction={() => { setSelectedTransaction(null); setCurrentView('expenses-form'); }} onEditTransaction={(t) => { setSelectedTransaction(t); setCurrentView('expenses-form'); }} searchTerm={globalSearchTerm} isExpensesOnly />;
      case 'invoices':
        return <Invoices user={user} onAddInvoice={handleAddInvoice} onEditInvoice={handleEditInvoice} searchTerm={globalSearchTerm} companyLogo={companyLogo} companyName={settings.companyName} settings={settings} />;
      case 'reports':
        return <Reports user={user} companyLogo={companyLogo} companyName={settings.companyName} settings={settings} />;
      case 'integrations':
        return <Integrations user={user} />;
      case 'activities':
        return <Activities user={user} />;
      case 'settings':
        return (
          <Settings 
            user={user}
            companyLogo={companyLogo} 
            onLogoChange={handleLogoChange} 
            settings={settings}
            onSave={handleSaveSettings}
          />
        );
      case 'contact-detail':
        return selectedContact ? (
          <ContactDetail 
            user={user}
            contact={selectedContact} 
            onBack={() => setCurrentView('contacts')} 
            onEdit={() => handleEditContact(selectedContact)}
            onViewChange={setCurrentView}
            companyLogo={companyLogo}
            companyName={settings.companyName}
            settings={settings}
          />
        ) : <Contacts user={user} onSelectContact={handleSelectContact} onAddContact={handleAddContact} onEditContact={handleEditContact} searchTerm={globalSearchTerm} />;
      case 'contact-form':
        return (
          <ContactForm 
            user={user}
            contact={selectedContact} 
            onBack={() => setCurrentView('contacts')} 
            onSuccess={() => {
              showToast(
                selectedContact ? 'Dossiê Atualizado' : 'Contato Registrado',
                `Relacionamento ${selectedContact ? 'atualizado' : 'adicionado'} com sucesso.`
              );
              setCurrentView('contacts');
            }}
          />
        );
      case 'product-form':
        return (
          <ProductForm 
            user={user}
            product={selectedProduct} 
            onBack={() => setCurrentView('products')} 
            onSuccess={() => {
              showToast(
                selectedProduct ? 'Produto Atualizado' : 'Produto Cadastrado',
                `Item ${selectedProduct ? 'atualizado' : 'adicionado'} com sucesso.`
              );
              setCurrentView('products');
            }}
          />
        );
      case 'finance-form':
        return (
          <FinanceForm 
            user={user}
            transaction={selectedTransaction} 
            onBack={() => setCurrentView('finance')} 
            onSuccess={() => {
              showToast(
                selectedTransaction ? 'Transação Atualizada' : 'Transação Registrada',
                `A movimentação foi ${selectedTransaction ? 'atualizada' : 'adicionada'} com sucesso.`
              );
              setCurrentView('finance');
            }}
          />
        );
      case 'expenses-form':
        return (
          <FinanceForm 
            user={user}
            transaction={selectedTransaction} 
            onBack={() => setCurrentView('expenses')} 
            onSuccess={() => {
              showToast(
                selectedTransaction ? 'Despesa Atualizada' : 'Despesa Registrada',
                `A despesa foi ${selectedTransaction ? 'atualizada' : 'adicionada'} com sucesso.`
              );
              setCurrentView('expenses');
            }}
            isExpensesOnly
          />
        );
      case 'invoice-form':
        return (
          <InvoiceForm 
            user={user}
            invoice={selectedInvoice} 
            onBack={() => setCurrentView('invoices')} 
            onSuccess={() => {
              showToast(
                selectedInvoice ? 'Nota Fiscal Atualizada' : 'Nota Fiscal Emitida',
                `O documento fiscal foi ${selectedInvoice ? 'atualizado' : 'emitido'} com sucesso.`
              );
              setCurrentView('invoices');
            }}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-[60vh] text-secondary">
            <p className="text-lg font-medium">Esta visualização está em construção.</p>
          </div>
        );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        showToast('Conta Criada', 'Verifique seu e-mail para confirmar o cadastro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showToast('Bem-vindo', 'Login realizado com sucesso.');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
      showToast('Erro de Acesso', 'Verifique suas credenciais.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full"></div>
          <p className="text-secondary font-bold text-sm uppercase tracking-widest">Inicializando Sistemas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface">
        <div className="max-w-md w-full bg-surface-container-lowest p-10 rounded-3xl shadow-2xl border border-outline-variant/10">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 overflow-hidden border border-outline-variant/10 relative">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Cardoso Ar Condicionado" 
                  className="w-full h-full object-contain p-2" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex flex-col items-center relative">
                  <div className="absolute -top-1 -right-1">
                    <Snowflake className="w-4 h-4 text-primary/30 animate-pulse" />
                  </div>
                  <Wind className="w-12 h-12 text-primary" />
                  <span className="text-xs font-bold text-primary/60 uppercase tracking-tighter mt-1">Cardoso AR</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">{settings.companyName}</h1>
            <p className="text-secondary text-sm font-medium">Gestão de Vendas e Manutenção</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-error mb-1">Configuração Ausente</h3>
                <p className="text-xs text-error/80">
                  As credenciais do Supabase não foram encontradas. Por favor, configure as variáveis de ambiente <code className="bg-error/10 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-error/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> no menu de configurações (Secrets).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-error font-medium px-1">{loginError}</p>
            )}

            <button 
              type="submit"
              disabled={loginLoading || !isSupabaseConfigured}
              className="w-full py-4 milled-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsRegistering(value => !value);
              setLoginError(null);
            }}
            className="mt-6 w-full text-sm font-bold text-primary hover:underline"
          >
            {isRegistering ? 'Já tenho uma conta' : 'Criar uma conta'}
          </button>

          <p className="mt-10 text-xs text-secondary/40 font-bold uppercase tracking-widest text-center">Segurança de Nível Empresarial Ativada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onLogout={() => supabase.auth.signOut()} 
        companyLogo={companyLogo}
        companyName={settings.companyName}
        privilege={user.privilege || 'Visualizador'}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="lg:ml-64 transition-all duration-300">
        <TopBar 
          user={user} 
          searchTerm={globalSearchTerm} 
          onSearchChange={setGlobalSearchTerm} 
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />
        
        <main className="pt-24 px-4 md:px-10 pb-12 min-h-screen w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedContact?.id || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ErrorBoundary>
                {renderView()}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-on-background text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 z-[100]"
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              toast.type === 'success' ? "bg-green-400" : "bg-error"
            )}></div>
            <div>
              <p className="text-sm font-bold">{toast.message}</p>
              <p className="text-xs opacity-70">{toast.subtext}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </Suspense>
    </div>
  );
}
