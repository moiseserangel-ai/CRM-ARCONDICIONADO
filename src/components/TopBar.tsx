import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, History, Check, Trash2, Clock, User as UserIcon, FileText, UserPlus, AlertCircle, Menu, Moon, Sun } from 'lucide-react';
import { Notification, User } from '../types';
import { supabase, checkAndGenerateNotifications } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useDarkMode } from '../hooks/useDarkMode';

interface TopBarProps {
  user: User | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onMenuToggle: () => void;
}

export default function TopBar({ user, searchTerm, onSearchChange, onMenuToggle }: TopBarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isDark, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    if (!user) return;

    const initAndFetchNotifications = async () => {
      // First generate any pending system notifications (birthdays, maintenance)
      await checkAndGenerateNotifications(user.id);
      
      // Then fetch all notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('ownerUid', user.id)
        .order('createdAt', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data as Notification[]);
      }
    };

    initAndFetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Re-fetch when there are changes
          supabase
            .from('notifications')
            .select('*')
            .eq('ownerUid', user.id)
            .order('createdAt', { ascending: false })
            .limit(20)
            .then(({ data, error }) => {
              if (!error && data) {
                setNotifications(data as Notification[]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'os': return <FileText className="w-4 h-4 text-tertiary" />;
      case 'contact': return <UserIcon className="w-4 h-4 text-secondary" />;
      default: return <AlertCircle className="w-4 h-4 text-secondary" />;
    }
  };

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-16 z-40 bg-surface/70 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center flex-1 max-w-xl gap-2">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-full hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary w-4 h-4" />
          <input
            className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-surface-tint/40 transition-all placeholder:text-secondary/50"
            placeholder="Pesquisar negócios, clientes ou arquivos..."
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button className="lg:hidden p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low">
          <Search className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-4">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "text-secondary hover:text-primary transition-all relative p-2 rounded-full hover:bg-surface-container-low",
                showNotifications && "text-primary bg-surface-container-low"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-tertiary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-surface">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute -right-[110px] md:right-0 mt-2 w-[320px] sm:w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-[24px] shadow-2xl border border-outline-variant/10 overflow-hidden z-50"
                >
                  <div className="p-4 border-bottom border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
                    <h3 className="text-sm font-bold text-on-surface">Notificações</h3>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{unreadCount} não lidas</span>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-outline-variant/5">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            className={cn(
                              "p-4 transition-colors hover:bg-surface-container-low group relative",
                              !notification.read && "bg-primary/5"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                !notification.read ? "bg-surface-container-lowest shadow-sm" : "bg-surface-container-low"
                              )}>
                                {getIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-xs font-bold text-on-surface truncate",
                                  !notification.read && "text-primary"
                                )}>
                                  {notification.title}
                                </p>
                                <p className="text-[11px] text-secondary line-clamp-2 mt-0.5">
                                  {notification.description}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold text-secondary/50 uppercase tracking-tighter">
                                  <Clock className="w-3 h-3" />
                                  {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <button 
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1.5 bg-white shadow-sm rounded-lg text-secondary hover:text-green-500 transition-colors"
                                  title="Marcar como lida"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button 
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1.5 bg-white shadow-sm rounded-lg text-secondary hover:text-error transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-6 h-6 text-secondary/30" />
                        </div>
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest">Sem notificações</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-surface-container-low/30 border-t border-outline-variant/10 text-center">
                      <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                        Ver tudo
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={toggleDarkMode}
            className="text-secondary hover:text-primary transition-all p-2 rounded-full hover:bg-surface-container-low"
            title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button className="text-secondary hover:text-primary transition-all p-2 rounded-full hover:bg-surface-container-low hidden sm:block">
            <History className="w-5 h-5" />
          </button>
        </div>
        
        <div className="h-8 w-[1px] bg-outline-variant/30 hidden sm:block"></div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-none">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}</p>
            <p className="text-[10px] text-secondary font-medium mt-1">Admin</p>
          </div>
          {user?.user_metadata?.avatar_url ? (
            <img
              className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white"
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata.full_name || 'User'}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-white">
              {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
