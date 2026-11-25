import { describe, expect, it } from "vitest";
import { restorable, toCopy } from "./restore";

const answer = {
  id: "8f9c2a52-3c1e-4b7a-9d1f-2b6f5a4e7c10",
  questionId: "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b",
  providerId: "00000000-0000-0000-0000-000000000001",
  body: "Give plenty of water.",
  helpfulCount: 3,
  createdAt: new Date("2026-11-20T10:00:00Z"),
};

describe("hidden content copies", () => {
  it("turns dates into ISO strings for the audit log", () => {
    expect(toCopy(answer)).toEqual({ ...answer, createdAt: "2026-11-20T10:00:00.000Z" });
  });

  it("reads back a hidden answer from a report.hide entry", () => {
    const meta = { entity: "answer", entityId: answer.id, copy: toCopy(answer) };
    const hidden = restorable("report.hide", JSON.parse(JSON.stringify(meta)));
    expect(hidden?.entity).toBe("answer");
    if (hidden?.entity !== "answer") throw new Error("expected an answer");
    expect(hidden.copy.createdAt).toEqual(answer.createdAt);
    expect(hidden.copy.providerId).toBe(answer.providerId);
  });

  it("reads back a hidden review (nullable links) and a hidden question", () => {
    const review = {
      id: answer.id,
      consultId: null,
      appointmentId: null,
      ownerId: answer.questionId,
      providerId: answer.providerId,
      rating: 1,
      body: null,
      isDemo: false,
      createdAt: "2026-11-20T10:00:00.000Z",
    };
    expect(restorable("report.hide", { entity: "review", entityId: review.id, copy: review })?.entity).toBe(
      "review",
    );
    expect(
      restorable("report.hide", {
        entity: "question",
        entityId: answer.questionId,
        copy: { id: answer.questionId, status: "answered" },
      })?.entity,
    ).toBe("question");
  });

  it("refuses other actions, old entries without a copy and broken copies", () => {
    const meta = { entity: "answer", entityId: answer.id, copy: toCopy(answer) };
    expect(restorable("report.dismiss", meta)).toBeNull();
    expect(restorable("report.hide", { entity: "answer", entityId: answer.id })).toBeNull();
    expect(restorable("report.hide", { ...meta, copy: { ...toCopy(answer), id: "nope" } })).toBeNull();
    expect(
      restorable("report.hide", {
        entity: "question",
        entityId: answer.id,
        copy: { id: answer.id, status: "hidden" },
      }),
    ).toBeNull();
    expect(restorable("report.hide", null)).toBeNull();
  });
});
