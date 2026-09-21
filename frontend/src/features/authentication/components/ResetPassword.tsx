import { useParams } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();

  return (
    <>
      <PageMeta
        title="Reset Password | TailAdmin - Next.js Admin Dashboard Template"
        description="Set a new password for your account."
      />
      <AuthLayout forceLightLogo={true}>
        <ResetPasswordForm token={token} />
      </AuthLayout>
    </>
  );
}
