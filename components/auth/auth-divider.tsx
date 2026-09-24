import React from 'react';

export function AuthDivider() {
  return (
    <div className="relative flex items-center justify-center my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-800" />
      </div>
      <div className="relative px-3 bg-[#0E1420] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
        or continue with email
      </div>
    </div>
  );
}
