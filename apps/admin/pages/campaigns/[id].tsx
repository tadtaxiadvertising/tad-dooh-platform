import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = String(params?.id ?? '');

  return {
    redirect: {
      destination: `/admin/campaigns/${encodeURIComponent(id)}`,
      permanent: false,
    },
  };
};

export default function CampaignsLegacyDetailRedirect() {
  return null;
}
