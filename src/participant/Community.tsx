import React, { useRef, useState } from 'react';
import { Send, ThumbsUp, Crown, Upload, Images, ShieldCheck, MessageSquareReply } from 'lucide-react';
import { useStore, useEvent, uid } from '../lib/store';
import { Badge, Button, Card, PageHeader, Toggle, cx, EmptyState, inputCls, Tabs } from '../components/ui';
import { PhotoTile } from '../components/shared';
import { relTime } from '../lib/time';

export function AskLeadership() {
  const { db, me, update, toast } = useStore();
  const ev = useEvent();
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(true);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const qs = db.qa.filter((q) => q.eventId === ev.id && q.channel === 'leadership' && (q.status === 'approved' || q.status === 'answered' || q.userId === me.id))
    .sort((a, b) => (sort === 'top' ? b.votes.length - a.votes.length : b.ts - a.ts));
  const leader = db.leaders[0];
  return (
    <div>
      <PageHeader eyebrow="Ask Leadership" title="Questions for leadership" subtitle={`Submit questions for ${leader.name || leader.role}. Upvote the ones you want answered. Unanswered questions get follow-up answers after the event.`} />
      <Card className="mb-5 p-5">
        <label htmlFor="lead-q" className="mb-1 block text-sm font-semibold">Your question</label>
        <textarea id="lead-q" className={inputCls} rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about strategy, development, digital-first, customers…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="w-full max-w-sm"><Toggle checked={anon} onChange={setAnon} label="Hide my name from the audience" description="Moderators can still see who asked, for follow-up." /></div>
          <Button disabled={text.trim().length < 8} disabledReason="Type at least 8 characters" icon={<Send size={15} />} onClick={() => { update((d) => { d.qa.push({ id: uid('q'), eventId: ev.id, channel: 'leadership', sessionId: null, userId: me.id, text: text.trim(), anonymous: anon, status: 'pending', votes: [], answer: '', onScreen: false, ts: Date.now() }); }); setText(''); toast('Question sent for moderation'); }}>Submit</Button>
        </div>
      </Card>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">{qs.length} questions</h2><Tabs size="sm" value={sort} onChange={setSort} tabs={[{ id: 'top', label: 'Top' }, { id: 'new', label: 'Newest' }]} /></div>
      {qs.length === 0 ? <EmptyState icon={<Crown />} title="No questions yet" body="Be the first to ask." /> : (
        <ul className="space-y-2">
          {qs.map((q) => {
            const voted = q.votes.includes(me.id);
            const author = db.users.find((u) => u.id === q.userId);
            return (
              <li key={q.id}>
                <Card className="flex gap-3 p-4">
                  <button disabled={q.status === 'pending'} aria-pressed={voted} aria-label={voted ? 'Remove upvote' : 'Upvote'} onClick={() => update((d) => { const x = d.qa.find((y) => y.id === q.id)!; x.votes = voted ? x.votes.filter((v) => v !== me.id) : [...x.votes, me.id]; })} className={cx('flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold transition disabled:opacity-40', voted ? 'bg-bml text-white' : 'bg-canvas text-ink hover:bg-bml-50')}><ThumbsUp size={15} />{q.votes.length}</button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{q.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                      <span>{q.anonymous ? 'Anonymous to audience' : author?.name}{q.userId === me.id ? ' (you)' : ''}</span>·<span>{relTime(q.ts)}</span>
                      {q.status === 'pending' && <Badge tone="amber">Awaiting moderation</Badge>}
                      {q.onScreen && <Badge tone="red">On screen now</Badge>}
                      {q.status === 'answered' && <Badge tone="teal">Answered</Badge>}
                    </div>
                    {q.answer && <div className="mt-2 flex gap-2 rounded-xl bg-teal-50 p-3 text-sm text-ink-2"><MessageSquareReply size={16} className="mt-0.5 shrink-0 text-teal-600" /><span>{q.answer}</span></div>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Resize an uploaded photo in the browser so local storage stays small. */
function resizeImage(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read the file'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('This file is not a supported image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  });
}

export function Gallery() {
  const { db, me, update, toast } = useStore();
  const ev = useEvent();
  const input = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const photos = db.photos.filter((p) => p.eventId === ev.id && (p.status === 'approved' || p.userId === me.id));
  return (
    <div>
      <PageHeader eyebrow="Moderated" title="Event gallery" subtitle="Share moments from the engagement activities. Photos appear for everyone after an organiser approves them." />
      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1"><label htmlFor="ph-cap" className="mb-1 block text-xs font-semibold text-ink-2">Caption</label><input id="ph-cap" className={inputCls} value={caption} maxLength={80} onChange={(e) => setCaption(e.target.value)} placeholder="What’s happening?" /></div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="ph-file" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast('Please choose a JPG, PNG or WebP image', 'err'); return; }
          if (f.size > 8 * 1024 * 1024) { toast('Image is larger than 8 MB', 'err'); return; }
          setBusy(true);
          try {
            const dataUrl = await resizeImage(f);
            update((d) => {
              d.photos.push({ id: uid('ph'), eventId: ev.id, userId: me.id, caption: caption.trim() || 'Untitled', dataUrl, hue: 0, status: 'pending', ts: Date.now() });
              // Keep demo storage bounded.
              const uploaded = d.photos.filter((p) => p.dataUrl);
              if (uploaded.length > 10) d.photos = d.photos.filter((p) => p.id !== uploaded[0].id);
            });
            setCaption(''); toast('Photo uploaded · awaiting moderation');
          } catch (err) { toast((err as Error).message, 'err'); } finally { setBusy(false); }
        }} />
        <Button onClick={() => input.current?.click()} disabled={busy} icon={<Upload size={16} />}>{busy ? 'Processing…' : 'Upload photo'}</Button>
      </Card>
      <p className="mb-4 flex items-center gap-2 text-xs text-ink-3"><ShieldCheck size={14} /> Only share photos of people who agreed to be photographed. Never photograph customer information or screens.</p>
      {photos.length === 0 ? <EmptyState icon={<Images />} title="No photos yet" /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <figure key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
              <PhotoTile {...p} className="rounded-none" />
              <figcaption className="flex items-center justify-between gap-2 p-3 text-xs"><span className="truncate font-semibold text-ink">{p.caption}</span>{p.status === 'pending' && <Badge tone="amber">Pending</Badge>}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
