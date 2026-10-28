/**
 * Unit tests for `BackToQueueLink` — the "Back to queue" link on the review screen.
 *
 * THE COMPONENT (review/components/BackToQueueLink.tsx):
 *
 *   Renders a <Link> with to="/extracted-queues" that navigates back to the
 *   queue list page. The link text is "Back to queue" with an ArrowLeft icon.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemoryRouter } from "react-router";
import BackToQueueLink from "../review/components/BackToQueueLink";

describe("BackToQueueLink", () => {
  it("renders a link with text 'Back to queue'", () => {
    render(
      <MemoryRouter>
        <BackToQueueLink />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Back to queue/ })).toBeInTheDocument();
  });

  it("navigates to /extracted-queues when clicked", () => {
    render(
      <MemoryRouter initialEntries={["/extracted-queues/q-1"]}>
        <BackToQueueLink />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Back to queue/ });
    expect(link).toHaveAttribute("href", "/extracted-queues");
  });
});
