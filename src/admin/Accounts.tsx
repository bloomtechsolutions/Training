import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, Copy, Search, Ban, CheckCircle2, RefreshCw } from 'lucide-react';
import { useStore, api, uid, audit } from '../lib/store';
import { Badge, Button, Card, PageHeader, Modal, Field, inputCls, cx, EmptyState, Spinner, copyText, toCsv } from '../components/ui';
import { ExportButtons } from '../components/shared';
import { formatDateTime } from '../lib/time';

interface Account { id: string; login: string; name: string; role: string; trainerId: string | null; hasCode: boolean; disabled: boolean; lastLoginAt: string | null }

export default function AccountsAdmin() {
  const { db, toast, update } = useStore();
  const [list, setList] = useState<Account[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [issued, setIssued] = useState<{ login: string; code: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ login: '', name: '', role: 'trainer', trainerId: '' });
  const [busy, setBusy] = useState(false);
  const NEW = '__new';
  const staffTrainers = db.trainers.filter((t) => t.kind === 'staff');
  const missing = f.role === 'trainer' && !f.trainerId ? 'Choose a trainer profile, or create a new one'
    : f.role === 'trainer' && f.trainerId === NEW && f.name.trim().length < 2 ? 'Enter the display name for the new trainer'
    : !/^[a-z0-9._-]{3,40}$/.test(f.login) ? 'Sign-in ID: at least 3 letters, numbers, dots or dashes'
    : '';

  const load = () => api<{ accounts: Account[] }>('admin/accounts').then((r) => { setList(r.accounts); setError(''); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (list ?? []).filter((a) => (role === 'all' || a.role === role) && (!q || `${a.login} ${a.name}`.toLowerCase().includes(q.toLowerCase()))), [list, q, role]);

  const issue = async (ids: string[]) => {
    setBusy(true);
    const out: { login: string; code: string; name: string }[] = [];
    try {
      for (const id of ids) {
        const r = await api<{ code: string; login: string }>('admin/accounts', { action: 'code', id });
        out.push({ ...r, name: list?.find((a) => a.id === id)?.name ?? '' });
      }
      setIssued(out);
      load();
    } catch (e) { toast((e as Error).message, 'err'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Govern" title="Sign-in & access codes" subtitle="Everyone signs in with their staff ID (or sign-in name) and a personal access code. Issuing a new code replaces the old one. Codes are shown once; they are stored only as secure hashes."
        actions={<>
          <Button variant="secondary" icon={<KeyRound size={16} />} disabled={busy || !shown.some((a) => a.role === 'participant' && !a.hasCode)} disabledReason="Every participant shown already has a code" onClick={() => issue(shown.filter((a) => a.role === 'participant' && !a.hasCode).map((a) => a.id))}>Issue codes to participants without one</Button>
          <Button icon={<Plus size={16} />} onClick={() => { setF({ login: '', name: '', role: 'trainer', trainerId: staffTrainers.length ? '' : '__new' }); setCreating(true); }}>Add staff account</Button>
        </>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" size={17} /><label htmlFor="acq" className="sr-only">Search</label><input id="acq" className={cx(inputCls, 'pl-10')} placeholder="Search sign-in ID or name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <label htmlFor="acr" className="sr-only">Role</label>
        <select id="acr" className={cx(inputCls, 'sm:w-48')} value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="participant">Participants</option><option value="trainer">Trainers</option><option value="admin">Organisers</option><option value="leadership">Leadership</option></select>
      </div>
      {error ? <EmptyState title="Couldn’t load accounts" body={error} action={<Button onClick={load} icon={<RefreshCw size={15} />}>Retry</Button>} /> : !list ? <Spinner /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-ink/5 text-left text-xs text-ink-3"><th className="px-4 py-3 font-semibold">Name</th><th className="font-semibold">Sign-in ID</th><th className="font-semibold">Role</th><th className="font-semibold">Access</th><th className="font-semibold">Last sign-in</th><th className="px-4 text-right font-semibold">Actions</th></tr></thead>
            <tbody>{shown.map((a) => (
              <tr key={a.id} className={cx('border-b border-ink/5 last:border-0', a.disabled && 'opacity-50')}>
                <td className="px-4 py-2.5 font-semibold">{a.name}{a.trainerId && <div className="text-xs font-normal text-ink-3">Trainer profile: {db.trainers.find((t) => t.id === a.trainerId)?.name}</div>}</td>
                <td className="font-mono text-xs">{a.login}</td>
                <td><Badge tone={a.role === 'admin' ? 'red' : a.role === 'trainer' ? 'lav' : a.role === 'leadership' ? 'amber' : 'ink'}>{a.role}</Badge></td>
                <td>{a.disabled ? <Badge tone="ink">Disabled</Badge> : a.hasCode ? <Badge tone="teal" icon={<CheckCircle2 size={11} />}>Code issued</Badge> : <Badge tone="amber">No code yet</Badge>}</td>
                <td className="text-xs text-ink-3">{a.lastLoginAt ? formatDateTime(new Date(a.lastLoginAt).getTime()) : '—'}</td>
                <td className="whitespace-nowrap px-4 text-right">
                  {!(a.login === 'admin') && <Button size="sm" variant="ghost" icon={<KeyRound size={14} />} disabled={busy} onClick={() => issue([a.id])}>{a.hasCode ? 'New code' : 'Issue code'}</Button>}
                  {a.login !== 'admin' && <Button size="sm" variant="ghost" icon={a.disabled ? <CheckCircle2 size={14} /> : <Ban size={14} />} onClick={() => api('admin/accounts', { action: a.disabled ? 'enable' : 'disable', id: a.id }).then(load).catch((e) => toast(e.message, 'err'))}>{a.disabled ? 'Enable' : 'Disable'}</Button>}
                  {a.login === 'admin' && <span className="text-xs text-ink-3">Uses ADMIN_PASSWORD</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-ink-3">Participants imported in Participants get an account automatically; issue their codes here and hand them out privately (printed slips or a direct message). Corporate sign-in (Microsoft Entra ID) can replace codes later.</p>

      <Modal open={issued.length > 0} onClose={() => setIssued([])} title={`New access code${issued.length > 1 ? 's' : ''}`} wide footer={<><ExportButtons filename="access-codes.csv" getText={() => toCsv([['name', 'sign_in_id', 'access_code'], ...issued.map((i) => [i.name, i.login, i.code])])} label="Download CSV" /><Button onClick={() => setIssued([])}>Done</Button></>}>
        <p className="mb-3 text-sm text-ink-2">Share each code privately. They will not be shown again; issue a new one if lost.</p>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl ring-1 ring-ink/10">
          <table className="w-full text-sm"><tbody>{issued.map((i) => (
            <tr key={i.login} className="border-b border-ink/5 last:border-0"><td className="px-3 py-2">{i.name}</td><td className="font-mono text-xs">{i.login}</td><td className="font-mono text-base font-bold tracking-widest">{i.code}</td><td className="pr-2 text-right"><Button size="sm" variant="ghost" aria-label="Copy" icon={<Copy size={14} />} onClick={async () => toast((await copyText(`${i.login} / ${i.code}`)) ? 'Copied' : 'Clipboard unavailable', 'info')} /></td></tr>
          ))}</tbody></table>
        </div>
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add a staff account" footer={<><span className="mr-auto text-xs font-semibold text-bml">{missing}</span><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button disabled={busy || !!missing} disabledReason={missing} onClick={async () => {
        setBusy(true);
        try {
          let trainerId = f.trainerId;
          if (f.role === 'trainer' && trainerId === NEW) {
            // Create the trainer profile first, then link the sign-in to it.
            trainerId = uid('t');
            const COLORS = ['#B50928', '#7C5CFA', '#0E9384', '#E8502F', '#2563EB', '#D98A0B', '#9333EA', '#0F766E'];
            const res = await update((d) => { d.trainers.push({ id: trainerId, name: f.name.trim(), kind: 'staff', designation: '', department: '', expertise: [], bio: '', color: COLORS[d.trainers.length % COLORS.length], questions: [] }); audit(d, 'admin', 'trainer.create', `Added ${f.name.trim()}`); });
            if (!res) return;
          }
          const name = f.name || (f.role === 'trainer' ? db.trainers.find((t) => t.id === trainerId)?.name ?? f.login : f.login);
          const r = await api<{ code: string; login: string }>('admin/accounts', { action: 'create', ...f, trainerId, name });
          setCreating(false); setIssued([{ ...r, name }]); setF({ login: '', name: '', role: 'trainer', trainerId: '' }); load();
        } catch (e) { toast((e as Error).message, 'err'); } finally { setBusy(false); }
      }}>Create and issue code</Button></>}>
        <div className="space-y-3">
          <Field label="Role" htmlFor="na-role"><select id="na-role" className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="trainer">Trainer</option><option value="admin">Event organiser (admin)</option><option value="leadership">Leadership (read-only reports)</option></select></Field>
          {f.role === 'trainer' && <Field label="Trainer profile" htmlFor="na-tr" hint={f.trainerId === NEW ? 'A new trainer profile will be created with the display name below. Assign sessions to it in the Agenda builder.' : undefined}><select id="na-tr" className={inputCls} value={f.trainerId} onChange={(e) => setF({ ...f, trainerId: e.target.value })}><option value="">Choose…</option><option value={NEW}>＋ Create a new trainer profile</option>{staffTrainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
          <Field label="Sign-in ID" htmlFor="na-login" hint="Their staff ID is a good choice. Letters, numbers, dots and dashes."><input id="na-login" className={inputCls} value={f.login} onChange={(e) => setF({ ...f, login: e.target.value.toLowerCase() })} /></Field>
          <Field label="Display name" htmlFor="na-name"><input id="na-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
