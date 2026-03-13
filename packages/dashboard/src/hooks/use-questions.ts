/**
 * TanStack Query hooks for question management.
 *
 * Provides queries and mutations for the admin question CRUD endpoints.
 */

import type {
  CreateQuestionRequest,
  ListQuestionsParams,
  UpdateQuestionRequest,
} from "@history-gauntlet/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  deleteQuestion,
  listQuestions,
  updateQuestion,
} from "../services/api-client";

const QUESTIONS_KEY = "questions";

/** Fetch a paginated, filtered list of questions. */
export function useQuestions(params?: ListQuestionsParams) {
  return useQuery({
    queryKey: [QUESTIONS_KEY, params],
    queryFn: () => listQuestions(params),
  });
}

/** Fetch a single question by loading the list and finding by ID. */
export function useQuestion(id: string) {
  return useQuery({
    queryKey: [QUESTIONS_KEY, "detail", id],
    queryFn: async () => {
      const response = await listQuestions({ limit: 100 });
      const question = response.data.find((q) => q.id === id);
      if (!question) {
        throw new Error(`Question not found: ${id}`);
      }
      return question;
    },
  });
}

/** Create a new question. Invalidates the question list on success. */
export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionRequest) => createQuestion(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
    },
  });
}

/** Update an existing question. Invalidates the question list on success. */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionRequest }) =>
      updateQuestion(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
    },
  });
}

/** Delete a question. Invalidates the question list on success. */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
    },
  });
}
