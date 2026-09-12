import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { UserProvider } from "./context/UserContext.tsx";
import { queryClient } from "./lib/query-client.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <AppWrapper>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </AppWrapper>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
);
