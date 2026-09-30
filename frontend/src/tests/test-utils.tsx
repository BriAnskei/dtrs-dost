/**
 * Shared test harness for routing-guard and provider tests.
 *
 * Provides:
 *  - `LocationDisplay`: a spy component that renders the current router
 *    `pathname` behind `data-testid="location"`.  Because <Navigate> does
 *    NOT throw or block render, we read the *final* URL after navigation to
 *    assert where the user landed.
 *
 *  - `renderRoutes`: wraps the given <Route> tree in a
 *    <QueryClientProvider> + <MemoryRouter> + <Routes> whose catch-all `*`
 *    route renders LocationDisplay, so any <Navigate to="/somewhere"> whose
 *    target has no explicit route will still surface its destination pathname.
 *    Tests may add explicit <Route> children to assert richer "page rendered"
 *    behaviour.
 *
 *  - `createTestQueryClient`: builds an isolated QueryClient with no
 *    retries / garbage collection so tests are deterministic.
 *
 * We deliberately keep `useUser` mocks inside each test file (vi.mock is
 * file-scoped and hoisted), so this utility stays dependency-free.
 */

import { type ReactNode } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { render, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Builds a QueryClient configured for tests: no retries, no garbage
 * collection.  Each call returns a fresh client so tests stay isolated.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function LocationDisplay() {
  const { pathname } = useLocation();
  return <span data-testid="location">{pathname}</span>;
}

type RenderRouterOptions = { initialEntries?: string[] };

/**
 * Render a <Routes> body inside isolated <QueryClientProvider> + <MemoryRouter>
 * wrappers.
 *
 * Pass the routes as children of <Routes> via `children`.  A catch-all `*`
 * route (LocationDisplay) is appended last so unmatched Navigate targets are
 * still observable.
 *
 * `initialEntries` may be passed as a plain array (shorthand) or as an options
 * object — the helper normalises both:
 *
 * @example
 * renderRoutes(<Route path="/signin" element={<Signin/>} />, ["/dashboard"])
 * renderRoutes(<Route path="/signin" element={<Signin/>} />, { initialEntries: ["/dashboard"] })
 */
export function renderRoutes(
  children: ReactNode,
  initialEntries: string[] | RenderRouterOptions = ["/"],
): RenderResult {
  const entries = Array.isArray(initialEntries)
    ? initialEntries
    : initialEntries.initialEntries ?? ["/"];
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>
        <Routes>
          {children}
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export { render };
