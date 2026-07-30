'use client';

import { MYIDTRAVEL_STATUSES, MYIDTRAVEL_LABELS, MYIDTRAVEL_PBOARD, type MyIdTravelStatus } from '@/lib/constants';

const STATUS_COLOR: Record<MyIdTravelStatus, string> = {
  green: 'bg-boarded text-navy',
  orange: 'bg-amber text-navy',
  red: 'bg-denied text-navy',
};

export default function MyIdTravelStatusPicker({
  value,
  onChange,
}: {
  value: MyIdTravelStatus | null;
  onChange: (status: MyIdTravelStatus) => void;
}) {
  return (
    <div className="flex gap-2">
      {MYIDTRAVEL_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            value === status ? STATUS_COLOR[status] : 'bg-navy text-text-muted'
          }`}
        >
          {MYIDTRAVEL_LABELS[status]}
          <span className="block text-[10px] opacity-80">{Math.round(MYIDTRAVEL_PBOARD[status] * 100)}%</span>
        </button>
      ))}
    </div>
  );
}
