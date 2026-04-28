'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { EvalResultsResponse, TestCaseResult } from '@/lib/eval-result-types';
import { ResultsHeader } from '@/components/eval-results/results-header';
import { ResultsToolbar, type FilterMode } from '@/components/eval-results/results-toolbar';
import { ResultsTable } from '@/components/eval-results/results-table';
import { ResultDetailDrawer } from '@/components/eval-results/result-detail-drawer';
import { Loader2 } from 'lucide-react';

export default function EvalResultsPage() {
  const params = useParams<{ evalId: string }>();
  const evalId = params.evalId;

  const [data, setData] = useState<EvalResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [allExpanded, setAllExpanded] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestCaseResult | null>(null);
  const [selectedOutputIdx, setSelectedOutputIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/eval-results/${encodeURIComponent(evalId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<EvalResultsResponse>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [evalId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let results = data.results;

    if (filter !== 'all') {
      results = results.filter((r) => r.outputs.some((o) => o.status === filter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((r) => {
        const varsMatch = Object.values(r.vars).some((v) =>
          v.toLowerCase().includes(q),
        );
        const outputMatch = r.outputs.some((o) =>
          o.rawOutput.toLowerCase().includes(q),
        );
        return varsMatch || outputMatch;
      });
    }

    return results;
  }, [data, filter, search]);

  const counts = useMemo(() => {
    if (!data) return { all: 0, pass: 0, fail: 0, error: 0 };
    const results = data.results;
    return {
      all: results.length,
      pass: results.filter((r) => r.outputs.every((o) => o.status === 'pass')).length,
      fail: results.filter((r) => r.outputs.some((o) => o.status === 'fail')).length,
      error: results.filter((r) => r.outputs.some((o) => o.status === 'error')).length,
    };
  }, [data]);

  const handleCellClick = useCallback(
    (testId: string, outputIndex: number) => {
      const tc = data?.results.find((r) => r.id === testId) ?? null;
      setSelectedTest(tc);
      setSelectedOutputIdx(outputIndex);
      setDrawerOpen(true);
    },
    [data],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-destructive">Failed to load results</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <ResultsHeader summary={data.summary} />

      <ResultsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        allExpanded={allExpanded}
        onToggleExpand={() => setAllExpanded((v) => !v)}
      />

      <ResultsTable
        results={filtered}
        summary={data.summary}
        onCellClick={handleCellClick}
      />

      <ResultDetailDrawer
        testCase={selectedTest}
        outputIndex={selectedOutputIdx}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
