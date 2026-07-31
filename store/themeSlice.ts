import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ColorMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ColorMode;
  resolvedMode: 'light' | 'dark';
}

const initialState: ThemeState = {
  mode: 'system',
  resolvedMode: 'dark',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ColorMode>) {
      state.mode = action.payload;
    },
    setResolvedMode(state, action: PayloadAction<'light' | 'dark'>) {
      state.resolvedMode = action.payload;
    },
  },
});

export const { setMode, setResolvedMode } = themeSlice.actions;
export default themeSlice.reducer;
