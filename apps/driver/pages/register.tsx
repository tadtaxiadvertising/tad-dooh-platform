import Head from "next/head";
import { DriverRegistrationWizard } from "../components/register/DriverRegistrationWizard";

export default function DriverRegisterPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Head>
        <title>Registro | TAD DRIVER</title>
      </Head>
      <DriverRegistrationWizard />
    </div>
  );
}
