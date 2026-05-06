import React, { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-gray-100/80 overflow-hidden ${className}`}>
      <div className="flex items-center space-x-3 p-6 border-b border-gray-50 bg-gray-50/30">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardSection;
