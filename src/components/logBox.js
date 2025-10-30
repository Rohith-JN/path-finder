import React from 'react';

export default function LogBox({ messages }) {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        color: '#eee',
        minWidth: '200px',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '5px',
        backgroundColor: 'rgba(34, 34, 34, 0.59)',
      }}
    >
      <h4
        style={{
          marginTop: 0,
          borderBottom: '1px solid #444',
          paddingBottom: '5px',
        }}
      >
        Event Log
      </h4>
      {messages.length === 0 ? (
        <p>No events yet...</p>
      ) : (
        // Display messages, newest first
        messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px', marginTop: '5px' }}>
            {msg}
          </div>
        ))
      )}
    </div>
  );
}
