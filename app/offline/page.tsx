/**
 * Offline Page
 * Displayed when the user is offline and no cached content is available
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline - Flyx 2.0',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center px-4">
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          You're Offline
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
          It looks like you've lost your internet connection. 
          Some features may not be available right now.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors duration-200"
          >
            Try Again
          </button>
          
          <p className="text-sm text-gray-400">
            Check your internet connection and try again
          </p>
        </div>
        
        <div className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-lg max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-white mb-2">
            Offline Features
          </h2>
          <ul className="text-sm text-gray-300 space-y-2 text-left">
            <li>• Previously viewed content may still be available</li>
            <li>• Cached images and data will load</li>
            <li>• Your watch progress is saved locally</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
