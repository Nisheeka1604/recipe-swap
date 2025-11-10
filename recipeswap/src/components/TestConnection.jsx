import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestConnection() {
  const [message, setMessage] = useState('Testing connection to Supabase...');

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        
        if (error) throw error;
        
        setMessage('✅ Successfully connected to Supabase!');
        console.log('Connection test successful!', data);
      } catch (error) {
        setMessage(`❌ Error connecting to Supabase: ${error.message}`);
        console.error('Connection test failed:', error);
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      margin: '20px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Supabase Connection Test</h2>
      <p>{message}</p>
      {message.includes('Successfully') && (
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Continue to App
        </button>
      )}
    </div>
  );
}
