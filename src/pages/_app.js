import '@/styles/globals.css';
import { ReactFlowProvider } from '@xyflow/react';

export default function App({ Component, pageProps }) {
  return (
    <ReactFlowProvider>
      <Component {...pageProps} />
    </ReactFlowProvider>
  );
}
