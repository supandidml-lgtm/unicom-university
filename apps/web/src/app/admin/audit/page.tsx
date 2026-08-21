"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Input,
  Select,
  Modal,
  Button,
} from "@unicom/ui";
import {
  Search,
  Eye,
  Lock,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const auditLogs: AuditLogEntry[] = [
    {
      id: "aud-001",
      actorEmail: "admin@unicom.co.id",
      actorRole: "SUPER_ADMIN",
      action: "INITIAL_DATABASE_BOOTSTRAP",
      resource: "SYSTEM",
      ipAddress: "127.0.0.1",
      timestamp: "2026-08-22 00:30:15",
      details: { initializedEntities: 28, multiBrandCount: 6, status: "SUCCESS" },
    },
    {
      id: "aud-002",
      actorEmail: "andi.pratama@unicom.co.id",
      actorRole: "STAFF",
      action: "AUTH_LOGIN_SUCCESS",
      resource: "USER_SESSION",
      ipAddress: "192.168.1.42",
      timestamp: "2026-08-22 00:35:10",
      details: { clientDevice: "Desktop Chrome 128", method: "PASSWORD_HASH" },
    },
    {
      id: "aud-003",
      actorEmail: "andi.pratama@unicom.co.id",
      actorRole: "STAFF",
      action: "EXAM_SUBMITTED",
      resource: "EXAM",
      resourceId: "exam-mi-week-1",
      ipAddress: "192.168.1.42",
      timestamp: "2026-08-22 00:48:22",
      details: { attemptNumber: 1, score: 90, isPassed: true, correctCount: 3, totalQuestions: 3 },
    },
    {
      id: "aud-004",
      actorEmail: "trainer@unicom.co.id",
      actorRole: "TRAINER",
      action: "AI_EXAM_GENERATION_SUCCESS",
      resource: "EXAM_QUESTIONS",
      resourceId: "exam-mi-week-2",
      ipAddress: "192.168.1.18",
      timestamp: "2026-08-22 00:52:05",
      details: { materialId: "mat-v-201", generatedCount: 2, algorithm: "GROUNDED_EXTRACTION" },
    },
    {
      id: "aud-005",
      actorEmail: "admin@unicom.co.id",
      actorRole: "SUPER_ADMIN",
      action: "USER_CREATED",
      resource: "USER",
      resourceId: "usr-staff-3",
      ipAddress: "127.0.0.1",
      timestamp: "2026-08-22 01:02:40",
      details: { nik: "UC10044", name: "Citra Lestari", role: "STAFF", branchId: "branch-bdg" },
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <AppShell pageTitle="Audit Trail Log">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Audit Trail & Compliance Log
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Jejak audit immutable untuk seluruh aktivitas login, mutasi data pengguna, penyelesaian materi, dan evaluasi ujian (PRD §95–§100).
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Immutable Append-Only Log</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Cari email aktor, action, resource..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <Select
              options={[
                { value: "ALL", label: "Semua Action Type" },
                { value: "AUTH_LOGIN_SUCCESS", label: "AUTH_LOGIN_SUCCESS" },
                { value: "EXAM_SUBMITTED", label: "EXAM_SUBMITTED" },
                { value: "USER_CREATED", label: "USER_CREATED" },
                { value: "AI_EXAM_GENERATION_SUCCESS", label: "AI_EXAM_GENERATION_SUCCESS" },
                { value: "INITIAL_DATABASE_BOOTSTRAP", label: "INITIAL_DATABASE_BOOTSTRAP" },
              ]}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Rekaman Aktivitas Sistem ({filteredLogs.length})
            </h3>
            <Badge variant="success" size="sm">Audit Integrity Verified</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Aktor (Actor)</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-slate-900">
                    {log.actorEmail}
                  </TableCell>
                  <TableCell>
                    {log.actorRole === "SUPER_ADMIN" && <Badge variant="default" size="sm">Super Admin</Badge>}
                    {log.actorRole === "TRAINER" && <Badge variant="warning" size="sm">Trainer</Badge>}
                    {log.actorRole === "STAFF" && <Badge variant="neutral" size="sm">Staff</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-blue-700">
                    {log.action}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {log.resource}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal: Audit Log Details */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Detail Audit Log #${selectedLog.id}`}
          description={`Aksi ${selectedLog.action} oleh ${selectedLog.actorEmail} pada ${selectedLog.timestamp}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-[6px] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Resource:</span>
                <p className="font-semibold text-slate-800">{selectedLog.resource}</p>
              </div>
              <div>
                <span className="text-slate-400">IP Address:</span>
                <p className="font-semibold text-slate-800">{selectedLog.ipAddress}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Payload Metadata (JSON):
              </span>
              <pre className="mt-1.5 p-3.5 bg-slate-900 text-slate-100 rounded-[6px] text-xs font-mono overflow-x-auto">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
