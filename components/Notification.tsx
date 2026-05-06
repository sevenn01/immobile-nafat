
import React, { useEffect } from 'react';
import { XCircleIcon, CheckCircleIcon, CloseIcon } from './icons/Icons';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800';
  const Icon = type === 'error' ? XCircleIcon : CheckCircleIcon;
  const iconColor = type === 'error' ? 'text-red-500' : 'text-green-500';

  return (
    <div className={`fixed top-24 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-start space-x-3 max-w-sm w-full animate-slide-up-from-bottom ${bgColor}`}>
      <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium leading-5">{message}</p>
      </div>
      <button onClick={onClose} className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors">
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
