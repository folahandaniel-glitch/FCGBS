import type { QuestionSeed } from "./types";
import { JESUS_QUESTIONS } from "./jesus";
import { EVIL_QUESTIONS } from "./evil";
import { BIBLE_QUESTIONS } from "./bible";
import { CHURCH_QUESTIONS } from "./church";
import { MORE_QUESTIONS } from "./more";
import { SPIRIT_QUESTIONS } from "./spirit";

export type { QuestionSeed } from "./types";
export const QUESTIONS_SEED: QuestionSeed[] = [...JESUS_QUESTIONS, ...EVIL_QUESTIONS, ...BIBLE_QUESTIONS, ...CHURCH_QUESTIONS, ...MORE_QUESTIONS, ...SPIRIT_QUESTIONS];
