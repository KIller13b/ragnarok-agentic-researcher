import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#111C30] border border-slate-200/90 dark:border-[#29364B] rounded-xl shadow-sm transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
