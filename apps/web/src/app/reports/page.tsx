"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Card,
} from "@unicom/ui";
import {
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function ReportsPage() {
  const staffProgressData = [
    {
      nik: "UC10042",
      name: "Andi Pratama",
      branch: "Jakarta Pusat",
      brand: "Xiaomi",
      program: "Xiaomi Technician",
      courseProgress: "75%",
      examProgress: "55%",
      overall: "68%",
      score: 87.5,
      status: "IN_PROGRESS",
    },
    {
      nik: "UC10043",
      name: "Bambang Wijaya",
      branch: "Surabaya",
      brand: "Xiaomi",
      program: "Xiaomi Technician",
      courseProgress: "100%",
      examProgress: "100%",
      overall: "100%",
      score: 94.0,
      status: "COMPLETED",
    },
    {
      nik: "UC10044",
      name: "Citra Lestari",
      branch: "Bandung",
      brand: "Ecovacs",
      program: "Customer Service Hub",
      courseProgress: "40%",
      examProgress: "20%",
      overall: "32%",
      score: 72.0,
      status: "IN_PROGRESS",
    },
    {
      nik: "UC10045",
      name: "Dedi Kurniawan",
      brand: "Huawei",
      branch: "Medan",
      program: "Huawei Technician",
      courseProgress: "90%",
      examProgress: "80%",
      overall: "86%",
      score: 88.0,
      status: "IN_PROGRESS",
    },
    {
      nik: "UC10046",
      name: "Eko Prasetyo",
      brand: "Tineco",
      branch: "Makassar",
      program: "Tineco Specialist",
      courseProgress: "100%",
      examProgress: "100%",
      overall: "100%",
      score: 96.0,
      status: "COMPLETED",
    },
  ];

  const branchPerformanceData = [
    { name: "Jakarta Pusat", completionRate: 85, activeTrainees: 12 },
    { name: "Surabaya", completionRate: 92, activeTrainees: 8 },
    { name: "Bandung", completionRate: 64, activeTrainees: 6 },
    { name: "Medan", completionRate: 78, activeTrainees: 5 },
    { name: "Makassar", completionRate: 88, activeTrainees: 4 },
  ];

  const brandDistributionData = [
    { name: "Xiaomi", value: 45, color: "#2563eb" },
    { name: "Huawei", value: 25, color: "#7c3aed" },
    { name: "Ecovacs", value: 12, color: "#059669" },
    { name: "Tineco", value: 10, color: "#d97706" },
    { name: "Laifen / Yoniev", value: 8, color: "#e11d48" },
  ];

  const handleExportCSV = () => {
    const headers = "NIK,Nama,Cabang,Brand,Program,Course Progress,Exam Progress,Overall Progress,Rata-rata Skor,Status\n";
    const rows = staffProgressData
      .map(
        (s) =>
          `"${s.nik}","${s.name}","${s.branch}","${s.brand}","${s.program}","${s.courseProgress}","${s.examProgress}","${s.overall}","${s.score}","${s.status}"`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `unicom_training_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell pageTitle="Monitoring & Reports">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Laporan & Monitoring Analytics
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Dashboard analitik performa kelulusan, perbandingan antar cabang, dan data peserta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV / Excel
            </Button>
          </div>
        </div>

        {/* Analytic Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branch Completion Bar Chart (2 cols) */}
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Tingkat Kelulusan Per Cabang (%)
                </h3>
                <p className="text-xs text-slate-500">Persentase penyelesaian program training per service center</p>
              </div>
              <Badge variant="default" size="sm">5 Cabang Aktif</Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="completionRate" name="Tingkat Kelulusan (%)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Brand Distribution Pie Chart (1 col) */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Distribusi Brand
                </h3>
                <p className="text-xs text-slate-500">Proporsi peserta training</p>
              </div>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {brandDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs">
              {brandDistributionData.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{b.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Trainee Progress Data Table */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Rekapitulasi Progres Peserta Training
              </h3>
              <p className="text-xs text-slate-500">Perhitungan Course 60% + Exam 40% Server Authoritative</p>
            </div>
            <span className="text-xs text-slate-500">Total: {staffProgressData.length} Karyawan</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama Peserta</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-center">Course %</TableHead>
                <TableHead className="text-center">Exam %</TableHead>
                <TableHead className="text-center">Overall %</TableHead>
                <TableHead className="text-center">Rata-rata Skor</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffProgressData.map((row) => (
                <TableRow key={row.nik}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {row.nik}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs">
                    {row.branch}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs font-medium">
                    {row.brand}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs">
                    {row.program}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-xs text-slate-700">
                    {row.courseProgress}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-xs text-slate-700">
                    {row.examProgress}
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs text-blue-600">
                    {row.overall}
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs text-slate-800">
                    {row.score}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "COMPLETED" ? (
                      <Badge variant="success" size="sm">Completed</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">In Progress</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
