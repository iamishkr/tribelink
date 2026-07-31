import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  pushToken: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pushToken: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.is_read).length;
      state.isLoading = false;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) state.unreadCount += 1;
    },
    markAllRead(state) {
      state.notifications = state.notifications.map(n => ({ ...n, is_read: true }));
      state.unreadCount = 0;
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find(n => n.id === action.payload);
      if (n && !n.is_read) {
        n.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    setPushToken(state, action: PayloadAction<string>) {
      state.pushToken = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setNotifications, addNotification, markAllRead, markRead, setPushToken, setLoading,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
