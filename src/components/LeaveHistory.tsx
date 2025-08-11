////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { format, parseISO, differenceInDays } from 'date-fns';


type LeaveItem = {
  id: string;
  start_date: string;
  end_date: string;
  date_range: string;
  status: 'approved' | 'pending' | 'rejected' | string;
  reason?: string | null;
  description?: string | null;
  leave_type?: { name?: string | null } | null;
};

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const yearBounds = (year: string) => ({
  start: `${year}-01-01`,
  end:   `${year}-12-31`,
});

const normalizeDate = (d: string) => {
  try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d; }
};

const normalizeDateWithTime = (d: string) => {
try { return format(parseISO(d), 'MMM dd, yyyy hh:mm a'); } catch { return d; }
};

const LeaveHistory: React.FC = () => {
  const { user } = useAuth();

  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // show only 4 months by default
  const [showAllMonths, setShowAllMonths] = useState(false);

  // filters
  const [monthFilter, setMonthFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] =
    useState<'approved' | 'pending' | 'rejected' | undefined>(undefined);

  // reset month filter when the year changes
  useEffect(() => {
    setMonthFilter(undefined);
  }, [selectedYear]);

  const { start, end } = yearBounds(selectedYear);

  const { data, loading, error, refetch } = useApi(
    () => apiClient.getLeaves?.({
      user_id: user?.id,
      start_date: start,
      end_date: end,
      limit: 1000,
    }),
    [user?.id, start, end]
  );

  const leaves: LeaveItem[] = data?.leaves ?? data?.results ?? data ?? [];

  // Unfiltered status counts (always show totals)
  const statusCounts = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0 };
    for (const l of leaves) {
      const s = (l.status || '').toLowerCase();
      if (s === 'approved') counts.approved++;
      else if (s === 'pending') counts.pending++;
      else if (s === 'rejected') counts.rejected++;
    }
    return counts;
  }, [leaves]);

  // Status-only filtered list
  const statusFilteredLeaves = useMemo(() => {
    if (!statusFilter) return leaves;
    return leaves.filter(l => (l.status || '').toLowerCase() === statusFilter);
  }, [leaves, statusFilter]);

  // Month-only filtered list
  const monthFilteredLeaves = useMemo(() => {
    if (monthFilter === undefined) return leaves;
    return leaves.filter(l => {
      try { return parseISO(l.start_date).getMonth() === monthFilter; }
      catch { return false; }
    });
  }, [leaves, monthFilter]);

  // Final list to show (no combining): month > status > all
  const visibleLeaves = useMemo(() => {
    if (monthFilter !== undefined) return monthFilteredLeaves;
    if (statusFilter) return statusFilteredLeaves;
    return leaves;
  }, [leaves, monthFilter, statusFilter, monthFilteredLeaves, statusFilteredLeaves]);

  // Monthly counts — always full-year totals
  const monthlyData = useMemo(() => {
    const arr = new Array(12).fill(0);
    for (const l of leaves) {
      let monthIdx = -1;
      try { monthIdx = parseISO(l.start_date).getMonth(); } catch {}
      if (monthIdx >= 0) arr[monthIdx] += 1;
    }
    return monthNames.map((month, i) => ({
      month,
      count: arr[i],
      color: 'text-purple-600',
    }));
  }, [leaves]);

  // Recent leaves (based on visibleLeaves)
  const recentLeaves = useMemo(() => {
    const sorted = [...visibleLeaves].sort((a, b) => {
      const da = parseISO(a.start_date).getTime();
      const db = parseISO(b.start_date).getTime();
      return db - da;
    });
    return sorted.slice(0, 8).map(l => ({
      date: normalizeDate(l.start_date),
      type: l.leave_type?.name || 'Leave',
      reason: l.reason || '',
      description: l.description || '',
      status: (l.status || '').toLowerCase() === 'approved'
        ? 'Approved'
        : (l.status || '').toLowerCase() === 'pending'
        ? 'Pending'
        : 'Rejected',
      raw: l,
    }));
  }, [visibleLeaves]);

  // Status pill component
  const StatusPill: React.FC<{
    label: 'Approved' | 'Pending' | 'Rejected';
    color: string;
    count: number;
    value: 'approved' | 'pending' | 'rejected';
  }> = ({ label, color, count, value }) => {
    const active = statusFilter === value;
    return (
      <button
        type="button"
        onClick={() => {
          setStatusFilter(s => (s === value ? undefined : value)); // toggle status
          setMonthFilter(undefined); // clear month when picking status
        }}
        aria-pressed={active}
        className={`w-full rounded-lg px-3 py-2 text-left border transition text-center
          ${active ? 'border-purple-400 bg-purple-50' : 'border-transparent hover:bg-gray-50'}`}
      >
        <div className="flex flex-col items-center gap-1">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{count}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Status Cards (click to filter by status) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatusPill label="Approved" color="bg-green-500" count={statusCounts.approved} value="approved" />
        <StatusPill label="Pending"  color="bg-orange-500" count={statusCounts.pending}  value="pending" />
        <StatusPill label="Rejected" color="bg-red-500"    count={statusCounts.rejected} value="rejected" />
      </div>

      {/* Year Selector */}
      {/* <div className="mb-6">
        <div className="relative">
          <button
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg"
          >
            <span className="text-lg font-semibold text-gray-800">{selectedYear}</span>
            {showYearDropdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showYearDropdown && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 z-10">
              {[String(new Date().getFullYear()), String(new Date().getFullYear() - 1), String(new Date().getFullYear() - 2)].map(year => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                  className="w-full p-3 text-left hover:bg-gray-50"
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      </div> */}

      {/* Monthly Data (only 4 months unless expanded) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {(showAllMonths
          ? monthNames.map((name, idx) => ({ name, idx }))
          : (() => {
              const currentYear = new Date().getFullYear();
              const selected = Number(selectedYear);
              const baseMonth = selected === currentYear ? new Date().getMonth() : 11;
              const startIdx = Math.max(0, baseMonth - 3);
              const endIdx = baseMonth;
              return monthNames
                .map((name, idx) => ({ name, idx }))
                .filter(m => m.idx >= startIdx && m.idx <= endIdx);
            })()
        ).map(({ name, idx }) => {
          const count = monthlyData[idx]?.count ?? 0;
          const color = monthlyData[idx]?.color ?? 'text-purple-600';
          const active = monthFilter === idx;

          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMonthFilter(m => (m === idx ? undefined : idx)); // toggle month
                setStatusFilter(undefined); // clear status when picking month
              }}
              aria-pressed={active}
              className={`p-4 rounded-lg text-left border transition w-full
                ${active ? 'border-purple-400 bg-purple-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                <span className={`text-sm font-bold ${color}`}>({count})</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show More / Less */}
      <div className="text-center mb-6">
        <button
          onClick={() => setShowAllMonths(v => !v)}
          className="text-purple-600 text-sm font-medium inline-flex items-center gap-1"
          aria-expanded={showAllMonths}
        >
          {showAllMonths ? 'Show less' : 'Show more'}
          {showAllMonths ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Loading & Error (inline, no early return) */}
      {loading && <LoadingState message="Loading leave history..." />}
      {!loading && error && (
        <ErrorMessage
          message="Failed to load leave history. Please try again."
          onRetry={refetch}
          variant="full"
        />
      )}

      {/* Recent Leaves (based on visibleLeaves) */}
      {!loading && !error && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {monthFilter !== undefined
              ? `Recent Leaves · ${monthNames[monthFilter]}`
              : statusFilter
              ? `Recent Leaves · ${statusFilter[0].toUpperCase()}${statusFilter.slice(1)}`
              : 'Recent Leaves'}
          </h3>

          {/* ///////////////////////// */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentLeaves.map((leave) => {
              const startDate = parseISO(leave.raw.start_date);
              const endDate = parseISO(leave.raw.end_date);

              const days = differenceInDays(endDate, startDate) + 1;

              // Range formatting
              let dateDisplay;
              if (format(startDate, 'MMM') === format(endDate, 'MMM')) {
                // Same month → Aug 12-13, 2025
                if (days > 1) {
                  dateDisplay = `${format(startDate, 'MMM dd')}-${format(endDate, 'dd, yyyy')}`;
                } else {
                  dateDisplay = `${format(startDate, 'MMM dd, yyyy')}`;
                }
              } else {
                // Different months → Aug 30 - Sep 2, 2025
                dateDisplay = `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
              }

              const appliedDate = leave.raw.applied_on
                ? normalizeDateWithTime(leave.raw.applied_on)
                : normalizeDateWithTime(leave.raw.created_at || leave.raw.start_date);

              return (
                <article
                  key={leave.raw.id ?? `${leave.date}-${leave.type}-${appliedDate}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Top row: Date range + Days + Status */}
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {dateDisplay} ({days} {days > 1 ? 'days' : 'day'})
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap
                        ${leave.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'Pending'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'}`}
                    >
                      {leave.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-gray-500">
                      Type: {leave.type}
                    </p>
                    {/* Reason */}
                    {leave.reason && (
                      <p className="text-xs text-gray-500 mt-1">
                        Reason: {leave.reason}
                      </p>
                    )}

                    {/* Description */}
                    {leave.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        Desc: {leave.description}</p>
                    )}
                    {/* Applied On */}
                    <p className="text-xs text-gray-500 mt-2">
                      Applied on: {appliedDate}
                    </p>
                  </div>
                  
                </article>
                
              );
            })}
          </div>
        
        </div>
      )}
    </div>
  );
};

export default LeaveHistory;