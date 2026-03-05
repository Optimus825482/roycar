import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionCard } from "./QuestionCard";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: ({ id }: { id: string }) => ({
    attributes: {},
    listeners: {},
    setNodeRef: null,
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe("QuestionCard", () => {
  it("renders question text and index", () => {
    const question = {
      id: "q1",
      questionText: "Deneyim yılı?",
      questionType: "short_text",
      isRequired: true,
      sortOrder: 0,
      options: null,
      validation: null,
      metadata: null,
      images: [],
      groupLabel: null,
    };
    render(
      <QuestionCard
        question={question}
        index={2}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText("Deneyim yılı?")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
