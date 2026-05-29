import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Client, KommoData } from '../types';
import { clientsApi } from '../services/api';

interface AppState {
  clients: Client[];
  loadingClients: boolean;
  kommoData: Record<string, KommoData>;
  loadingKommo: Record<string, boolean>;
  kommoError: Record<string, string | null>;
}

type Action =
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'SET_LOADING_CLIENTS'; payload: boolean }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'SET_KOMMO_DATA'; payload: { clientId: string; data: KommoData } }
  | { type: 'SET_KOMMO_LOADING'; payload: { clientId: string; loading: boolean } }
  | { type: 'SET_KOMMO_ERROR'; payload: { clientId: string; error: string | null } };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'SET_LOADING_CLIENTS':
      return { ...state, loadingClients: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
      };
    case 'SET_KOMMO_DATA':
      return {
        ...state,
        kommoData: { ...state.kommoData, [action.payload.clientId]: action.payload.data },
      };
    case 'SET_KOMMO_LOADING':
      return {
        ...state,
        loadingKommo: { ...state.loadingKommo, [action.payload.clientId]: action.payload.loading },
      };
    case 'SET_KOMMO_ERROR':
      return {
        ...state,
        kommoError: { ...state.kommoError, [action.payload.clientId]: action.payload.error },
      };
    default:
      return state;
  }
}

interface AppContextValue extends AppState {
  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refreshClients: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    clients: [],
    loadingClients: true,
    kommoData: {},
    loadingKommo: {},
    kommoError: {},
  });

  const refreshClients = async () => {
    dispatch({ type: 'SET_LOADING_CLIENTS', payload: true });
    try {
      const clients = await clientsApi.getAll();
      dispatch({ type: 'SET_CLIENTS', payload: clients });
    } finally {
      dispatch({ type: 'SET_LOADING_CLIENTS', payload: false });
    }
  };

  useEffect(() => { refreshClients(); }, []);

  const addClient = async (data: Omit<Client, 'id' | 'createdAt'>) => {
    const client = await clientsApi.create(data);
    dispatch({ type: 'ADD_CLIENT', payload: client });
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    const client = await clientsApi.update(id, data);
    dispatch({ type: 'UPDATE_CLIENT', payload: client });
  };

  const deleteClient = async (id: string) => {
    await clientsApi.delete(id);
    dispatch({ type: 'DELETE_CLIENT', payload: id });
  };

  return (
    <AppContext.Provider value={{ ...state, addClient, updateClient, deleteClient, refreshClients }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
