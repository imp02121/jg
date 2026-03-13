/**
 * TanStack Query hooks for game management.
 *
 * Provides queries and mutations for the admin game endpoints.
 */

import type { GenerateGameRequest } from "@history-gauntlet/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateGame, listGames, previewGame } from "../services/api-client";

const GAMES_KEY = "games";

/** Fetch a paginated list of generated games. */
export function useGames(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [GAMES_KEY, params],
    queryFn: () => listGames(params),
  });
}

/** Fetch the preview of a generated game by date. */
export function useGamePreview(date: string) {
  return useQuery({
    queryKey: [GAMES_KEY, "preview", date],
    queryFn: () => previewGame(date),
    enabled: date.length > 0,
  });
}

/** Generate a new daily game. Invalidates the games list on success. */
export function useGenerateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateGameRequest) => generateGame(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [GAMES_KEY] });
    },
  });
}
