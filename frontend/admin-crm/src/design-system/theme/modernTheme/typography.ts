import type { ThemeOptions } from '@mui/material/styles';
import { tokens } from './tokens';

export const typography: ThemeOptions['typography'] = {
  fontFamily: tokens.typography.fontFamily.body,
  h1: {
    ...tokens.typography.styles.h1,
    fontSize: '2.5rem',
    '@media (max-width:768px)': {
      fontSize: '2rem',
    },
  },
  h2: {
    ...tokens.typography.styles.h2,
    fontSize: '2rem',
    '@media (max-width:768px)': {
      fontSize: '1.75rem',
    },
  },
  h3: {
    ...tokens.typography.styles.h3,
    fontSize: '1.75rem',
    '@media (max-width:768px)': {
      fontSize: '1.5rem',
    },
  },
  h4: {
    ...tokens.typography.styles.h4,
    fontSize: '1.5rem',
    '@media (max-width:768px)': {
      fontSize: '1.25rem',
    },
  },
  h5: {
    ...tokens.typography.styles.h5,
    fontSize: '1.25rem',
  },
  h6: {
    ...tokens.typography.styles.h6,
    fontSize: '1.125rem',
  },
  body1: tokens.typography.styles.bodyMd,
  body2: tokens.typography.styles.bodySm,
  subtitle1: tokens.typography.styles.subtitle1,
  subtitle2: tokens.typography.styles.subtitle2,
  caption: tokens.typography.styles.caption,
  overline: tokens.typography.styles.overline,
  button: tokens.typography.styles.button,
};
