'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@unicom/ui';
import { formatDate, safeRequestMessage } from '../../../lib/presentation';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
type Certificate = {
  certificateId: string;
  certificateNumber: string;
  brand: string;
  curriculum: string;
  completionDate: string;
  issuedAt: string;
  status: 'ISSUED' | 'REVOKED';
  pdfStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  downloadable: boolean;
};

export default function MyCertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void load();
  }, []);
  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/my-training/certificates`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setMessage(safeRequestMessage(response.status));
        return;
      }
      setItems((await response.json()) as Certificate[]);
    } catch {
      setMessage(safeRequestMessage());
    } finally {
      setLoading(false);
    }
  }
  const certificateStatus = (item: Certificate): string =>
    item.status === 'REVOKED' ? 'REVOKED' : item.pdfStatus;
  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-5xl p-5 sm:p-8">
        <a className="text-sm font-semibold text-indigo-700" href="/my-training">
          ← My Training
        </a>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">My Certificates</h1>
        <p className="mt-2 text-slate-600">
          Certificates are issued from verified completed training only.
        </p>
        {message ? (
          <div
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            role="alert"
          >
            {message}{' '}
            <button
              type="button"
              className="ml-2 font-semibold underline"
              onClick={() => void load()}
            >
              Try again
            </button>
          </div>
        ) : null}
        {loading ? (
          <div
            className="mt-6 h-36 animate-pulse rounded-xl bg-slate-100"
            role="status"
            aria-label="Loading certificates"
          />
        ) : null}
        <ul className="mt-6 grid gap-4">
          {items.map((item) => (
            <li key={item.certificateId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{item.brand}</h2>
                  <p className="mt-1 text-sm text-slate-700">{item.curriculum}</p>
                </div>
                <StatusBadge status={certificateStatus(item)} />
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Certificate: {item.certificateNumber} · Completed {formatDate(item.completionDate)}{' '}
                · Issued {formatDate(item.issuedAt)}
              </p>
              {item.downloadable ? (
                <a
                  className="mt-4 inline-block rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"
                  href={`${apiBaseUrl}/api/v1/my-training/certificates/${item.certificateId}/download`}
                >
                  Download Certificate
                </a>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  {item.status === 'REVOKED'
                    ? 'This historical certificate has been revoked and cannot be downloaded.'
                    : 'Your certificate PDF is being prepared.'}
                </p>
              )}
            </li>
          ))}
        </ul>
        {!loading && !message && items.length === 0 ? (
          <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <h2 className="font-semibold text-slate-950">No certificates available</h2>
            <p className="mt-1 text-sm text-slate-600">
              Certificates appear here after verified training completion.
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
