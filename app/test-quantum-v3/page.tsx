'use client';

import { useState, useEffect } from 'react';
import { 
  initQuantumSessionV3, 
  getQuantumStreamUrlV3,
  getSessionStatusV3
} from '@/app/lib/stream/quantum-client-v3';
import {
  initGlobalBehavioralTracking,
  getBehavioralData,
  onEntropyUpdate
} from '@/lib/utils/global-behavioral-tracker';

export default function TestQuantumV3Page() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testUrl, setTestUrl] = useState('https://example.com/test.m3u8');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [liveEntropy, setLiveEntropy] = useState(0);
  const [liveSamples, setLiveSamples] = useState(0);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Start global behavioral collection and subscribe to updates
  useEffect(() => {
    initGlobalBehavioralTracking();
    addLog('Global behavioral tracking started - move your mouse!');
    
    // Get initial data
    const data = getBehavioralData();
    setLiveEntropy(data.mouseEntropy);
    setLiveSamples(data.mouseSamples);
    addLog(`Initial data: ${data.mouseSamples} samples, entropy: ${data.mouseEntropy.toFixed(3)}`);
    
    // Subscribe to live entropy updates
    const unsubscribe = onEntropyUpdate((entropy, samples) => {
      setLiveEntropy(entropy);
      setLiveSamples(samples);
    });
    
    return () => unsubscribe();
  }, []);

  const handleInit = async () => {
    setIsInitializing(true);
    setError(null);
    addLog('Starting Quantum Shield V3 initialization...');

    try {
      const session = await initQuantumSessionV3();
      setStatus(session.status);
      addLog(`Session initialized! Can stream: ${session.status.canAccessStream}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      addLog(`ERROR: ${msg}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGetStreamUrl = async () => {
    try {
      addLog(`Getting stream URL for: ${testUrl}`);
      const url = await getQuantumStreamUrlV3(testUrl);
      setStreamUrl(url);
      addLog(`Stream URL generated!`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      addLog(`ERROR: ${msg}`);
    }
  };

  const refreshStatus = () => {
    const s = getSessionStatusV3();
    setStatus(s);
    addLog('Status refreshed');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">🔒 Quantum Shield V3 - PARANOID MODE</h1>
      <p className="text-gray-400 mb-8">The most secure stream protection ever created</p>

      {/* Live Behavioral Data */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📊 Live Behavioral Data (Global Tracker)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Mouse Samples</div>
            <div className="text-2xl font-bold text-blue-400">{liveSamples}</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Mouse Entropy</div>
            <div className={`text-2xl font-bold ${liveEntropy >= 0.25 ? 'text-green-400' : 'text-yellow-400'}`}>
              {liveEntropy.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Required: 0.25</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          This data is collected globally from page load. Move your mouse around to increase entropy!
        </p>
      </div>

      {/* Requirements */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📋 Requirements to Access Streams</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className={status?.hasFingerprint ? 'text-green-400' : 'text-red-400'}>
              {status?.hasFingerprint ? '✓' : '○'}
            </span>
            Browser Fingerprint Submitted
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.challengesPassed >= 3 ? 'text-green-400' : 'text-yellow-400'}>
              {status?.challengesPassed >= 3 ? '✓' : '○'}
            </span>
            Challenges Passed: {status?.challengesPassed || 0} / {status?.challengesRequired || 3}
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.powCompleted ? 'text-green-400' : 'text-red-400'}>
              {status?.powCompleted ? '✓' : '○'}
            </span>
            Proof of Work Completed
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.mouseEntropy >= 0.25 ? 'text-green-400' : 'text-yellow-400'}>
              {status?.mouseEntropy >= 0.25 ? '✓' : '○'}
            </span>
            Mouse Entropy: {status?.mouseEntropy?.toFixed(3) || '0.000'} / {status?.entropyRequired || 0.25}
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.behavioralSamples >= 50 ? 'text-green-400' : 'text-yellow-400'}>
              {status?.behavioralSamples >= 50 ? '✓' : '○'}
            </span>
            Behavioral Samples: {status?.behavioralSamples || 0} / {status?.samplesRequired || 50}
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.trustScore >= 60 ? 'text-green-400' : 'text-red-400'}>
              {status?.trustScore >= 60 ? '✓' : '○'}
            </span>
            Trust Score: {status?.trustScore || 0} / {status?.trustRequired || 60}
          </li>
          <li className="flex items-center gap-2">
            <span className={status?.violations < 5 ? 'text-green-400' : 'text-red-400'}>
              {status?.violations < 5 ? '✓' : '✗'}
            </span>
            Violations: {status?.violations || 0} / {status?.maxViolations || 5}
          </li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className={`text-lg font-semibold ${status?.canAccessStream ? 'text-green-400' : 'text-red-400'}`}>
            {status?.canAccessStream ? '✓ READY TO STREAM' : '✗ NOT READY'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎮 Controls</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleInit}
            disabled={isInitializing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
          >
            {isInitializing ? 'Initializing...' : 'Initialize Session'}
          </button>
          <button
            onClick={refreshStatus}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition"
          >
            Refresh Status
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Stream URL Test */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎬 Test Stream URL</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white"
            placeholder="Enter stream URL"
          />
          <button
            onClick={handleGetStreamUrl}
            disabled={!status?.canAccessStream}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
          >
            Get Protected URL
          </button>
        </div>
        {streamUrl && (
          <div className="p-4 bg-gray-700 rounded-lg break-all text-sm font-mono">
            {streamUrl}
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📜 Logs</h2>
        <div className="h-64 overflow-y-auto bg-black rounded-lg p-4 font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-300">{log}</div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500">No logs yet...</div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 text-gray-400 text-sm">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Move your mouse around to collect behavioral data</li>
          <li>Click "Initialize Session" to start the verification process</li>
          <li>The system will automatically solve challenges and verify your browser</li>
          <li>Once all requirements are met, you can generate protected stream URLs</li>
          <li>Tokens expire in 10 seconds - URLs must be used immediately</li>
        </ol>
      </div>
    </div>
  );
}
