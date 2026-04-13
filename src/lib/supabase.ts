import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

export const createNotification = async (userId: string, title: string, description: string, type: 'lead' | 'os' | 'contact' | 'system') => {
  try {
    const payload = {
      userId,
      title,
      description,
      type,
      read: false
    };
    
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const checkAndGenerateNotifications = async (userId: string) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayMonthDay = todayStr.substring(5); // MM-DD

    const next3Days = new Date(today);
    next3Days.setDate(today.getDate() + 3);
    const next3DaysStr = next3Days.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, birthDate, nextMaintenanceDate')
      .eq('userId', userId);

    if (contactsError || !contacts) return;

    // Fetch today's notifications to avoid duplicates
    const startOfToday = new Date(today.setHours(0,0,0,0)).toISOString();
    const { data: todayNotifs, error: notifsError } = await supabase
      .from('notifications')
      .select('title')
      .eq('userId', userId)
      .gte('createdAt', startOfToday);

    if (notifsError) return;

    const existingTitles = new Set(todayNotifs?.map(n => n.title) || []);
    const newNotifications = [];

    for (const contact of contacts) {
      // Check birthday
      if (contact.birthDate && contact.birthDate.substring(5) === todayMonthDay) {
        const title = `Aniversário: ${contact.name}`;
        if (!existingTitles.has(title)) {
          newNotifications.push({
            userId,
            title,
            description: `Deseje um feliz aniversário para ${contact.name} hoje!`,
            type: 'contact',
            read: false,
          });
          existingTitles.add(title);
        }
      }

      // Check next maintenance (3 days)
      if (contact.nextMaintenanceDate && contact.nextMaintenanceDate === next3DaysStr) {
        const title = `Revisão próxima: ${contact.name}`;
        if (!existingTitles.has(title)) {
          newNotifications.push({
            userId,
            title,
            description: `A próxima revisão de ${contact.name} está agendada para daqui a 3 dias (${contact.nextMaintenanceDate.split('-').reverse().join('/')}).`,
            type: 'os',
            read: false,
          });
          existingTitles.add(title);
        }
      }
    }

    if (newNotifications.length > 0) {
      await supabase.from('notifications').insert(newNotifications);
    }
  } catch (error) {
    console.error('Error generating notifications:', error);
  }
};
