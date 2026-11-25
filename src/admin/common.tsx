import React from 'react';
import { Eye } from 'lucide-react';
import { useStore } from '../lib/store';

export function useReadOnly() {
  const { role } = useStore();
  return role === 'leadership';
}

export function ReadOnlyNote() {
  const ro = useReadOnly();
  if (!ro) return null;
  return <div className="mb-4 flex items-center gap-2 rounded-xl bg-lav-50 px-3 py-2 text-xs font-semibold text-lav-700"><Eye size={14} /> Leadership view: read-only, aggregated reporting.</div>;
}

export const ADMIN_ACTOR = 'Event Organiser (demo)';
