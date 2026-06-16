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
        // Optimistic update
        if (trimmedPhone && trimmedPhone !== existing.phone) {
          setContacts(prev => prev.map(c =>
            c.id === existing.id ? { ...c, phone: trimmedPhone, updated_at: new Date().toISOString() } : c
          ));
          await supabase
            .from('contacts')
            .update({ phone: trimmedPhone, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } else {
        // Optimistic insert con ID temporal
        const tempId = crypto.randomUUID();
        const newContact: Contact = {
          id: tempId,
          vendor_id: userId,
          name: trimmedName,
          phone: trimmedPhone,
          type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setContacts(prev => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));

        // Intentar buscar si ya existe en la BD por si acaso
        const { data: searchData } = await supabase
          .from('contacts')
          .select('id')
          .eq('vendor_id', userId)
          .eq('name', trimmedName)
          .eq('type', type)
          .maybeSingle();

        if (searchData) {
          // Si existe, solo actualizamos el telfono
          await supabase
            .from('contacts')
            .update({ phone: trimmedPhone, updated_at: new Date().toISOString() })
            .eq('id', searchData.id);
            
          // Reemplazar el ID temporal por el real
          setContacts(prev => prev.map(c => c.id === tempId ? { ...c, id: searchData.id } : c));
        } else {
          // Insertar nuevo contacto real
          const { data, error } = await supabase
            .from('contacts')
            .insert({
              vendor_id: userId,
              name: trimmedName,
              phone: trimmedPhone,
              type,
            })
            .select()
            .single();

          if (!error && data) {
            // Reemplazar el temporal por el real de la BD
            setContacts(prev => prev.map(c => c.id === tempId ? data : c));
          } else {
             console.error("Error guardando contacto:", error);
          }
        }
      }
    } catch (err) {
      console.error("Error inesperado en upsertContact:", err);
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
