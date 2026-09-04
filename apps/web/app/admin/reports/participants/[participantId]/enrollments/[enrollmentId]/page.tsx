import { ReportingEnrollmentDetail } from '../../../../../../../components/reporting-enrollment-detail';

export default async function AdminReportingEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ participantId: string; enrollmentId: string }>;
}) {
  const { participantId, enrollmentId } = await params;
  return <ReportingEnrollmentDetail participantId={participantId} enrollmentId={enrollmentId} />;
}
