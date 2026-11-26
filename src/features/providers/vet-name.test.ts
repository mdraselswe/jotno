import { describe, expect, it } from "vitest";
import { withDoctorTitle } from "./vet-name";

describe("withDoctorTitle", () => {
  it("adds Dr. to a plain name", () => {
    expect(withDoctorTitle("Nadia Rahman")).toBe("Dr. Nadia Rahman");
    expect(withDoctorTitle("  Nadia   Rahman ")).toBe("Dr. Nadia Rahman");
    expect(withDoctorTitle("নাদিয়া রহমান")).toBe("Dr. নাদিয়া রহমান");
  });

  it("keeps a name that already has the title", () => {
    expect(withDoctorTitle("Dr. Nadia")).toBe("Dr. Nadia");
    expect(withDoctorTitle("Dr Nadia")).toBe("Dr Nadia");
    expect(withDoctorTitle("dr.nadia")).toBe("dr.nadia");
    expect(withDoctorTitle("ডা. নাদিয়া")).toBe("ডা. নাদিয়া");
    expect(withDoctorTitle("ডাঃ নাদিয়া")).toBe("ডাঃ নাদিয়া");
    expect(withDoctorTitle("QA: Dr. Test Vet")).toBe("QA: Dr. Test Vet");
  });

  it("does not mistake a name starting with Dr… for the title", () => {
    expect(withDoctorTitle("Drishti Sen")).toBe("Dr. Drishti Sen");
  });

  it("leaves an empty name empty", () => {
    expect(withDoctorTitle("   ")).toBe("");
  });
});
