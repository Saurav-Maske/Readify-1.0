import React from 'react';
import toast from 'react-hot-toast';

const sharedOptions = {
  duration: 4200,
  style: {
    borderRadius: '14px',
    padding: '12px 14px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    background: '#ffffff',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  },
};

export function showSuccess(message: string) {
  toast.success(message, sharedOptions);
}

export function showError(message: string) {
  toast.error(message, sharedOptions);
}

export function showWarning(message: string) {
  toast.custom(
    (t) =>
      React.createElement(
        'div',
        {
          className:
            'flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-900 shadow-lg',
          style: { minWidth: '280px' },
        },
        React.createElement('span', { className: 'text-base', 'aria-hidden': 'true' }, '⚠️'),
        React.createElement('span', null, message),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => toast.dismiss(t.id),
            className: 'ml-auto text-xs font-bold text-yellow-700 hover:text-yellow-900',
          },
          'Close'
        )
      ),
    {
      ...sharedOptions,
      duration: 5000,
    }
  );
}
