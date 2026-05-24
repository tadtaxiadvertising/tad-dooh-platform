import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/admin/campaigns',
    permanent: false,
  },
});

export default function CampaignsLegacyIndexRedirect() {
  return null;
}
