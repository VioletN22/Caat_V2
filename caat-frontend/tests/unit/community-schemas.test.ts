import { describe, it, expect } from "vitest";
import { PostInputSchema, CommentInputSchema, GroupInputSchema } from "@/lib/schemas/community";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("PostInputSchema", () => {
  it("accepts a minimal valid post", () => {
    expect(PostInputSchema.safeParse({ content: "hello", topic_tag: "ADVICE" }).success).toBe(true);
  });
  it("rejects an unknown topic tag", () => {
    expect(PostInputSchema.safeParse({ content: "x", topic_tag: "NOPE" }).success).toBe(false);
  });
  it("rejects content beyond the cap", () => {
    expect(PostInputSchema.safeParse({ content: "a".repeat(20001), topic_tag: "ADVICE" }).success).toBe(false);
  });
  it("validates poll option counts (2..10)", () => {
    const poll = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i), text: `o${i}` }));
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "ADVICE", poll_options: poll(1) }).success).toBe(false);
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "ADVICE", poll_options: poll(2) }).success).toBe(true);
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "ADVICE", poll_options: poll(11) }).success).toBe(false);
  });
  it("validates result/score card shapes", () => {
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "APPLICATION_RESULTS", result_card: { outcome: "accepted", university_name: "MIT" } }).success).toBe(true);
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "APPLICATION_RESULTS", result_card: { outcome: "maybe", university_name: "MIT" } }).success).toBe(false);
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "TEST_SCORES", score_card: { exam: "SAT", score: "1500" } }).success).toBe(true);
    expect(PostInputSchema.safeParse({ content: "", topic_tag: "TEST_SCORES", score_card: { exam: "XYZ", score: "1" } }).success).toBe(false);
  });
});

describe("CommentInputSchema", () => {
  it("accepts a valid comment", () => {
    expect(CommentInputSchema.safeParse({ postId: UUID, content: "nice" }).success).toBe(true);
  });
  it("rejects a non-uuid postId", () => {
    expect(CommentInputSchema.safeParse({ postId: "123", content: "nice" }).success).toBe(false);
  });
  it("rejects empty or oversized content", () => {
    expect(CommentInputSchema.safeParse({ postId: UUID, content: "" }).success).toBe(false);
    expect(CommentInputSchema.safeParse({ postId: UUID, content: "a".repeat(1001) }).success).toBe(false);
  });
  it("accepts an optional parent comment id", () => {
    expect(CommentInputSchema.safeParse({ postId: UUID, content: "reply", parentCommentId: UUID }).success).toBe(true);
    expect(CommentInputSchema.safeParse({ postId: UUID, content: "reply", parentCommentId: "nope" }).success).toBe(false);
  });
});

describe("GroupInputSchema", () => {
  it("accepts a valid group", () => {
    expect(GroupInputSchema.safeParse({ name: "MIT 2029", is_private: false }).success).toBe(true);
  });
  it("enforces name length 3..50", () => {
    expect(GroupInputSchema.safeParse({ name: "ab", is_private: false }).success).toBe(false);
    expect(GroupInputSchema.safeParse({ name: "a".repeat(51), is_private: false }).success).toBe(false);
  });
  it("requires is_private and caps description", () => {
    expect(GroupInputSchema.safeParse({ name: "Valid Name" }).success).toBe(false);
    expect(GroupInputSchema.safeParse({ name: "Valid Name", is_private: true, description: "a".repeat(501) }).success).toBe(false);
  });
});
