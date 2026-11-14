// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const actions = vi.hoisted(() => ({
  signIn: vi.fn(async () => ({
    error: "That email and password don't match an account.",
  })),
  signUp: vi.fn(async () => ({
    message: "Check your email for a link to confirm your account.",
  })),
  signInWithGoogle: vi.fn(async () => ({})),
}));
vi.mock("@/app/login/actions", () => actions);
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { LoginForm } from "./login-form";

async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByLabelText("Email"), "pm@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.click(screen.getByRole("button", { name: button }));
}

describe("LoginForm", () => {
  it("offers Google and email sign in", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Sign in", selected: true })).toBeDefined();
  });

  it("signs in with email and shows the error", async () => {
    render(<LoginForm />);
    await fillAndSubmit("Sign in");

    expect((await screen.findByRole("alert")).textContent).toContain("don't match");
    expect(actions.signIn).toHaveBeenCalled();
    expect(actions.signUp).not.toHaveBeenCalled();
  });

  it("creates an account and asks to confirm the email", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));
    await fillAndSubmit("Create account");

    expect((await screen.findByRole("status")).textContent).toContain("Check your email");
    const formData = (actions.signUp.mock.calls[0] as unknown[])[1] as FormData;
    expect(formData.get("email")).toBe("pm@example.com");
  });

  it("starts Google sign in", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(actions.signInWithGoogle).toHaveBeenCalled();
  });
});
