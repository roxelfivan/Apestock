import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeUserError } from "./errors.js";

test("sanitizeUserError hides Yahoo HTML timeout pages", () => {
  const html =
    '<!DOCTYPE html><html lang="en-us"><title>Yahoo</title><!-- 504 --><!-- Inactivity Timeout -->sad-panda query2.finance.yahoo.com/v1/finance/screener';
  assert.equal(
    sanitizeUserError(html),
    "Yahoo Finance is temporarily unavailable. Wait a minute and try again.",
  );
});

test("sanitizeUserError keeps short API messages", () => {
  assert.equal(sanitizeUserError("Missing ticker."), "Missing ticker.");
});

test("sanitizeUserError maps Yahoo quota pages to a fallback hint", () => {
  assert.match(sanitizeUserError("The quota has been exceeded."), /Yahoo's unofficial feed/);
});
