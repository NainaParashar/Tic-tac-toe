import { create } from 'zustand';
import { Client } from '@heroiclabs/nakama-js';
import type { Session, Socket } from '@heroiclabs/nakama-js';
import { NAKAMA_URL, NAKAMA_PORT, NAKAMA_USE_SSL, NAKAMA_SERVER_KEY } from '../constants/nakama';

interface AuthState {
  session: Session | null;
  account: any | null;
  client: Client;
  socket: Socket | null;
  login: (nickname: string) => Promise<void>;
  connectSocket: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  client: new Client(NAKAMA_SERVER_KEY, NAKAMA_URL, NAKAMA_PORT, NAKAMA_USE_SSL),
  session: null,
  account: null,
  socket: null,

  login: async (nickname: string) => {
    let deviceId = localStorage.getItem('nakama_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('nakama_device_id', deviceId);
    }
    
    // Auth
    const session = await get().client.authenticateDevice(deviceId, true, nickname);
    localStorage.setItem('nakama_auth_token', session.token);
    
    // Set Nickname
    if (nickname) {
      await get().client.rpc(session, 'setDisplayName', { name: nickname });
    }
    
    const account = await get().client.getAccount(session);
    set({ session, account });
    await get().connectSocket();
  },

  connectSocket: async () => {
    const { client, session, socket: existingSocket } = get();
    if (!session || existingSocket) return;

    const socket = client.createSocket(NAKAMA_USE_SSL, false);
    await socket.connect(session, true);
    set({ socket });
  }
}));
