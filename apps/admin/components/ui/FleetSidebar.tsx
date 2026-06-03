import React from 'react';

interface FleetSidebarProps {
  [key: string]: any;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = (props) => {
  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">Fleet Status</h2>
        <div className="text-slate-400 text-sm">Fleet sidebar placeholder</div>
      </div>
    </div>
  );
};
