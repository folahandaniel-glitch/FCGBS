import { describe, expect, it } from "vitest";
import { DEFAULT_GRADING_SCALE, courseTotal, gpa, gradeFor, graduationEligibility, standingFor, validateGradingScale } from "@/core/grading";

describe("grading", () => {
  it("default scale is valid and maps boundaries", () => {
    expect(validateGradingScale(DEFAULT_GRADING_SCALE)).toBeNull();
    expect(gradeFor(90).grade).toBe("A+");
    expect(gradeFor(89.4).grade).toBe("A");
    expect(gradeFor(44).grade).toBe("F");
    expect(gradeFor(45).point).toBe(1.0);
  });
  it("rejects gaps", () => {
    expect(validateGradingScale([{ min: 0, max: 40, grade: "F", point: 0 }, { min: 50, max: 100, grade: "P", point: 3 }])).toMatch(/contiguous/);
  });
  it("weights components, missing counts as zero", () => {
    expect(courseTotal({ assignment: 80, test: 70, exam: 60, practical: null }, { assignment: 20, test: 20, exam: 60, practical: 0 })).toBe(66);
    expect(courseTotal({ assignment: null, test: null, exam: 100, practical: null }, { assignment: 20, test: 20, exam: 60, practical: 0 })).toBe(60);
  });
  it("computes GPA and standing", () => {
    const r = gpa([{ credits: 3, point: 4, graded: true }, { credits: 2, point: 2, graded: true }, { credits: 2, point: 0, graded: false }]);
    expect(r.gpa).toBe(3.2);
    const rules = { warningBelow: 2, probationBelow: 1.5, suspensionBelow: 1, minCreditsForJudgement: 12 };
    expect(standingFor(0.5, 6, rules)).toBe("GOOD_STANDING");
    expect(standingFor(1.2, 20, rules)).toBe("ACADEMIC_PROBATION");
  });
  it("blocks graduation when requirements are missing", () => {
    const e = graduationEligibility({ requiredCourseIds: ["a", "b"], passedCourseIds: ["a"], creditsEarned: 10, minCredits: 16, cgpa: 2.5, minCgpa: 1.5, outstandingAssessments: 0, practicumHoursVerified: 0, practicumHoursRequired: 0, researchRequired: false, researchApproved: false, outstandingFees: 0, openDisciplinaryCases: 0 });
    expect(e.eligible).toBe(false);
    expect(e.checks.filter((c) => !c.ok).map((c) => c.key)).toEqual(["courses", "credits"]);
  });
});
