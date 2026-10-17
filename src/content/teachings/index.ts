import type { TeachingSeed } from "./types";
import { APOSTOLIC } from "./apostolic";
import { PASTORAL } from "./pastoral";
import { EVANGELICAL } from "./evangelical";
import { PROPHETIC } from "./prophetic";
import { REVIVAL } from "./revival";
import { FOUNDATIONS } from "./foundations";
import { KINGDOM } from "./kingdom";
import { TECHNOLOGY } from "./technology";
import { EXEGESIS } from "./exegesis";

export { TRACKS } from "./tracks";
export const TEACHINGS: TeachingSeed[] = [...APOSTOLIC, ...PASTORAL, ...EVANGELICAL, ...PROPHETIC, ...REVIVAL, ...FOUNDATIONS, ...KINGDOM, ...TECHNOLOGY, ...EXEGESIS];
