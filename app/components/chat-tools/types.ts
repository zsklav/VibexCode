export type BoardTool =
  | "pencil"
  | "brush"
  | "eraser"
  | "highlighter"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "triangle"
  | "text"
  | "pan";

export type BoardElement = {
  id: string;
  type: "path" | "shape" | "text";
  tool: BoardTool;
  points?: number[][];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
};

export type PollOption = {
  id: string;
  label: string;
};

export type PollVote = {
  userId: string;
  optionIds: string[];
  votedAt?: string;
};

export type Poll = {
  _id: string;
  conversationId: string;
  messageId?: string;
  question: string;
  options: PollOption[];
  votes: PollVote[];
  creatorId: string;
  creatorName?: string;
  multipleChoice: boolean;
  anonymous: boolean;
  allowVoteChanges: boolean;
  expiresAt?: string | null;
  timeline?: Array<{ at: string; totalVotes: number }>;
};

export type ChatThemeId =
  | "default"
  | "ocean"
  | "aurora"
  | "purple-night"
  | "sunset"
  | "cyber"
  | "emerald";
