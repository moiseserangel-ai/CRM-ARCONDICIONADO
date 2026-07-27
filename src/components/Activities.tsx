import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, Filter, Loader2, Search, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SystemUser, User } from '../types';

interface ActivitiesProps {
  user: User;
}

interface AuditEvent {
  id: string;
  actorId?: string;
  entity: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

const entityLabels: Record<string, string> = {
  contacts: 'Cliente',
  products: 'Produto',
  serviceOrders: 'Ordem de serviço',
  transactions: 'Movimentação',
  invoices: 'Nota fiscal',
  systemUsers: 'Usuário'
};

const actionLabels = {
  INSERT: 'Criou',
  UPDATE: 'Alterou',
  DELETE: 'Excluiu'
};

export default function Activities({ user }: ActivitiesProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [members, setMembers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [auditResult, membersResult] = await Promise.all([
        supabase.from('audit_log').select('*').eq('accountId', user.id).order('createdAt', { ascending: false }).limit(500),
        supabase.from('systemUsers').select('*').eq('userId', user.id)
      ]);
      if (!auditResult.error) setEvents((auditResult.data || []) as AuditEvent[]);
      if (!membersResult.error) setMembers((membersResult.data || []) as SystemUser[]);
      setLoading(false);
    };
    void load();
  }, [user.id]);

  const actorName = (actorId?: string) => {
    if (!actorId || actorId === user.authId) return 'Administrador';
    return members.find(member => member.authUserId === actorId)?.name || 'Usuário da equipe';
  };

  const filtered = useMemo(() => events.filter(event => {
    const searchable = `${entityLabels[event.entity] || event.entity} ${actorName(event.actorId)} ${JSON.stringify(event.changes)}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase()))
      && (!action || event.action === action)
      && (!entity || event.entity === entity);
  }), [events, members, query, action, entity]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <header>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-bold font-headline text-on-surface">Atividades</h2>
            <p className="text-secondary">Histórico administrativo das alterações realizadas no CRM.</p>
          </div>
        </div>
      </header>

      <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar atividade..." className="w-full bg-surface-container-low rounded-2xl py-3 pl-11 pr-4 outline-none" />
        </div>
        <select value={entity} onChange={e => setEntity(e.target.value)} className="bg-surface-container-low rounded-2xl px-4 py-3 outline-none">
          <option value="">Todas as áreas</option>
          {Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={action} onChange={e => setAction(e.target.value)} className="bg-surface-container-low rounded-2xl px-4 py-3 outline-none">
          <option value="">Todas as operações</option>
          <option value="INSERT">Criações</option>
          <option value="UPDATE">Alterações</option>
          <option value="DELETE">Exclusões</option>
        </select>
      </section>

      <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-secondary"><Filter className="w-10 h-10 mx-auto mb-4 opacity-30" />Nenhuma atividade encontrada.</div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map(event => (
              <div key={event.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-primary" /></div>
                <div className="flex-1">
                  <p className="font-bold text-on-surface">{actorName(event.actorId)} <span className="font-medium text-secondary">{actionLabels[event.action].toLowerCase()}</span> {entityLabels[event.entity] || event.entity}</p>
                  <p className="text-xs text-secondary mt-1">Registro: {event.recordId || 'não informado'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary"><Calendar className="w-4 h-4" />{new Date(event.createdAt).toLocaleString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
