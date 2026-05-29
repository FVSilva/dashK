import { useState, useCallback } from 'react';
import type { KommoData } from '../types';
import { kommoApi } from '../services/api';

export function useKommoData(clientId: string) {
  const [data, setData] = useState<KommoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await kommoApi.fetchAll(clientId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  return { data, loading, error, fetch };
}
