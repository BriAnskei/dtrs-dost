/**
 * Shared test harness for routing-guard tests.
 *
 * Provides:
 *  - `LocationDisplay`: a spy component that renders the current router
 *    `pathname` behind `data-testid="location"`.  Because <Navigate> does
 *    NOT throw or block render, we read the *final* URL after navigation to
 *    assert where the user landed.
 *
 *  - `renderWithRouter`: wraps the given <Route> tree in a <MemoryRouter> +
 *    <Routes> whose catch-all `*` route renders LocationDisplay, so any
 *    <Navigate to="/somewhere"> whose target has no explicit route will still
 *    surface its destination pathname.  Tests may add explicit <Route>
 *    children to assert richer "page rendered" behaviour.
 *
 * We deliberately keep `useUser` mocks inside each test file (vi.mock is
 * file-scoped and hoisted), so this utility stays dependency-free.
 */

import { type ReactNode } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { render, type RenderResult } from "@testing-library/react";

export function LocationDisplay() {
  const { pathname } = useLocation();
  return <span data-testid="location">{pathname}</span>;
}

interface RenderRouterOptions {
  initialEntries?: string[];
}

/**
 * Render a <Routes> body inside an isolated <MemoryRouter>.
 *
 * Pass the routes as children of <Routes> via `children`.  A catch-all `*`
 * route (LocationDisplay) is appended last so unmatched Navigate targets are
 * still observable.
 *
 * @example
 * renderRoutes([<Route path="/signin" element={<Signin/>} />], ["/dashboard"]);
 */
export function renderRoutes(
  children: ReactNode,
  { initialEntries = ["/"] }: RenderRouterOptions = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        {children}
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

export { render };
