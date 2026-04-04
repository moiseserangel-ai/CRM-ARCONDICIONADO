import { Engagement, Task, PipelineCard, Contact } from './types';

export const RECENT_ENGAGEMENTS: Engagement[] = [
  {
    id: '1',
    entity: 'Condomínio Solar',
    subtext: 'Residencial • 24 Unidades',
    activity: 'Manutenção Preventiva',
    time: '2 horas atrás',
    value: 'R$ 1.200',
    status: 'Completed',
    initials: 'CS'
  },
  {
    id: '2',
    entity: 'Supermercado Ideal',
    subtext: 'Comercial • Sistema Central',
    activity: 'Instalação de Novo VRF',
    time: 'Ontem às 16:15',
    value: 'R$ 45.500',
    status: 'In Review',
    logo: 'https://picsum.photos/seed/super/100/100'
  },
  {
    id: '3',
    entity: 'Clínica Bem Estar',
    subtext: 'Saúde • Split Inverter',
    activity: 'Orçamento de Reparo',
    time: '12 Out, 2023',
    value: 'R$ 800',
    status: 'New',
    initials: 'CB'
  }
];

export const COMMAND_LIST: Task[] = [
  {
    id: '1',
    priority: 'Priority',
    time: '10:00',
    title: 'Manutenção Emergencial - Hotel Plaza',
    description: 'Vazamento de gás no sistema do 5º andar. Técnico: João Silva.',
    assignees: [
      'https://i.pravatar.cc/150?u=1',
      'https://i.pravatar.cc/150?u=2'
    ]
  },
  {
    id: '2',
    priority: 'Routine',
    time: '14:30',
    title: 'Entrega de Orçamento: Academia Fit',
    description: 'Enviar proposta de contrato de manutenção mensal (PMOC).'
  },
  {
    id: '3',
    priority: 'Discovery',
    time: 'Amanhã',
    title: 'Visita Técnica: Restaurante Sabor',
    description: 'Avaliar carga térmica para novo sistema de exaustão.'
  }
];

export const PIPELINE_DATA: Record<string, PipelineCard[]> = {
  'NOVO LEAD': [
    {
      id: 'p1',
      title: 'Instalação Residencial - Casa 42',
      description: 'Interesse em 3 Splits Inverter',
      value: 'R$ 12.000',
      tag: 'Alta Prioridade',
      tagColor: 'bg-tertiary/10 text-tertiary',
      owner: 'Marcus R.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=3',
      statusIcon: 'chat_bubble',
      financialStatus: 'Adimplente',
      paymentMethod: 'Pix'
    },
    {
      id: 'p2',
      title: 'Manutenção Corretiva - Padaria Pão',
      description: 'Compressor parou de funcionar',
      value: 'R$ 2.500',
      tag: 'Urgente',
      tagColor: 'bg-secondary-container/50 text-secondary',
      owner: 'Elena S.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=4',
      statusIcon: 'schedule',
      financialStatus: 'Pendente',
      paymentMethod: 'Dinheiro'
    }
  ],
  'VISITA TÉCNICA': [
    {
      id: 'p3',
      title: 'Escritório Advocacia Silva',
      description: 'Visita agendada para medição',
      value: 'R$ 8.000',
      tag: 'Comercial',
      tagColor: 'bg-primary/10 text-primary',
      owner: 'Julian D.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=5',
      statusIcon: 'attach_file'
    }
  ],
  'ORÇAMENTO': [
    {
      id: 'p4',
      title: 'Loja de Roupas Chic',
      description: 'Aguardando aprovação do cliente',
      value: 'R$ 15.000',
      tag: 'Aguardando',
      tagColor: 'bg-on-tertiary-container text-tertiary',
      owner: 'Arthur K.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=6',
      statusIcon: 'visibility',
      financialStatus: 'Inadimplente',
      paymentMethod: 'Cartão de Crédito'
    }
  ],
  'NEGOCIAÇÃO': [
    {
      id: 'p5',
      title: 'Indústria Metalúrgica',
      description: 'Revisão de contrato de PMOC',
      value: 'R$ 21.000',
      tag: 'Contrato',
      tagColor: 'bg-secondary-container/50 text-secondary',
      owner: 'Marcus R.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=3',
      statusIcon: 'handshake'
    }
  ],
  'FECHADO': [
    {
      id: 'p6',
      title: 'Apartamento 101 - Ed. Mar',
      description: 'Concluído em 24 Ago',
      value: 'R$ 5.800',
      tag: 'Ganhado',
      tagColor: 'text-[#006e2e]',
      owner: 'Sarah L.',
      ownerAvatar: 'https://i.pravatar.cc/150?u=7',
      statusIcon: 'check_circle'
    }
  ]
};

export const CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Ricardo Oliveira',
    address: 'Condomínio Solar',
    cnpjCpf: 'Síndico',
    status: 'Contrato Ativo',
    portfolioValue: 'R$ 14.200',
    growth: '+14% Crescimento',
    lastInteraction: 'Manutenção Mensal',
    lastInteractionTime: 'Ontem, 16:30',
    initials: 'RO',
    email: 'ricardo@condominiosolar.com.br',
    phone: '(11) 98765-4321',
    location: 'São Paulo, SP',
    equipmentType: 'VRF Central',
    equipmentBrand: 'Daikin',
    btus: '120.000',
    lastMaintenanceDate: '2023-10-10',
    nextMaintenanceDate: '2023-11-10',
    financialStatus: 'Adimplente',
    paymentMethod: 'Pix',
    userId: 'system'
  },
  {
    id: 'c2',
    name: 'Helena Vance',
    address: 'Restaurante Sabor',
    cnpjCpf: 'Proprietária',
    status: 'Manutenção Pendente',
    portfolioValue: 'R$ 8.500',
    lastInteraction: 'Visita Técnica',
    lastInteractionTime: '12 Out, 2023',
    avatar: 'https://i.pravatar.cc/150?u=8',
    email: 'helena@restaurantesabor.com',
    phone: '(11) 91234-5678',
    location: 'São Paulo, SP',
    equipmentType: 'K7 Inverter',
    equipmentBrand: 'LG',
    btus: '36.000',
    lastMaintenanceDate: '2023-09-15',
    nextMaintenanceDate: '2023-12-15',
    financialStatus: 'Pendente',
    paymentMethod: 'Dinheiro',
    userId: 'system'
  }
];
