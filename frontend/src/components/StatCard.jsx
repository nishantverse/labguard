import React from 'react';

const colorMap = {
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-l-blue-500' },
  green: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
  red: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-l-red-500' },
  amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-l-amber-500' },
  indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-l-indigo-500' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', loading }) {
  const styles = colorMap[color] || colorMap.blue;

  return (
    <div className={`flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-900/80 p-5 backdrop-blur border-l-2 ${styles.border}`}>
      <div>
        <h3 className="text-sm tracking-wider text-gray-400 uppercase">{title}</h3>
        {loading ? (
          <div className="mt-2 h-9 w-24 animate-pulse rounded bg-gray-700"></div>
        ) : (
          <p className="mt-1 text-3xl font-bold text-gray-100">{value}</p>
        )}
      </div>
      {Icon && (
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.bg} ${styles.text}`}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}
