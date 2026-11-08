import { matchesAuthenticatedDevice } from "./device-request-scope";

describe("matchesAuthenticatedDevice", () => {
  it("permits a request for exactly the authenticated device", () => {
    expect(
      matchesAuthenticatedDevice("TAD-A", ["TAD-A", undefined, null, "TAD-A"]),
    ).toBe(true);
  });

  it.each([
    [["TAD-B"], "different device body"],
    [["TAD-A", "TAD-B"], "conflicting header and query"],
    [[["TAD-A"]], "array value"],
    [[{ value: "TAD-A" }], "object value"],
    [[""], "empty device"],
  ])("rejects %s (%s)", (values) => {
    expect(matchesAuthenticatedDevice("TAD-A", values)).toBe(false);
  });
});
