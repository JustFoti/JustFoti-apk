'use client';

import { useState, useEffect } from 'react';
import { useQuantumStreamV2 } from '@/lib/stream/quantum-client-v2';

export default function TestQuantumPage() {
  const { isReady, error, trustScore, getStreamUrl, session } = useQuantumStreamV2();
  const [testUrl, setTestUrl] = useState('https://example.com/test-stream.m3u8');
  const [proxyUrl, setProxyUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${msg}`]);
  };

  useEffect(() => {
    if (isReady) {
      addLog(`✅ Session initialized! Trust score: ${trustScore}`);
    }
    if (error) {
      addLog(`❌ Error: ${error}`);
    }
  }, [isReady, error, trustScore]);

  const handleTest = async () => {
    try {
      addLog(`Testing URL: ${testUrl}`);
      const url = await getStreamUrl(testUrl);
      setProxyUrl(url);
      addLog(`✅ Proxy URL generated`);
      addLog(`Trust score: ${trustScore}`);
    } catch (e) {
      addLog(`❌ Error: ${e}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🛡️ Quantum Shield V2 Test</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Status Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>{isReady ? 'Ready' : 'Initializing...'}</span>
            </div>
            
            <div>
              <span className="text-gray-400">Trust Score:</span>
              <div className="mt-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    trustScore > 70 ? 'bg-green-500' : 
                    trustScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${trustScore}%` }}
                />
              </div>
              <span className="text-sm">{trustScore}/100</span>
            </div>

            {session && (
              <div className="text-sm text-gray-400">
                <div>Session ID: {session.sessionId?.substring(0, 16)}...</div>
                <div>Challenge Type: {session.challenge?.type}</div>
              </div>
            )}
          </div>
        </div>

        {/* Test Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Stream</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stream URL</label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            
            <button
              onClick={handleTest}
              disabled={!isReady}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded py-2 font-medium"
            >
              Generate Proxy URL
            </button>

            {proxyUrl && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Proxy URL</label>
                <textarea
                  readOnly
                  value={proxyUrl}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-xs h-24"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Logs</h2>
        <div className="bg-black rounded p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-300">{log}</div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500">Waiting for events...</div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Local Development Setup</h2>
        <div className="text-gray-300 space-y-2">
          <p>1. Start the Cloudflare Worker locally:</p>
          <pre className="bg-black rounded p-3 text-sm">
            cd cloudflare-proxy{'\n'}
            npx wrangler dev --env development
          </pre>
          <p>2. The worker will run on http://localhost:8787</p>
          <p>3. Move your mouse around to generate behavioral data</p>
          <p>4. Click "Generate Proxy URL" to test the protection</p>
        </div>
      </div>
    </div>
  );
}
