import { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle2, Circle, Play, X, Plus, CalendarDays, Library, PlusCircle, AlertCircle, Loader2, Info, Check, MonitorPlay, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface WorkoutVideo {
  id: string;
  fields: {
    Title: string;
    "Video URL": string;
    Platform?: string;
    "Scheduled Day"?: string[];
    Status?: boolean;
    "Aesthetic Rating"?: number;
    Category?: string;
    Notes?: string;
  };
}

export default function App() {
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'today' | 'library' | 'add'>('today');
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(today) ? today : 'Monday';
  });

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workout');
      if (res.status === 401) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'AIRTABLE_UNAUTHORIZED') {
          setError('AIRTABLE_UNAUTHORIZED');
        } else {
          setError('AIRTABLE_TOKEN_MISSING');
        }
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch from backend');
      const data = await res.json();
      setVideos(data.records || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Keep screen awake (silent fail if unsupported)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Silent block - we don't bother the user with error popups here.
      }
    };
    
    // Request on mount and visibility change
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean | undefined) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI Update
    setVideos(prev => prev.map(v => 
      v.id === id ? { ...v, fields: { ...v.fields, Status: newStatus } } : v
    ));

    try {
      await fetch('/api/workout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isCompleted: newStatus })
      });
    } catch (err: any) {
      console.error("Failed to update status", err);
      // Revert optimistic update on failure
      setVideos(prev => prev.map(v => 
        v.id === id ? { ...v, fields: { ...v.fields, Status: currentStatus } } : v
      ));
    }
  };

  const getEmbedUrl = (url?: string, platform?: string) => {
    if (!url) return '';
    const p = platform?.toLowerCase() || '';
    if (p.includes('bilibili') || url.includes('bilibili')) {
      const bvMatch = url.match(/(BV[a-zA-Z0-9]+)/);
      if (bvMatch) return `//player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1&high_quality=1&danmaku=0&autoplay=1`;
    } else if (p.includes('youtube') || url.includes('youtube') || url.includes('youtu.be')) {
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  const getThumbnail = (url?: string) => {
    if (!url) return null;
    if (url.includes('youtube') || url.includes('youtu.be')) {
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    }
    return null; // fallback to CSS gradient
  };

  if (error === 'AIRTABLE_TOKEN_MISSING' || error === 'AIRTABLE_UNAUTHORIZED') {
    const title = error === 'AIRTABLE_UNAUTHORIZED' ? 'Invalid Token' : 'Setup Required';
    const description = error === 'AIRTABLE_UNAUTHORIZED' 
      ? 'The Airtable Token you provided is invalid or does not have the correct permissions. Please double check that it is a valid Personal Access Token starting with "pat..."'
      : 'Please select the Settings gear icon and add your Airtable Personal Access Token in the Secrets menu. Ensure you name it <code className="text-zinc-300 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">AIRTABLE_TOKEN</code>.';

    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-stone-900">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-stone-900">{title}</h1>
          <p className="text-stone-500 mb-8 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }}></p>
          <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-stone-500">Base Requirements</h3>
            <ul className="text-sm text-stone-600 space-y-3 font-medium">
              <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-emerald-500" /> Base ID: <code className="text-stone-700 bg-white border border-stone-200 px-1 py-0.5 rounded ml-auto">appxnU6olmUvwZ7Bt</code></li>
              <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-emerald-500" /> Table: <code className="text-stone-700 bg-white border border-stone-200 px-1 py-0.5 rounded ml-auto">Workout Videos</code></li>
              <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-emerald-500" /> Scopes: <code className="text-stone-700 bg-white border border-stone-200 px-1 py-0.5 rounded ml-auto text-xs">data.records:read/write</code></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const [editingVideo, setEditingVideo] = useState<WorkoutVideo | null>(null);

  const startEdit = (video: WorkoutVideo) => {
    setEditingVideo(video);
    setActiveTab('add');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 font-sans selection:bg-rose-500/30 overflow-hidden flex flex-col">
      {/* Dynamic Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div key="today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TodayView 
                videos={videos} 
                loading={loading} 
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                toggleStatus={toggleStatus}
                setPlayingVideoUrl={setPlayingVideoUrl}
                getEmbedUrl={getEmbedUrl}
                getThumbnail={getThumbnail}
              />
            </motion.div>
          )}
          {activeTab === 'library' && (
            <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <LibraryView 
                videos={videos} 
                loading={loading}
                toggleStatus={toggleStatus}
                setPlayingVideoUrl={setPlayingVideoUrl}
                getEmbedUrl={getEmbedUrl}
                getThumbnail={getThumbnail}
                onEdit={startEdit}
              />
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AddVideoView 
                initialData={editingVideo}
                onCancel={() => {
                  setEditingVideo(null);
                  setActiveTab('library');
                }}
                onSuccess={() => {
                  fetchVideos();
                  setEditingVideo(null);
                  setActiveTab(editingVideo ? 'library' : 'today');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-stone-200/60 pb-[env(safe-area-inset-bottom)] z-40">
        <div className="flex items-center justify-around w-full max-w-md mx-auto px-6 h-20">
          <NavItem icon={<CalendarDays className="w-6 h-6" />} label="Today" isActive={activeTab === 'today'} onClick={() => setActiveTab('today')} />
          <NavItem icon={<Library className="w-6 h-6" />} label="Library" isActive={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavItem icon={<PlusCircle className="w-6 h-6" />} label="Add" isActive={activeTab === 'add'} onClick={() => { setEditingVideo(null); setActiveTab('add'); }} />
        </div>
      </nav>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {playingVideoUrl && (
          <VideoModal 
            url={playingVideoUrl} 
            onClose={() => setPlayingVideoUrl(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Navigation Item ---
function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-full transition-colors ${isActive ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'scale-100'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    </button>
  );
}

// --- Views ---

function TodayView({ videos, loading, activeDay, setActiveDay, toggleStatus, setPlayingVideoUrl, getEmbedUrl, getThumbnail }: any) {
  const filteredVideos = videos.filter((v: WorkoutVideo) => v.fields["Scheduled Day"]?.includes(activeDay));

  return (
    <div>
      {/* Header & Days Nav */}
      <div className="sticky top-0 z-30 bg-[#FAF9F6]/90 backdrop-blur-xl pt-12 pb-4 px-4 border-b border-stone-200/50">
        <h1 className="text-3xl font-bold tracking-tight px-2 mb-6 text-stone-900">Schedule</h1>
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-2 pb-2 snap-x">
          {DAYS.map(day => (
            <button
               key={day}
               onClick={() => setActiveDay(day)}
               className={`snap-center shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 relative outline-none ${
                 activeDay === day 
                   ? 'text-white shadow-lg shadow-rose-200' 
                   : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200 hover:border-transparent'
               }`}
            >
               {activeDay === day && (
                 <motion.div
                   layoutId="activeDayBg"
                   className="absolute inset-0 bg-rose-400 rounded-full"
                   style={{ zIndex: -1 }}
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
               {day.slice(0, 3)}
             </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-stone-300 animate-spin" /></div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-32 px-4 shadow-sm bg-white rounded-[2.5rem] border border-stone-100">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-100">
              <MonitorPlay className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="text-xl font-medium text-stone-700">Rest Day</h3>
            <p className="text-stone-400 mt-2">Recovery is part of the process.</p>
          </div>
        ) : (
          filteredVideos.map((video: WorkoutVideo) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onToggle={() => toggleStatus(video.id, video.fields.Status)} 
              onPlay={() => setPlayingVideoUrl(getEmbedUrl(video.fields["Video URL"], video.fields.Platform))}
              thumbnail={getThumbnail(video.fields["Video URL"])}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LibraryView({ videos, loading, toggleStatus, setPlayingVideoUrl, getEmbedUrl, getThumbnail, onEdit }: any) {
  const categories = Array.from(new Set(videos.map((v: WorkoutVideo) => v.fields.Category).filter(Boolean))) as string[];
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredVideos = activeCategory === 'All' 
    ? videos 
    : videos.filter((v: WorkoutVideo) => v.fields.Category === activeCategory);

  return (
    <div className="pt-12 px-4 max-w-2xl mx-auto">
      <div className="sticky top-0 z-30 bg-[#FAF9F6]/90 backdrop-blur-xl pb-4 border-b border-stone-200/50 mb-6">
        <h1 className="text-3xl font-bold tracking-tight px-2 mb-6 text-stone-900">Library</h1>
        
        {/* Categories */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-2 pb-2">
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-800 border border-stone-200 focus:outline-none shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 space-y-5 pb-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-stone-300 animate-spin" /></div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20 text-stone-400">No videos in this category.</div>
        ) : (
          filteredVideos.map((video: WorkoutVideo) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onToggle={() => toggleStatus(video.id, video.fields.Status)} 
              onPlay={() => setPlayingVideoUrl(getEmbedUrl(video.fields["Video URL"], video.fields.Platform))}
              thumbnail={getThumbnail(video.fields["Video URL"])}
              onEdit={() => onEdit && onEdit(video)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddVideoView({ initialData, onCancel, onSuccess }: { initialData?: WorkoutVideo | null, onCancel?: () => void, onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    Title: initialData?.fields.Title || '',
    URL: initialData?.fields["Video URL"] || '',
    Platform: initialData?.fields.Platform || 'YouTube',
    Category: initialData?.fields.Category || '',
    Notes: initialData?.fields.Notes || '',
    Rating: initialData?.fields["Aesthetic Rating"] || 0,
    Days: initialData?.fields["Scheduled Day"] || ([] as string[])
  });

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      Days: prev.Days.includes(day) ? prev.Days.filter(d => d !== day) : [...prev.Days, day]
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Title || !formData.URL) return;
    
    setSubmitting(true);
    try {
      const payload = {
        Title: formData.Title,
        "Video URL": formData.URL,
        Platform: formData.Platform,
        Category: formData.Category || undefined,
        Notes: formData.Notes || undefined,
        "Aesthetic Rating": formData.Rating || undefined,
        "Scheduled Day": formData.Days.length > 0 ? formData.Days : undefined,
        Status: initialData ? initialData.fields.Status : false,
      };

      const endpoint = '/api/workout';
      const method = initialData ? 'PATCH' : 'POST';
      const body = initialData ? JSON.stringify({ id: initialData.id, fields: payload }) : JSON.stringify(payload);

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to save to Airtable');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVideo = async () => {
    if (!initialData) return;
    if (!confirm('Are you sure you want to delete this video?')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workout/${initialData.id}`, { method: 'DELETE' });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-12 px-6 pb-12 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{initialData ? 'Edit Workout' : 'Add Workout'}</h1>
        {initialData && onCancel && (
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 font-medium">Cancel</button>
        )}
      </div>
      
      <form onSubmit={submit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-2 uppercase tracking-wider">Title *</label>
          <input required type="text" value={formData.Title} onChange={e => setFormData({...formData, Title: e.target.value})}
            className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-stone-400"
            placeholder="e.g. 20 Min HIIT"
          />
        </div>
        
        {/* URL */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-2 uppercase tracking-wider">Video URL *</label>
          <input required type="url" value={formData.URL} onChange={e => setFormData({...formData, URL: e.target.value})}
            className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-stone-400"
            placeholder="https://youtube.com/..."
          />
        </div>

        {/* Platform & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-500 mb-2 uppercase tracking-wider">Platform</label>
            <div className="relative">
              <select value={formData.Platform} onChange={e => setFormData({...formData, Platform: e.target.value})}
                className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 appearance-none"
              >
                <option>YouTube</option>
                <option>Bilibili</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-stone-400">
                ▼
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-500 mb-2 uppercase tracking-wider">Category</label>
            <input type="text" value={formData.Category} onChange={e => setFormData({...formData, Category: e.target.value})}
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-stone-400"
              placeholder="Yoga, HIIT..."
            />
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-3 uppercase tracking-wider">Schedule For</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button type="button" key={day} onClick={() => toggleDay(day)}
                className={`px-5 py-3 rounded-xl text-sm font-semibold border transition-all duration-300 outline-none ${
                   formData.Days.includes(day) 
                     ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200' 
                     : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 shadow-sm'
                 }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Aesthetic Rating */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-3 uppercase tracking-wider">Aesthetic Rating</label>
          <div className="flex gap-1.5 p-3 bg-white border border-stone-200 shadow-sm rounded-2xl w-fit">
            {[1, 2, 3, 4, 5].map(star => (
              <button type="button" key={star} onClick={() => setFormData({...formData, Rating: star})} className="p-1 outline-none transform transition-transform hover:scale-110">
                <Star className={`w-8 h-8 transition-colors duration-300 ${
                  formData.Rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-stone-100 text-stone-200'
                }`} />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-2 uppercase tracking-wider">Notes</label>
          <textarea value={formData.Notes} onChange={e => setFormData({...formData, Notes: e.target.value})} rows={3}
            className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none placeholder:text-stone-400"
            placeholder="Focus on form, use heavy dumbbells..."
          />
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-4">
          {initialData && (
            <button type="button" disabled={submitting} onClick={deleteVideo}
              className="px-6 bg-white text-rose-500 font-bold py-5 rounded-2xl border border-rose-100 flex items-center justify-center hover:bg-rose-50 transition-all disabled:opacity-50 outline-none shadow-sm"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
          <button disabled={submitting} type="submit"
            className="flex-1 bg-rose-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all disabled:opacity-50 shadow-lg shadow-rose-200 outline-none"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> {initialData ? 'Save Changes' : 'Save Workout'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Components ---

function VideoCard({ video, onToggle, onPlay, thumbnail, onEdit }: { video: WorkoutVideo, onToggle: () => void, onPlay: () => void, thumbnail: string | null, onEdit?: () => void }) {
  const f = video.fields;
  const isCompleted = f.Status;

  return (
    <div className={`relative bg-white rounded-[2.5rem] p-3 border transition-all duration-500 flex flex-col ${
      isCompleted ? 'opacity-60 scale-[0.98] border-stone-100 bg-stone-50' : 'border-stone-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:border-stone-300'
    }`}>
      {/* Thumbnail Area */}
      <div className="relative">
        <button 
          onClick={onPlay}
          className="relative w-full aspect-[16/9] rounded-[2rem] overflow-hidden group outline-none bg-stone-100 flex-shrink-0"
        >
          {thumbnail ? (
            <img src={thumbnail} alt={f.Title} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-stone-100 to-stone-200 flex items-center justify-center">
              <MonitorPlay className="w-16 h-16 opacity-10 text-stone-900" />
            </div>
          )}
          <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-black/10 transition-colors duration-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center text-white p-1 transform transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-500/90 shadow-2xl border border-white/50 group-hover:border-rose-400">
               <Play className="w-7 h-7 ml-1 fill-white shadow-sm" />
            </div>
          </div>
          
          {/* Category Badge on Image */}
          {f.Category && (
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-stone-800 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
              {f.Category}
            </div>
          )}
        </button>

        {/* Edit Button overlay */}
        {onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-stone-600 p-2.5 rounded-full border border-black/5 shadow-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info Area */}
      <div className="pt-5 pb-3 px-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className={`text-xl font-bold tracking-tight mb-2 leading-tight ${isCompleted ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-800'}`}>
            {f.Title || "Untitled"}
          </h3>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`w-4 h-4 ${
                (f["Aesthetic Rating"] || 0) >= star ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'
              }`} />
            ))}
          </div>
        </div>

        {/* Status Toggle Container */}
        <div className="shrink-0 pt-1">
          <button onClick={onToggle} className="outline-none touching-none group pb-2">
            {isCompleted ? (
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-200 shadow-sm transition-all group-hover:bg-emerald-100">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-[2.5px] border-stone-200 flex items-center justify-center group-hover:border-stone-300 transition-colors bg-white shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full bg-transparent group-hover:bg-stone-200 transition-colors" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ url, onClose }: { url: string, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
    >
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[101] backdrop-blur-xl border border-white/10 outline-none"
      >
        <X className="w-6 h-6 stroke-[2.5]" />
      </button>

      <div className="w-full max-w-5xl aspect-video px-2 md:px-12 bg-black overflow-hidden relative">
        {!url ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 flex-col gap-4">
             <AlertCircle className="w-16 h-16 opacity-50" />
             <p className="font-medium">Video source not found</p>
          </div>
        ) : (
          <iframe
            src={url}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy={url.includes('bilibili') ? 'no-referrer' : 'strict-origin-when-cross-origin'}
          />
        )}
      </div>
    </motion.div>
  );
}
