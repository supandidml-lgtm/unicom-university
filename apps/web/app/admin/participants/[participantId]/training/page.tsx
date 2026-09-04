import { TrainingAssignment } from '../../../../../components/training-assignment';

export default async function AdminTrainingAssignmentPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  return <TrainingAssignment participantId={participantId} audience="admin" />;
}
