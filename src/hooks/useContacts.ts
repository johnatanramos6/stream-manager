import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Contact } from '@/types/contact';

/**
 * Hook para gestionar contactos persistentes.
 * Los contactos NUNCA se borran - se acumulan para autocompletado futuro.
 */
export function useContacts(userId: string | undefined) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Cargar contactos al iniciar
  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('vendor_id', userId)
        .order('name', { ascending: true });
      if (data) setContacts(data);
      if (error) console.error('Error loading contacts:', error);
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  // Filtrar por tipo
  const clients = useMemo(() => contacts.filter(c => c.type === 'client'), [contacts]);
  const providers = useMemo(() => contacts.filter(c => c.type === 'provider'), [contacts]);

  /**
   * Guarda o actualiza un contacto.
   * Si ya existe (mismo nombre + tipo), actualiza el teléfono.
   * Si no existe, lo crea.
   * Opera silenciosamente - nunca muestra errores al usuario.
   */
  const upsertContact = useCallback(async (name: string, phone: string | null, type: 'client' | 'provider') => {
    if (!userId || !name || !name.trim()) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim() || null;

    // Verificar si ya existe localmente con los mismos datos
    const existing = contacts.find(
      c => c.type === type && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    // Si ya existe con el mismo teléfono, no hacer nada
    if (existing && existing.phone === trimmedPhone) return;

    try {
      if (existing) {
        // Solo actualizar si el teléfono cambió y el nuevo no está vacío
        if (trimmedPhone && trimmedPhone !== existing.phone) {
          const { error } = await supabase
            .from('contacts')
            .update({ phone: trimmedPhone, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (!error) {
            setContacts(prev => prev.map(c =>
              c.id === existing.id ? { ...c, phone: trimmedPhone, updated_at: new Date().toISOString() } : c
            ));
          }
        }
      } else {
        // Insertar nuevo contacto
        const { data, error } = await supabase
          .from('contacts')
          .upsert({
            vendor_id: userId,
            name: trimmedName,
            phone: trimmedPhone,
            type,
          }, { onConflict: 'vendor_id,name,type' })
          .select()
          .single();

        if (!error && data) {
          setContacts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    } catch {
      // Silencioso - el autocompletado es una mejora, no debe bloquear
    }
  }, [userId, contacts]);

  /**
   * Busca contactos por nombre (fuzzy match).
   * Retorna los que empiecen con el texto o lo contengan.
   */
  const searchContacts = useCallback((query: string, type: 'client' | 'provider') => {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const filtered = contacts.filter(c => c.type === type && c.name.toLowerCase().includes(q));
    // Priorizar los que empiezan con la búsqueda
    return filtered.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    });
  }, [contacts]);

  /**
   * Busca un contacto exacto por nombre.
   */
  const findContact = useCallback((name: string, type: 'client' | 'provider') => {
    if (!name) return null;
    return contacts.find(
      c => c.type === type && c.name.toLowerCase() === name.trim().toLowerCase()
    ) || null;
  }, [contacts]);

  return {
    contacts,
    clients,
    providers,
    loaded,
    upsertContact,
    searchContacts,
    findContact,
  };
}
