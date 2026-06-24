import { useState } from 'react';
import { Image as ImageIcon, Building2, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user, updateOrganization } = useAuth();
  const org = user?.organization;
  const [name, setName] = useState(org?.name || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(org?.logoUrl || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-gray-400">Only managers can manage organization settings.</div>;
  }

  const handleFile = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 400_000) {
      setError('Image is too large (max ~400KB). Use a smaller logo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      await updateOrganization({ name: name.trim() || undefined, logoUrl });
      setSaved(true);
    } catch (e: any) {
      setError(e.message || 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
        <p className="text-gray-400 text-sm">Your branding replaces the default TaskPulse logo for your team.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{error}</div>
      )}
      {saved && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 text-sm">
          Saved. Your branding is now applied.
        </div>
      )}

      <div className="glass-panel p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Organization name</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full glass-input pl-12"
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-40 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="max-h-14 max-w-[150px] object-contain" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-700 hover:border-primary-500 cursor-pointer text-sm text-gray-300">
                <ImageIcon className="w-4 h-4" /> Choose image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove logo
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">PNG/SVG, transparent background recommended. Max ~400KB.</p>
        </div>

        <button onClick={handleSave} disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
