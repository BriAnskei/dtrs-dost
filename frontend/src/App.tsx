import { RouterProvider } from "react-router";
import { NotificationsProvider } from "./context/NotificationsContext";
import { router } from "./routes";

export default function App() {
  return (
    <NotificationsProvider>
      <RouterProvider router={router} />
    </NotificationsProvider>
  );
}
