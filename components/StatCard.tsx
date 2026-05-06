import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  // FIX: Specified that the icon element accepts a className prop to resolve cloneElement type error.
  icon: React.ReactElement<{ className?: string }>;
  color?: 'green' | 'blue' | 'red' | 'indigo' | 'yellow' | 'purple' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'gray' }) => {
    const colorClasses: Record<string, string> = {
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        red: 'bg-red-100 text-red-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600',
        gray: 'bg-gray-100 text-gray-600'
    };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${colorClasses[color]} transition-transform group-hover:scale-110 duration-300`}>
          {React.cloneElement(icon, { className: 'w-6 h-6' })}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;