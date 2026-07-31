import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';

interface AuthState {
  user: User | null;
  session: { access_token: string; refresh_token: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingComplete: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
      state.onboardingComplete = action.payload?.onboarding_complete ?? false;
    },
    setSession(state, action: PayloadAction<{ access_token: string; refresh_token: string } | null>) {
      state.session = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    setOnboardingComplete(state) {
      state.onboardingComplete = true;
      if (state.user) state.user.onboarding_complete = true;
    },
    updateProfile(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearAuth(state) {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.onboardingComplete = false;
      state.error = null;
    },
  },
});

export const {
  setUser, setSession, setLoading, setError,
  setOnboardingComplete, updateProfile, clearAuth,
} = authSlice.actions;

export default authSlice.reducer;
