import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No Data', message = 'There is nothing to display here.', actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 text-gray-500">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-300">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
