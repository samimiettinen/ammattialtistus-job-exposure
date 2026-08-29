import { describe, expect, it } from "vitest";
import { filterOccupations } from "../src/lib/pipeline/filters";
import { occupationQuerySchema } from "../src/lib/schemas";
import type { Occupation } from "../src/lib/schemas";

describe("API query schema", () => {
  it("coerces filter params the route accepts", () => {
    const query = occupationQuerySchema.parse({
      q: "2512",
      group: "2",
      minEmployment: "1000",
      scoreStatus: "scored",
      level: "4",
    });
    expect(query.minEmployment).toBe(1000);
    expect(query.level).toBe(4);
    expect(filterOccupations([] as Occupation[], query)).toEqual([]);
  });

  it("rejects invalid scoreStatus", () => {
    expect(() => occupationQuerySchema.parse({ scoreStatus: "invented" })).toThrow();
  });
});
