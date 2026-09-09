import React from 'react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
      <p className="text-sm font-medium text-gray-400">{message}</p>
    </div>
  );
}
