import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useTelemetry } from '../hooks/useTelemetry';

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });

export default function GpsTestPage() {
  const { connectionStatus, offlineCount, batchCount, syncPending } = useTelemetry();

  return (
    <>
      <Head>
        <title>GPS Test Harness</title>
      </Head>
      <main style={{ padding: 24, fontFamily: 'monospace', background: '#111', color: '#f5f5f5', minHeight: '100vh' }}>
        <h1 data-testid="gps-test-title">gps-test-ready</h1>
        <p data-testid="connection-status">{connectionStatus}</p>
        <p data-testid="offline-count">{offlineCount}</p>
        <p data-testid="batch-count">{batchCount}</p>
        <button
          data-testid="sync-now"
          onClick={() => {
            void syncPending();
          }}
        >
          sync-now
        </button>
      </main>
    </>
  );
}
