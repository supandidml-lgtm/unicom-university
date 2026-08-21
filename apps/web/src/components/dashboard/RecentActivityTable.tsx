import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@unicom/ui";
import { CheckCircle2, Video, FileText, Award } from "lucide-react";

export interface ActivityItem {
  id: string;
  title: string;
  type: "VIDEO" | "PDF" | "EXAM" | "COURSE";
  program: string;
  timestamp: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PASSED" | "FAILED";
  score?: number;
}

export interface RecentActivityTableProps {
  activities?: ActivityItem[];
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
  activities = [
    {
      id: "act-1",
      title: "Video SOP Penggantian Layar AMOLED",
      type: "VIDEO",
      program: "Xiaomi Technician Training",
      timestamp: "10 menit yang lalu",
      status: "COMPLETED",
    },
    {
      id: "act-2",
      title: "Exam Week 2: Troubleshooting Board",
      type: "EXAM",
      program: "Xiaomi Technician Training",
      timestamp: "Kemarin, 14:20",
      status: "PASSED",
      score: 92,
    },
    {
      id: "act-3",
      title: "Dokumen Panduan Garansi & RMA 2026",
      type: "PDF",
      program: "Xiaomi Technician Training",
      timestamp: "20 Ags 2026",
      status: "COMPLETED",
    },
    {
      id: "act-4",
      title: "Course Basic Multimeter & Oscillosope",
      type: "COURSE",
      program: "Xiaomi Technician Training",
      timestamp: "19 Ags 2026",
      status: "IN_PROGRESS",
    },
  ],
}) => {
  const renderIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "VIDEO":
        return <Video className="w-4 h-4 text-blue-600" />;
      case "PDF":
        return <FileText className="w-4 h-4 text-amber-600" />;
      case "EXAM":
        return <Award className="w-4 h-4 text-purple-600" />;
      case "COURSE":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
  };

  const renderBadge = (status: ActivityItem["status"], score?: number) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success" size="sm">Selesai</Badge>;
      case "PASSED":
        return <Badge variant="success" size="sm">Lulus ({score})</Badge>;
      case "FAILED":
        return <Badge variant="danger" size="sm">Tidak Lulus ({score})</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="warning" size="sm">Sedang Berjalan</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Aktivitas Pembelajaran Terakhir
        </h3>
        <span className="text-xs text-slate-500">Menampilkan 4 aktivitas</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aktivitas</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Waktu</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium text-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-[4px] bg-slate-100 shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <span className="truncate max-w-xs">{item.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-slate-600 text-xs">
                {item.program}
              </TableCell>
              <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                {item.timestamp}
              </TableCell>
              <TableCell className="text-right">
                {renderBadge(item.status, item.score)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
