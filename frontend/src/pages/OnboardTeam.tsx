import { useState, useEffect, useCallback } from 'react';
import { Upload, Users, CheckCircle2, AlertCircle, SkipForward, Copy, Trash2, ShieldCheck, Shield } from 'lucide-react';
import { authService, OnboardResult, TeamMember } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

const SAMPLE_CSV = `Name,Email,WhatsApp Number,Designation
Asha Rao,asha@acme.com,9876543210,Developer
Vivek Nair,vivek@acme.com,9876543211,Intern`;

const OnboardTeam = () => {
  const { user } = useAuth();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await authService.getTeam());
    } catch {
      /* ignore — surfaced elsewhere */
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadTeam();
  }, [isAdmin, loadTeam]);

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from your organization? This cannot be undone.`)) return;
    setBusyId(member.id);
    setError('');
    try {
      await authService.deleteEmployee(member.id);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Could not remove member.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetRole = async (member: TeamMember, role: 'ADMIN' | 'MEMBER') => {
    const verb = role === 'ADMIN' ? 'make an admin' : 'change to a member';
    if (!window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)}: ${member.name}?`)) return;
    setBusyId(member.id);
    setError('');
    try {
      await authService.setMemberRole(member.id, role);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Could not change role.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-gray-400">Only admins can onboard or manage members.</div>;
  }

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setError('');
    setResult(null);
    if (!csv.trim()) {
      setError('Please choose a CSV file or paste CSV content first.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.onboardEmployees(csv);
      setResult(res);
      await loadTeam();
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = result.created
      .map((c) => `${c.name}, ${c.email}, ${c.phone}, password: ${c.tempPassword}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Users className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Onboard Your Team</h1>
          <p className="text-gray-400 text-sm">
            Upload a CSV (Name, Email, WhatsApp Number, Designation). Members are registered under your
            organization. Roles (Admin/Member) are separate from job designations.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">CSV file</label>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-700 hover:border-primary-500 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-300">{fileName || 'Choose a .csv file'}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Columns are matched flexibly (e.g. "WhatsApp Number"/"Phone", "Designation"/"Title"). A
            10-digit number defaults to +91. Designation defaults to "Employee" if omitted.
          </p>
        </div>

        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-300">See expected format</summary>
          <pre className="mt-2 p-3 rounded-lg bg-black/30 overflow-x-auto text-gray-400">{SAMPLE_CSV}</pre>
        </details>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="btn-primary px-6 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Onboarding…' : 'Onboard Members'}
        </button>
      </div>

      <div className="glass-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
          <Users className="w-5 h-5" /> Your Team ({team.length})
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Members in your organization. Promote a member to Admin to grant billing/admin access, or remove
          them (their tasks are reassigned to you).
        </p>
        {team.length === 0 ? (
          <p className="text-sm text-gray-500">No members yet. Upload a CSV above to onboard your team.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-left">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Designation</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {team.map((m) => (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="py-2 pr-4">
                      {m.name}
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </td>
                    <td className="py-2 pr-4">{m.designation || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'ADMIN' ? 'bg-primary-500/10 text-primary-300' : 'bg-white/5 text-gray-400'}`}>
                        {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{m.phone}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">
                      {m.role === 'MEMBER' ? (
                        <button
                          onClick={() => handleSetRole(m, 'ADMIN')}
                          disabled={busyId === m.id}
                          className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50 mr-3"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetRole(m, 'MEMBER')}
                          disabled={busyId === m.id}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 mr-3"
                        >
                          <Shield className="w-3.5 h-3.5" /> Make Member
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(m)}
                        disabled={busyId === m.id}
                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && (
        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-300">
              Organization: <span className="font-semibold text-white">{result.organizationName}</span>
            </span>
            <span className="text-green-400">{result.summary.created} created</span>
            <span className="text-yellow-400">{result.summary.skipped} skipped</span>
            <span className="text-red-400">{result.summary.errors} errors</span>
          </div>

          {result.created.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-2 text-green-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Onboarded ({result.created.length})
                </h3>
                <button
                  onClick={copyCredentials}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                >
                  <Copy className="w-3 h-3" /> Copy credentials
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Share each temporary password with the member — they'll set a new one on first login.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 text-left">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Designation</th>
                      <th className="py-2 pr-4">WhatsApp</th>
                      <th className="py-2 pr-4">Temp Password</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {result.created.map((c) => (
                      <tr key={c.id} className="border-t border-white/5">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.email}</td>
                        <td className="py-2 pr-4">{c.designation}</td>
                        <td className="py-2 pr-4">{c.phone}</td>
                        <td className="py-2 pr-4 font-mono text-primary-300">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.skipped.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
                <SkipForward className="w-4 h-4" /> Skipped ({result.skipped.length})
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    Row {s.row}{s.email ? ` (${s.email})` : ''} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                <AlertCircle className="w-4 h-4" /> Errors ({result.errors.length})
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}{e.email ? ` (${e.email})` : ''} — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardTeam;
