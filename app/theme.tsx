'use client';
import { Roboto } from 'next/font/google';
import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = extendTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
  palette: {
    primary: {
      main: '#2664c2',
      analogous1: '#26b3c2',
      analogous2: '#3626c2',
      traidic1: '#8426c2',
      traidic2: '#c22665',
      background: '#ededed',
    },
    secondary: {
      main: '#c28426',
    },
  },
});

export default theme;
