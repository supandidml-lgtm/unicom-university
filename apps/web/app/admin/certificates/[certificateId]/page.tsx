import { CertificateDetail } from '../../../../components/certificate-detail';
export default async function AdminCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  return <CertificateDetail certificateId={certificateId} allowRevoke />;
}
