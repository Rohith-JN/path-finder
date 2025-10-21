import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // <-- Import dynamic

// ✅ CORRECT: Use dynamic imports for client-side components
const GraphVisualizer = dynamic(
  () => import('@/components/graph'),
  { ssr: false } // No Server-Side Rendering
);

export default function Home() {
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the data here, in the parent component
  useEffect(() => {
    fetch('/manhattan_graph.json') // Assumes this is in your /public folder
      .then((res) => res.json())
      .then((data) => {
        setGraphData(data);
        setIsLoading(false); // <-- 2. Set loading to false on success
      })
      .catch((err) => {
        console.error('Failed to fetch graph data:', err);
        setIsLoading(false); // <-- 3. Also stop loading on error
      });
  }, []);

  if (isLoading) {
    return <div>Loading graph data...</div>;
  }

  return (
    <>
      <div style={{ padding: '10px', backgroundColor: 'white' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ backgroundColor: 'black' }}>
            <GraphVisualizer data={graphData} />
          </div>
          <div
            style={{ width: '100%', height: '100%', backgroundColor: 'blue' }}
          ></div>
        </div>
      </div>
    </>
  );
}
