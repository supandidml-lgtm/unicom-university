'use client';

import { useEffect, useState } from 'react';
import { Button, ConfirmDialog, StatusBadge } from '@unicom/ui';
import { formatDate, safeRequestMessage } from '../lib/presentation';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
type Certificate = {
  certificateId: string;
  certificateNumber: string;
  brand: string;
  curriculum: string;
  completionDate: string;
  issuedAt: string;
  status: 'ISSUED' | 'REVOKED';
  pdfStatus: string;
  downloadable: boolean;
  revocationReason?: string;
};

export function CertificateDetail({
  certificateId,
  allowRevoke,
}: {
  certificateId: string;
  allowRevoke: boolean;
}) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('Loading certificate…');
  const [confirmingRevocation, setConfirmingRevocation] = useState(false);
  const [revoking, setRevoking] = useState(false);
  useEffect(() => {
    void load();
  }, [certificateId]);
  async function load() {
    const response = await fetch(`${apiBaseUrl}/api/v1/certificates/${certificateId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      setMessage(safeRequestMessage(response.status));
      return;
    }
    setCertificate((await response.json()) as Certificate);
    setMessage('');
  }
  async function revoke() {
    if (!reason.trim()) {
      setMessage('A revocation reason is required.');
      return;
    }
    setRevoking(true);
    try {
      const csrf = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
      if (!csrf.ok) throw new Error('csrf');
      const token = ((await csrf.json()) as { csrfToken: string }).csrfToken;
      const response = await fetch(`${apiBaseUrl}/api/v1/certificates/${certificateId}/revoke`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        setMessage(safeRequestMessage(response.status));
        return;
      }
      setConfirmingRevocation(false);
      setReason('');
      await load();
    } catch {
      setMessage(safeRequestMessage());
    } finally {
      setRevoking(false);
    }
  }
  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-2xl p-5 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-950">Certificate detail</h1>
        {message ? (
          <p className="mt-4" role="status">
            {message}
          </p>
        ) : null}
        {certificate ? (
          <div className="mt-6 space-y-3 text-slate-700">
            <p>
              <strong>Certificate number:</strong> {certificate.certificateNumber}
            </p>
            <p>
              <strong>Brand:</strong> {certificate.brand}
            </p>
            <p>
              <strong>Curriculum:</strong> {certificate.curriculum}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <strong>Status:</strong>{' '}
              <StatusBadge
                status={certificate.status === 'REVOKED' ? 'REVOKED' : certificate.pdfStatus}
              />
            </p>
            <p>
              <strong>Completion date:</strong> {formatDate(certificate.completionDate)}
            </p>
            {certificate.downloadable ? (
              <a
                className="inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                href={`${apiBaseUrl}/api/v1/certificates/${certificate.certificateId}/download`}
              >
                Download Certificate
              </a>
            ) : null}
            {certificate.status === 'REVOKED' ? (
              <p role="status">Revoked: {certificate.revocationReason}</p>
            ) : null}
            {allowRevoke && certificate.status === 'ISSUED' ? (
              <div className="border-t pt-4">
                <label className="block font-semibold" htmlFor="revoke-reason">
                  Revocation reason
                </label>
                <textarea
                  id="revoke-reason"
                  className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3"
                  aria-describedby="revoke-help"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <p id="revoke-help" className="mt-2 text-sm text-slate-600">
                  The Participant will no longer be able to download this certificate.
                </p>
                <Button
                  className="mt-3"
                  variant="destructive"
                  onClick={() => setConfirmingRevocation(true)}
                  disabled={!reason.trim()}
                >
                  Revoke certificate
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      <ConfirmDialog
        open={confirmingRevocation}
        title="Revoke this certificate?"
        description="The Participant will no longer be able to download this certificate. This historical record is retained."
        confirmLabel="Revoke certificate"
        busy={revoking}
        onCancel={() => setConfirmingRevocation(false)}
        onConfirm={() => void revoke()}
      />
    </main>
  );
}
