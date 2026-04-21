'use client';

import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';

export default function ScenarioUploader() {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
        <FileJson className="w-5 h-5 text-tad-accent" />
        <h2 className="font-semibold text-lg">Scenario Uploader</h2>
      </div>

      <div className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-black/20 hover:bg-black/40 hover:border-tad-accent/50 transition-colors cursor-pointer group">
        <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-tad-accent" />
        </div>
        <p className="text-sm font-medium mb-1">Drag and drop simulation payload</p>
        <p className="text-xs text-gray-500 max-w-[200px]">
          Upload JSON/CSV to configure variables for complex scenarios (e.g. "Rain Day", "Rush Hour")
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-xs text-blue-200">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
        <p>Loading a scenario overrides manual API control parameters above.</p>
      </div>
    </div>
  );
}
