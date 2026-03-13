/**
 * Reusable question form for create and edit pages.
 *
 * Validates with shared Zod schemas before submission.
 * Displays a live preview alongside the form.
 */

import {
  type CorrectIndex,
  type CreateQuestionRequest,
  DIFFICULTY_TIER_VALUES,
  type DifficultyTier,
  type Question,
} from "@history-gauntlet/shared";
import { createQuestionSchema } from "@history-gauntlet/shared";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { questionFormStyles as styles } from "./QuestionForm.styles";
import { QuestionPreview } from "./QuestionPreview";

interface QuestionFormProps {
  readonly initialData?: Question;
  readonly onSubmit: (data: CreateQuestionRequest) => void;
  readonly isLoading: boolean;
}

const CORRECT_INDEX_OPTIONS = [
  { value: 0, label: "Option A (first)" },
  { value: 1, label: "Option B (second)" },
  { value: 2, label: "Option C (third)" },
  { value: 3, label: "Option D (fourth)" },
] as const;

export function QuestionForm({ initialData, onSubmit, isLoading }: QuestionFormProps) {
  const [difficulty, setDifficulty] = useState<DifficultyTier>(initialData?.difficulty ?? "Novice");
  const [iconKey, setIconKey] = useState(initialData?.iconKey ?? "");
  const [question, setQuestion] = useState(initialData?.question ?? "");
  const [options, setOptions] = useState<[string, string, string, string]>(
    initialData?.options ? [...initialData.options] : ["", "", "", ""],
  );
  const [correctIndex, setCorrectIndex] = useState<CorrectIndex>(initialData?.correctIndex ?? 0);
  const [fact, setFact] = useState(initialData?.fact ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateOption(index: number, value: string) {
    const next: [string, string, string, string] = [...options];
    next[index] = value;
    setOptions(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data: CreateQuestionRequest = {
      difficulty,
      iconKey,
      question,
      options,
      correctIndex,
      fact,
      category,
    };
    const result = createQuestionSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(data);
  }

  function onInput(setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setter(e.target.value);
  }

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label htmlFor="qf-difficulty" style={styles.label}>
            Difficulty Tier
          </label>
          <select
            id="qf-difficulty"
            style={styles.select}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyTier)}
          >
            {DIFFICULTY_TIER_VALUES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label htmlFor="qf-iconKey" style={styles.label}>
            Icon Key
          </label>
          <input
            id="qf-iconKey"
            style={styles.input}
            value={iconKey}
            onChange={onInput(setIconKey)}
            placeholder="e.g. sword, shield, book"
          />
          {errors.iconKey && <div style={styles.error}>{errors.iconKey}</div>}
        </div>
        <div style={styles.field}>
          <label htmlFor="qf-category" style={styles.label}>
            Category
          </label>
          <input
            id="qf-category"
            style={styles.input}
            value={category}
            onChange={onInput(setCategory)}
            placeholder="e.g. Ancient, Medieval, Modern"
          />
          {errors.category && <div style={styles.error}>{errors.category}</div>}
        </div>
        <div style={styles.field}>
          <label htmlFor="qf-question" style={styles.label}>
            Question
          </label>
          <textarea
            id="qf-question"
            style={styles.textarea}
            value={question}
            onChange={onInput(setQuestion)}
            placeholder="Enter the question text..."
          />
          {errors.question && <div style={styles.error}>{errors.question}</div>}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={styles.field}>
            <label htmlFor={`qf-option-${i}`} style={styles.label}>
              Option {String.fromCharCode(65 + i)}
            </label>
            <input
              id={`qf-option-${i}`}
              style={styles.input}
              value={options[i]}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Answer option ${i + 1}`}
            />
            {errors[`options.${i}`] && <div style={styles.error}>{errors[`options.${i}`]}</div>}
          </div>
        ))}
        <div style={styles.field}>
          <label htmlFor="qf-correctIndex" style={styles.label}>
            Correct Answer
          </label>
          <select
            id="qf-correctIndex"
            style={styles.select}
            value={correctIndex}
            onChange={(e) => setCorrectIndex(Number(e.target.value) as CorrectIndex)}
          >
            {CORRECT_INDEX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label htmlFor="qf-fact" style={styles.label}>
            Fun Fact
          </label>
          <textarea
            id="qf-fact"
            style={styles.textarea}
            value={fact}
            onChange={onInput(setFact)}
            placeholder="Educational fact revealed after answering..."
          />
          {errors.fact && <div style={styles.error}>{errors.fact}</div>}
        </div>
        <button
          type="submit"
          style={isLoading ? styles.buttonDisabled : styles.button}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : initialData ? "Update Question" : "Create Question"}
        </button>
      </form>
      <div style={styles.previewSection}>
        <div style={styles.previewLabel}>Live Preview</div>
        <QuestionPreview data={{ difficulty, question, options, correctIndex, fact }} />
      </div>
    </div>
  );
}
