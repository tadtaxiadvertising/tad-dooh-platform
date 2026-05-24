import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.id ?? '');

  return {
    redirect: {
      destination: `/admin/campaigns/${encodeURIComponent(id)}/report`,
      permanent: false,
    },
  };
};

export default function CampaignsLegacyReportRedirect() {
  return null;
}
