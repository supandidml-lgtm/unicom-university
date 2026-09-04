import { TrainingAssignment } from '../../../../../components/training-assignment';

export default async function TrainerTrainingAssignmentPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;
  return <TrainingAssignment participantId={participantId} audience="trainer" />;
}
