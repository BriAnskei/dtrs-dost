/**
 * Tests for `useLinkResetStep` — the sub-hook that generates, manages, and
 * discards reset links (QR codes) for the password-reset flow.
 *
 * WHY THIS HOOK MATTERS:
 *   After the admin picks "Generate a reset link", this hook calls
 *   `createResetRequest` to get a one-time token, constructs a URL from it,
 *   and supports "Copy to clipboard" + "Generate a new link" (after expiry).
 *   It also handles "abandoning" the link when the admin navigates away or
 *   closes the modal without using it — the token must be deleted so it can't
 *   be reused. `isAbandoningLink` drives the "Discarding link…" footer state.
 *
 * WHAT WE MOCK:
 *   - `passwordResetService` (../../services/password-reset.service) —
 *     `createResetRequest` and `deletePasswordResetToken`.
 *   - `getErrorMessage` (../../../../lib/api-error) — left REAL (pure).
 *   - `sonner` (toast) — assert copy/abort toasts.
 *   - `navigator.clipboard` — happy-dom doesn't implement the Clipboard API.
 *
 * react-query runs through a real QueryClient (retry=false).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { passwordResetService } from "../../services/password-reset.service";
import type { PasswordResetRequestResponse } from "../../types/password-reset.type";
import { useLinkResetStep } from "./use-link-reset-step";

const { mockCreateResetRequest, mockDeleteToken, mockToast } = vi.hoisted(() => ({
  mockCreateResetRequest: vi.fn(),
  mockDeleteToken: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../services/password-reset.service", () => ({
  passwordResetService: {
    createResetRequest: mockCreateResetRequest,
    deletePasswordResetToken: mockDeleteToken,
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";

const LINK_RESPONSE: PasswordResetRequestResponse = {
  id: "link-token-1",
  token: "reset-token-xyz",
  expires_at: "2025-12-31T23:59:59.000Z",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Stub navigator.clipboard so handleCopyLink doesn't crash in happy-dom. */
function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
  return writeText;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useLinkResetStep", () => {
  let originalOrigin: string;

  beforeAll(() => {
    originalOrigin = window.location.origin;
  });

  afterAll(() => {
    // Restore the original origin in case any test mutated location.
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: originalOrigin },
      writable: true,
    });
  });

  beforeEach(() => {
    mockCreateResetRequest.mockReset();
    mockDeleteToken.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("starts with null linkData, null URL, and isGeneratingLink=false", () => {
    /*
     * Before any link is generated, the hook should report no link data and
     * no generation in progress — the LinkResetStep component renders the
     * spinner placeholder (isGeneratingLink || !resetLinkUrl).
     */
    const client = makeClient();
    const { result } = renderHook(() => useLinkResetStep(USER_ID), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.linkData).toBeNull();
    expect(result.current.linkToken).toBeNull();
    expect(result.current.linkExpiresAt).toBeNull();
    expect(result.current.resetLinkUrl).toBeNull();
    expect(result.current.isGeneratingLink).toBe(false);
    expect(result.current.isAbandoningLink).toBe(false);

    client.clear();
  });

  it("generateLink clears stale data, calls createResetRequest, and sets linkData on success", async () => {
    /*
     * Full happy path for link generation:
     *   1. generateLink() calls createResetRequest(userId)
     *   2. isGeneratingLink flips to true
     *   3. On success: linkData is set, resetLinkUrl and linkToken are derived
     */
    mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

    const client = makeClient();
    const { result } = renderHook(() => useLinkResetStep(USER_ID), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.generateLink();
    });

    expect(mockCreateResetRequest).toHaveBeenCalledWith(USER_ID);

    // After resolution, linkData and derived fields are populated.
    expect(result.current.linkData).toEqual(LINK_RESPONSE);
    expect(result.current.linkToken).toBe("reset-token-xyz");
    expect(result.current.isGeneratingLink).toBe(false);
  });

  it("isGeneratingLink is true during link creation", async () => {
    /*
     * While createResetRequest is in flight, isGeneratingLink=true so the
     * LinkResetStep component shows the "Generating reset link…" spinner
     * instead of the QR code.
     */
    let resolveCreate!: (value: typeof LINK_RESPONSE) => void;
    const pending = new Promise<typeof LINK_RESPONSE>((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateResetRequest.mockReturnValueOnce(pending);

    const client = makeClient();
    const { result } = renderHook(() => useLinkResetStep(USER_ID), {
      wrapper: makeWrapper(client),
    });

    act(() => {
      result.current.generateLink();
    });

    // Flush React Query v5's setTimeout(0) notification so the
    // useSyncExternalStore re-render propagates isPending=true.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isGeneratingLink).toBe(true);

    await act(async () => {
      resolveCreate(LINK_RESPONSE);
    });

    expect(result.current.isGeneratingLink).toBe(false);
    expect(result.current.linkData).toEqual(LINK_RESPONSE);

    client.clear();
  });

  it("constructs resetLinkUrl from window.location.origin + token", async () => {
    /*
     * The reset link URL must be:
     *   `${window.location.origin}/reset-password/${linkData.token}`
     * This is the URL that gets QR-encoded and copied to the clipboard.
     */
    mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

    const client = makeClient();
    const { result } = renderHook(() => useLinkResetStep(USER_ID), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.generateLink();
    });

    expect(result.current.resetLinkUrl).toBe(
      `${window.location.origin}/reset-password/reset-token-xyz`,
    );

    client.clear();
  });

  it("parses linkExpiresAt as a Date from expires_at", async () => {
    mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

    const client = makeClient();
    const { result } = renderHook(() => useLinkResetStep(USER_ID), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      result.current.generateLink();
    });

    expect(result.current.linkExpiresAt).toBeInstanceOf(Date);
    expect(result.current.linkExpiresAt?.getTime()).toBe(
      new Date("2025-12-31T23:59:59.000Z").getTime(),
    );

    client.clear();
  });

  describe("abandon", () => {
    it("does nothing when there is no linkData to abandon", async () => {
      /*
       * If the admin closes the modal before generating a link, abandon()
       * is a no-op — no API call, no error.
       */
      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.abandon();
      });

      expect(mockDeleteToken).not.toHaveBeenCalled();
      expect(result.current.linkData).toBeNull();
      expect(result.current.isAbandoningLink).toBe(false);

      client.clear();
    });

    it("deletes the token and clears linkData on success", async () => {
      /*
       * When a link was generated, abandoning deletes the token so it can't
       * be reused, then clears linkData so the component shows the spinner
       * placeholder again.
       */
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });
      expect(result.current.linkData).toEqual(LINK_RESPONSE);

      // Now abandon.
      mockDeleteToken.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.abandon();
      });

      expect(mockDeleteToken).toHaveBeenCalledWith(LINK_RESPONSE.id);
      expect(result.current.linkData).toBeNull();
      expect(result.current.resetLinkUrl).toBeNull();

      client.clear();
    });

    it("isAbandoningLink is true during deletion, false after", async () => {
      /*
       * The ResetPasswordModal footer shows "Discarding link…" while
       * isAbandoningLink is true, and blocks close (handleClose checks it).
       */
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });

      let resolveDelete!: () => void;
      mockDeleteToken.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
      );

      // Start abandon but don't resolve yet.
      void act(() => {
        result.current.abandon();
      });
      await new Promise((r) => setTimeout(r, 0));

      expect(result.current.isAbandoningLink).toBe(true);
      expect(result.current.linkData).toEqual(LINK_RESPONSE); // still set during deletion

      await act(async () => {
        resolveDelete();
        await waitFor(() => expect(result.current.isAbandoningLink).toBe(false));
      });

      expect(result.current.linkData).toBeNull();

      client.clear();
    });

    it("clears linkData even if the delete mutation fails (finally block)", async () => {
      /*
       * The finally block ensures linkData is cleared regardless of success
       * or failure — the admin shouldn't be stuck looking at a stale link
       * that couldn't be deleted server-side. A toast.error informs them.
       */
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });

      mockDeleteToken.mockRejectedValueOnce(new Error("Could not discard"));

      await act(async () => {
        await result.current.abandon();
      });

      expect(mockToast.error).toHaveBeenCalledWith("Could not discard the reset link.");
      // linkData is still cleared (finally block).
      expect(result.current.linkData).toBeNull();
      expect(result.current.isAbandoningLink).toBe(false);

      client.clear();
    });
  });

  describe("handleCopyLink", () => {
    it("copies resetLinkUrl to clipboard and toasts success", async () => {
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);
      const writeText = setupClipboard();

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });

      await act(async () => {
        await result.current.handleCopyLink();
      });

      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/reset-password/reset-token-xyz`,
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        "Reset link copied to clipboard.",
      );

      client.clear();
    });

    it("does nothing and shows no toast when there is no resetLinkUrl", async () => {
      /*
       * If linkData is null there's nothing to copy — the function should
       * short-circuit silently.
       */
      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        await result.current.handleCopyLink();
      });

      // No clipboard call.
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();

      client.clear();
    });

    it("toasts an error when clipboard.writeText rejects", async () => {
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);
      setupClipboard();
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Clipboard denied"),
      );

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });

      await act(async () => {
        await result.current.handleCopyLink();
      });

      expect(mockToast.error).toHaveBeenCalledWith("Couldn't copy link.");

      client.clear();
    });
  });

  describe("generateLink error", () => {
    it("toasts an error when createResetRequest rejects", async () => {
      /*
       * If the backend fails to create a reset link, the hook shows a toast
       * and linkData stays null so the spinner keeps showing.
       */
      mockCreateResetRequest.mockRejectedValueOnce(new Error("Rate limited"));

      const client = makeClient();
      const { result } = renderHook(() => useLinkResetStep(USER_ID), {
        wrapper: makeWrapper(client),
      });

      await act(async () => {
        result.current.generateLink();
      });

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
      expect(mockToast.error).toHaveBeenCalledWith("Could not generate a reset link.");
      expect(result.current.linkData).toBeNull();
      expect(result.current.isGeneratingLink).toBe(false);

      client.clear();
    });
  });
});
