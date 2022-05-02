import styles from '../styles/globals.scss'

import { useEffect } from 'react';
import TagManager from 'react-gtm-module';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
      TagManager.initialize({ gtmId: 'GTM-WLJHZHL' });
  }, []);
  return <>
    <Component {...pageProps} />
  </>
}

export default MyApp
