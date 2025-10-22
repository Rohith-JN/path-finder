import dynamic from 'next/dynamic';

const GraphVisualizer = dynamic(() => import('@/components/graph'), {
  ssr: false,
});

export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ backgroundColor: 'black' }}>
        <GraphVisualizer />
      </div>
    </div>
  );
}
