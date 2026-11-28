import { matchesAuthenticatedDevice } from "./device-request-scope";

describe("matchesAuthenticatedDevice", () => {
  it("permits a request for exactly the authenticated device", () => {
    expect(
      matchesAuthenticatedDevice("TAD-A", ["TAD-A", undefined, "TAD-A"]),
    ).toBe(true);
  });

  const crossDeviceCases: Array<[readonly unknown[], string]> = [
    [["TAD-B"], "different device body"],
    [["TAD-A", "TAD-B"], "conflicting header and query"],
    [[["TAD-A"]], "array value"],
    [[{ value: "TAD-A" }], "object value"],
    [[""], "empty device"],
    [[null], "null explicit device"],
  ];

  it.each(crossDeviceCases)("rejects %s (%s)", (values, description) => {
    expect(matchesAuthenticatedDevice("TAD-A", values)).toBe(false);
  });
});
