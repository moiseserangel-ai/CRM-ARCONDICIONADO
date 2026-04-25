import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Users, 
  Download, 
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Contact, ServiceOrder, User } from '../types';
import { cn } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { domToJpeg } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

const COLORS = ['#0061A4', '#006E2E', '#914D00', '#6750A4', '#B3261E', '#006A6A'];

export default function Reports({ user }: { user: User }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all' | 'year'>('6m');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const fetchData = async () => {
      const [contactsRes, soRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('userId', user.id),
        supabase.from('serviceOrders').select('*').eq('userId', user.id).order('createdAt', { ascending: false })
      ]);

      if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
      if (soRes.data) setServiceOrders(soRes.data as ServiceOrder[]);
      setLoading(false);
    };

    fetchData();

    // Set up real-time subscriptions
    const contactsChannel = supabase
      .channel('reports-contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        const isRelevant = 
          (payload.new && (payload.new as Contact).userId === user.id) || 
          (payload.old && (payload.old as Contact).userId === user.id) ||
          payload.eventType === 'DELETE';
          
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
      .channel('reports-so')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'serviceOrders' }, (payload) => {
        if (payload.eventType === 'INSERT') setServiceOrders(prev => {
          if (prev.some(so => so.id === payload.new.id)) return prev;
          return [payload.new as ServiceOrder, ...prev];
        });
        else if (payload.eventType === 'UPDATE') setServiceOrders(prev => prev.map(so => so.id === payload.new.id ? payload.new as ServiceOrder : so));
        else if (payload.eventType === 'DELETE') setServiceOrders(prev => prev.filter(so => so.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(soChannel);
    };
  }, [user]);

  const parseCurrency = (value: any) => {
    if (typeof value === 'number') return value;
    const digits = (value || 'R$ 0,00').replace(/[^0-9]/g, '');
    return (parseInt(digits) || 0) / 100;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Data Processing
  const metrics = useMemo(() => {
    const filteredOS = serviceOrders.filter(os => {
      if (timeRange === 'year') {
        const osDate = parseISO(os.createdAt);
        return osDate.getFullYear() === selectedYear;
      }
      return true;
    });

    const totalRevenue = filteredOS
      .filter(os => os.status === 'Finalizada')
      .reduce((acc, os) => acc + parseCurrency(os.value), 0);

    const openValue = filteredOS
      .filter(os => os.status === 'Aberta')
      .reduce((acc, os) => acc + parseCurrency(os.value), 0);

    const finalizedCount = filteredOS.filter(os => os.status === 'Finalizada').length;
    const avgOSValue = finalizedCount > 0 
      ? totalRevenue / finalizedCount 
      : 0;

    return {
      totalRevenue,
      openValue,
      avgOSValue,
      totalContacts: contacts.length,
      totalOS: filteredOS.length,
      finalizedOS: finalizedCount
    };
  }, [serviceOrders, contacts, timeRange, selectedYear]);

  const revenueData = useMemo(() => {
    if (timeRange === 'year') {
      const data = [];
      for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 1);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const monthLabel = format(date, 'MMM', { locale: ptBR });

        const monthlyRevenue = serviceOrders
          .filter(os => {
            if (os.status !== 'Finalizada') return false;
            const osDate = parseISO(os.createdAt);
            return isWithinInterval(osDate, { start: monthStart, end: monthEnd });
          })
          .reduce((acc, os) => acc + parseCurrency(os.value), 0);

        data.push({
          name: monthLabel,
          receita: monthlyRevenue
        });
      }
      return data;
    }

    const monthsToShow = timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : 24;
    const data = [];
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM/yy', { locale: ptBR });

      const monthlyRevenue = serviceOrders
        .filter(os => {
          if (os.status !== 'Finalizada') return false;
          const osDate = parseISO(os.createdAt);
          return isWithinInterval(osDate, { start: monthStart, end: monthEnd });
        })
        .reduce((acc, os) => acc + parseCurrency(os.value), 0);

      data.push({
        name: monthLabel,
        receita: monthlyRevenue
      });
    }
    return data;
  }, [serviceOrders, timeRange, selectedYear]);

  const osStatusData = useMemo(() => {
    const filteredOS = serviceOrders.filter(os => {
      if (timeRange === 'year') {
        const osDate = parseISO(os.createdAt);
        return osDate.getFullYear() === selectedYear;
      }
      return true;
    });

    const counts = filteredOS.reduce((acc, os) => {
      acc[os.status] = (acc[os.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [serviceOrders, timeRange, selectedYear]);

  const serviceTypeData = useMemo(() => {
    const filteredOS = serviceOrders.filter(os => {
      if (timeRange === 'year') {
        const osDate = parseISO(os.createdAt);
        return osDate.getFullYear() === selectedYear;
      }
      return true;
    });

    const types = {
      'Instalação': 0,
      'Manutenção': 0,
      'Visita Técnica': 0,
      'Orçamento': 0,
      'Outros': 0
    };

    filteredOS.forEach(os => {
      const subject = (os.subject || '').toLowerCase();
      if (subject.includes('instala')) types['Instalação']++;
      else if (subject.includes('manuten')) types['Manutenção']++;
      else if (subject.includes('visita')) types['Visita Técnica']++;
      else if (subject.includes('orça')) types['Orçamento']++;
      else types['Outros']++;
    });

    return Object.entries(types)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [serviceOrders, timeRange, selectedYear]);

  const topClients = useMemo(() => {
    return [...contacts]
      .sort((a, b) => parseCurrency(b.portfolioValue) - parseCurrency(a.portfolioValue))
      .slice(0, 5);
  }, [contacts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" ref={reportRef}>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">Relatórios e Insights</h2>
          <p className="text-secondary mt-1 font-body">Análise de desempenho e saúde financeira do negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
            {(['6m', '12m', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  timeRange === range 
                    ? "bg-surface-container-lowest text-primary shadow-sm" 
                    : "text-secondary hover:text-on-surface"
                )}
              >
                {range === '6m' ? '6 Meses' : range === '12m' ? '1 Ano' : 'Tudo'}
              </button>
            ))}
          </div>

          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
            <select
              value={timeRange === 'year' ? selectedYear : ''}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                if (year) {
                  setSelectedYear(year);
                  setTimeRange('year');
                }
              }}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 text-secondary focus:outline-none cursor-pointer"
            >
              <option value="" disabled>Selecionar Ano</option>
              {Array.from({ length: 26 }, (_, i) => 2015 + i).map(year => (
                <option key={year} value={year} className="bg-surface-container-low text-on-surface">
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard 
          title="Faturamento Total" 
          value={formatCurrency(metrics.totalRevenue)} 
          icon={<DollarSign className="w-5 h-5" />}
          trend="+12.5%"
          trendType="up"
        />
        <MetricCard 
          title="Valor em Aberto" 
          value={formatCurrency(metrics.openValue)} 
          icon={<Briefcase className="w-5 h-5" />}
          trend="-2.4%"
          trendType="down"
        />
        <MetricCard 
          title="Ticket Médio (OS)" 
          value={formatCurrency(metrics.avgOSValue)} 
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard 
          title="Total de Clientes" 
          value={metrics.totalContacts.toString()} 
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Revenue Chart */}
        <div className="col-span-12 xl:col-span-8 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-headline text-on-surface">Evolução do Faturamento</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              Receita Realizada
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#8E9299' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#8E9299' }}
                  tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Bar dataKey="receita" fill="#0061A4" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OS Status Distribution */}
        <div className="col-span-12 xl:col-span-4 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-bold font-headline text-on-surface mb-8">Status das Ordens</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={osStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {osStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Total de OS</p>
                  <p className="text-lg font-black text-on-surface">{metrics.totalOS}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Finalizadas</p>
                <p className="text-lg font-black text-primary">{metrics.finalizedOS}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="col-span-12 xl:col-span-5 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <h3 className="text-xl font-bold font-headline text-on-surface mb-8">Tipos de Serviço</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clients */}
        <div className="col-span-12 xl:col-span-7 bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-headline text-on-surface">Top Clientes (Faturamento)</h3>
            <button className="text-primary text-xs font-bold hover:underline">Ver Todos</button>
          </div>
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-2xl hover:bg-surface-container-low transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{client.name}</p>
                    <p className="text-[10px] text-secondary uppercase tracking-widest font-medium">{client.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-on-surface">{client.portfolioValue}</p>
                  <div className="flex items-center gap-1 justify-end text-[10px] font-bold text-green-600">
                    <ArrowUpRight className="w-3 h-3" />
                    {client.growth || '0%'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendType }: { title: string; value: string; icon: React.ReactNode; trend?: string; trendType?: 'up' | 'down' }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-[28px] border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
            trendType === 'up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {trendType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-2xl font-black text-on-surface font-headline">{value}</h4>
    </div>
  );
}
