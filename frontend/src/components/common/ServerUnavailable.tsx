import Button from "../ui/button/Button";
import { useUser } from "../../context/currentUser/use-user";

/**
 * Recovery screen shown by ProtectedRoute when the current-user fetch failed
 * with a transport-level error (server down, offline, DNS, timeout, empty
 * response).
 *
 * This deliberately differs from the 401 path: a 401 means "you're signed out"
 * and ProtectedRoute still bounces to /signin. A network error means "I can't
 * talk to the server right now" — so we keep the user in place with a Retry
 * that re-runs the current-user fetch from the provider, instead of sending
 * them to a sign-in form that will also fail to connect.
 */
export default function ServerUnavailable() {
  const { refetch } = useUser();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
          Could not reach the server
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          The server is unreachable. Check your connection and try again.
        </p>
        <Button variant="primary" onClick={refetch}>
          Retry
        </Button>
      </div>
    </div>
  );
}
