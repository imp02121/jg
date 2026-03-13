/**
 * Barrel export for all shared types.
 */

export type {
  CorrectIndex,
  DifficultyTier,
  OptionsTuple,
  Question,
  TierDefinition,
} from "./question";

export { DIFFICULTY_TIER_VALUES } from "./question";

export type {
  DailyGame,
  DailyGameMetadata,
  GameQuestion,
  LocalAnswer,
  LocalGameResult,
} from "./game";

export type {
  ApiErrorResponse,
  BulkImportError,
  BulkImportQuestionsRequest,
  BulkImportQuestionsResponse,
  CreateQuestionRequest,
  CreateQuestionResponse,
  DailyGameResponse,
  DeleteQuestionResponse,
  GameMetadataItem,
  GenerateGameRequest,
  GenerateGameResponse,
  HealthResponse,
  ListGamesResponse,
  ListQuestionsParams,
  ListQuestionsResponse,
  PaginatedResponse,
  PreviewGameResponse,
  UpdateQuestionRequest,
  UpdateQuestionResponse,
} from "./api";
