import { describe, it, expect } from "vitest";
import { expandedBedIds, toggleBedCollapse } from "@/lib/bedView";

const beds = ["a", "b", "c"];

describe("bedView", () => {
  describe("all mode", () => {
    it("opens every bed by default, at any bed count", () => {
      expect(expandedBedIds("all", [], beds)).toEqual(new Set(beds));
      expect(expandedBedIds("all", [], ["a", "b"])).toEqual(new Set(["a", "b"]));
      expect(expandedBedIds("all", [], Array.from({ length: 12 }, (_, i) => `b${i}`)).size).toBe(12);
    });

    it("collapses only the clicked bed — the old two-bed bug", () => {
      const twoBeds = ["a", "b"];
      const afterClick = toggleBedCollapse("all", [], twoBeds, "a");
      const open = expandedBedIds("all", afterClick, twoBeds);
      expect(open.has("a")).toBe(false);
      expect(open.has("b")).toBe(true);
    });

    it("reopens a collapsed bed on a second click", () => {
      const collapsed = toggleBedCollapse("all", [], beds, "b");
      expect(toggleBedCollapse("all", collapsed, beds, "b")).toEqual([]);
    });

    it("opens a newly added bed", () => {
      const collapsed = toggleBedCollapse("all", [], beds, "a");
      expect(expandedBedIds("all", collapsed, [...beds, "d"]).has("d")).toBe(true);
    });
  });

  describe("one mode", () => {
    it("falls back on the first bed when nothing is collapsed", () => {
      expect(expandedBedIds("one", [], beds)).toEqual(new Set(["a"]));
    });

    it("closes the others when a bed is opened", () => {
      const collapsed = toggleBedCollapse("one", [], beds, "c");
      expect(expandedBedIds("one", collapsed, beds)).toEqual(new Set(["c"]));
    });

    it("closes the open bed on a second click, leaving none open", () => {
      const opened = toggleBedCollapse("one", [], beds, "c");
      const closed = toggleBedCollapse("one", opened, beds, "c");
      expect(expandedBedIds("one", closed, beds).size).toBe(0);
    });

    it("keeps a newly added bed shut while another is open", () => {
      const collapsed = toggleBedCollapse("one", [], beds, "b");
      expect(expandedBedIds("one", collapsed, [...beds, "d"])).toEqual(new Set(["b"]));
    });
  });
});
