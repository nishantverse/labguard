import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message = 'Unable to connect to LabGuard server.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-300">Error</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
