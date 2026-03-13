/**
 * Barrel export for all shared validators.
 */

export {
  correctIndexSchema,
  createQuestionSchema,
  difficultyTierSchema,
  optionsTupleSchema,
  questionSchema,
  updateQuestionSchema,
} from "./question";

export {
  dailyGameSchema,
  gameQuestionSchema,
  localAnswerSchema,
  localGameResultSchema,
} from "./game";
