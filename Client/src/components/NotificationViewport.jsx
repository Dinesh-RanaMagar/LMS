import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const NotificationViewport = () => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let timeout;
    const showNotification = (event) => {
      window.clearTimeout(timeout);
      setNotification({
        id: Date.now(),
        message: event.detail.message,
        type: event.detail.type || 'success',
      });
      timeout = window.setTimeout(() => setNotification(null), 5000);
    };

    window.addEventListener('app:notification', showNotification);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('app:notification', showNotification);
    };
  }, []);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  return (
    <div
      key={notification.id}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
      className={`fixed right-4 top-20 z-[100] flex max-w-md items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${
        isSuccess ? 'border-green-200 text-green-800' : 'border-amber-200 text-amber-800'
      }`}
    >
      {isSuccess
        ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
        : <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />}
      <span className="flex-1">{notification.message}</span>
      <button
        type="button"
        onClick={() => setNotification(null)}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationViewport;
