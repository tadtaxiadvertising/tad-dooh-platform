import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/admin/campaigns/new',
    permanent: false,
  },
});

export default function CampaignsLegacyNewRedirect() {
  return null;
}
