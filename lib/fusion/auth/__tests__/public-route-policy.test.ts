import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_CONTINUE_PATH,
  AUTH_SIGN_IN_PATH,
  AUTH_SIGN_UP_PATH,
  PUBLIC_ROUTE_PATTERNS,
} from "@/lib/auth-route-policy";

test("auth destinations are root-absolute and cannot inherit a nested public path", () => {
  assert.equal(AUTH_SIGN_IN_PATH, "/sign-in");
  assert.equal(AUTH_SIGN_UP_PATH, "/sign-up");
  assert.equal(AUTH_CONTINUE_PATH, "/auth/continue");
  for (const path of [AUTH_SIGN_IN_PATH, AUTH_SIGN_UP_PATH, AUTH_CONTINUE_PATH]) {
    assert.equal(new URL(path, "https://studio.tapthemagic.com/everencore/love-and-theft").pathname, path);
  }
});

test("public policy admits generic Experiences and auth support without exposing Studio", () => {
  assert.ok(PUBLIC_ROUTE_PATTERNS.includes("/everencore/(.*)"));
  assert.ok(PUBLIC_ROUTE_PATTERNS.includes("/x/(.*)"));
  assert.ok(PUBLIC_ROUTE_PATTERNS.includes("/auth/(.*)"));
  assert.ok(PUBLIC_ROUTE_PATTERNS.includes("/__clerk/(.*)"));
  assert.equal(PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/review")), false);
  assert.equal(PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/dashboard")), false);
  assert.equal(PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/admin")), false);
  assert.equal(PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/api/experiences")), false);
  assert.equal(PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/dashboard/experiences")), false);
});
