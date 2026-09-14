import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import AppToaster from "./components/common/AppToaster.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { UserProvider } from "./context/currentUser/user-provider.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { queryClient } from "./lib/query-client.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppToaster />
        <UserProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
