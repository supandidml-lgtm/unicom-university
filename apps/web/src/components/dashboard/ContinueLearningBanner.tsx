import React from "react";
import { Button, ProgressBar, Badge } from "@unicom/ui";
import { PlayCircle, Clock, BookOpen } from "lucide-react";

export interface ContinueLearningBannerProps {
  programTitle?: string;
  brandName?: string;
  currentWeek?: number;
  totalWeeks?: number;
  nextCourseTitle?: string;
  overallProgress?: number;
  courseProgress?: number;
  examProgress?: number;
  deadlineText?: string;
  onContinue?: () => void;
}

export const ContinueLearningBanner: React.FC<ContinueLearningBannerProps> = ({
  programTitle = "Xiaomi Technician Training",
  brandName = "Xiaomi",
  currentWeek = 3,
  totalWeeks = 4,
  nextCourseTitle = "SOP Layanan & Troubleshooting Motherboard V2",
  overallProgress = 68,
  courseProgress = 75,
  examProgress = 55,
  deadlineText = "7 hari lagi (28 Agustus 2026)",
  onContinue,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[8px] p-5 lg:p-6 shadow-sm flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
      <div className="space-y-3 max-w-2xl flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{brandName}</Badge>
          <Badge variant="neutral">
            Minggu {currentWeek} dari {totalWeeks}
          </Badge>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Batas waktu: {deadlineText}
          </span>
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
            {programTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Materi Berikutnya: <strong className="font-medium text-slate-800">{nextCourseTitle}</strong></span>
          </p>
        </div>

        {/* Multi-metric Progress Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <ProgressBar
            value={overallProgress}
            label="Overall Progress"
            variant="primary"
            size="sm"
          />
          <ProgressBar
            value={courseProgress}
            label="Course Progress"
            variant="success"
            size="sm"
          />
          <ProgressBar
            value={examProgress}
            label="Exam Progress"
            variant="warning"
            size="sm"
          />
        </div>
      </div>

      <div className="shrink-0 w-full lg:w-auto">
        <Button
          size="lg"
          variant="primary"
          onClick={onContinue}
          leftIcon={<PlayCircle className="w-5 h-5" />}
          className="w-full lg:w-auto shadow"
        >
          Lanjutkan Belajar
        </Button>
      </div>
    </div>
  );
};
