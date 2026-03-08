import { useEffect, useState, useRef } from 'react';
import { getMedia, uploadMedia, getCampaigns, addVideoToCampaign } from '../../services/api';
import { CloudUpload, Link as LinkIcon, Film, CheckCircle, Trash2, Plus, Info, Zap, Calendar, Play, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function MediaPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form State
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(15);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [mediaData, campaignsData] = await Promise.all([
        getMedia(),
        getCampaigns()
      ]);
      setMedia(Array.isArray(mediaData) ? mediaData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      console.error("Failed to load ecosystem data", err);
      setError("FAILED TO RETRIEVE MEDIA CLOUD INVENTORY. CHECK STORAGE UPLINK.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return alert("Please select a video file.");
    if (!selectedCampaign) return alert("Selecting a target campaign is mandatory.");
    if (!title) return alert("Asset title is required.");

    setUploading(true);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Backend handles S3 and DB Synchronization
      const uploadedData = await uploadMedia(formData);
      
      // 2. Link the new Media ID to the Campaign
      await addVideoToCampaign(selectedCampaign, {
        type: 'video',
        filename: title, // Using title as filename for display
        url: uploadedData.url,
        fileSize: uploadedData.size,
        checksum: uploadedData.id, // Using the media ID as checksum for now
        duration: Number(duration)
      });

      setShowUploadModal(false);
      setTitle('');
      setSelectedCampaign('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (e: any) {
      alert("Injection Failed: " + (e.response?.data?.message || e.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Media <span className="text-tad-yellow text-shadow-glow">Assets</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Centralized repository for DOOH content. Assets are automatically optimized and distributed across the tablet fleet.
          </p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="group relative flex items-center justify-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.4)]"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Deploy New Asset
        </button>
      </div>

      {error && (
        <div className="mb-10 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 animate-pulse">
           <Activity className="w-5 h-5 flex-shrink-0" />
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Storage Handshake Error</p>
              <p className="text-xs font-bold leading-tight">{error}</p>
           </div>
        </div>
      )}

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-tad-yellow/10 rounded-xl text-tad-yellow">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Blobs</p>
              <h3 className="text-2xl font-bold text-white">{media.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-800 rounded-xl text-zinc-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Network Capacity</p>
              <h3 className="text-2xl font-bold text-white">99.9%</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-tad-yellow/10 rounded-xl text-tad-yellow">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Cloud Health</p>
              <h3 className="text-2xl font-bold text-white">Active</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : media.length > 0 ? (
          media.map((file, i) => (
            <div key={i} className="group relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-tad-yellow/50 transition-all hover:shadow-[0_0_30px_rgba(250,212,0,0.15)]">
              {/* Thumbnail Mock */}
              <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-tad-yellow/5 mix-blend-overlay group-hover:bg-tad-yellow/10 transition-colors" />
                <Play className="w-12 h-12 text-tad-yellow/50 group-hover:scale-125 transition-transform" />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] text-gray-300 font-mono">
                  {file.mime?.split('/')[1].toUpperCase()}
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-white font-bold truncate max-w-[180px]">{file.filename.split('/').pop()}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-mono">
                      <Zap className="w-3 h-3 text-tad-yellow" />
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : 'Recently'}
                  </div>
                  <span className="text-[10px] bg-tad-yellow/10 text-tad-yellow px-2 py-1 rounded-full border border-tad-yellow/20 font-bold tracking-wider">
                    READY
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center">
            <Film className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No media assets found</h3>
            <p className="text-gray-500 mt-2">Deploy your first asset to start the platform synchronization.</p>
          </div>
        )}
      </div>

      {/* Upload Modal (Overlay) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !uploading && setShowUploadModal(false)} />
          <div className="relative bg-zinc-900 border border-white/20 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CloudUpload className="text-tad-yellow" /> Deploy Asset
                </h3>
                <p className="text-gray-400 text-sm mt-1">Bind a new video payload to your network containers.</p>
              </div>
              {!uploading && (
                <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-white">
                  <Trash2 className="w-6 h-6 rotate-45" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpload} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Source Video</label>
                  <div className="relative flex items-center justify-center border-2 border-dashed border-white/10 group-hover:border-tad-yellow/40 rounded-2xl p-6 transition-colors cursor-pointer bg-white/5">
                    <input 
                      required 
                      type="file" 
                      accept="video/mp4, video/webm"
                      ref={fileInputRef} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <div className="text-center">
                      <Film className="w-8 h-8 text-gray-500 mb-2 mx-auto" />
                      <p className="text-sm text-gray-300">Drop payload or click to browse</p>
                      <p className="text-[10px] text-gray-500 mt-1">MP4 or WebM (Max 50MB)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Asset Title</label>
                    <input 
                      required 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow focus:ring-1 focus:ring-tad-yellow outline-none transition-all"
                      placeholder="Summer 2026 Spot"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Loop Duration</label>
                    <input 
                      required 
                      type="number" 
                      value={duration} 
                      onChange={e => setDuration(Number(e.target.value))} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow focus:ring-1 focus:ring-tad-yellow outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Network Container (Campaign)</label>
                  <select 
                    required 
                    value={selectedCampaign} 
                    onChange={e => setSelectedCampaign(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>-- Select Target Container --</option>
                    {campaigns?.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={uploading} 
                  type="submit" 
                  className="w-full flex justify-center py-4 px-4 bg-tad-yellow hover:bg-yellow-400 text-black font-black rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed items-center gap-3 active:scale-95"
                >
                  {uploading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 shadow-inner" />}
                  {uploading ? "INJECTING PAYLOAD..." : "DEPLOY TO NETWORK"}
                </button>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 justify-center">
                  <Info className="w-3 h-3" />
                  Assets are processed through high-bandwidth R2 edge nodes.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const RefreshCcw = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
);
