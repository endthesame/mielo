export type RecallChoice = 'remembered' | 'not-remembered';
export type ReviewFlow = {
  revealed: boolean;
  recall: RecallChoice | null;
  automaticMatch: 'exact' | 'fuzzy' | null;
};

export type ReviewAction =
  | { type: 'self-assessment'; choice: RecallChoice }
  | { type: 'show-answer' }
  | { type: 'speech-match'; kind: 'exact' | 'fuzzy' }
  | { type: 'edit-answer' }
  | { type: 'reset' };

export const initialReviewFlow: ReviewFlow = { revealed: false, recall: null, automaticMatch: null };

// Buttons and swipes dispatch the same action; the FSRS rating is selected separately.
export function reviewFlowReducer(state: ReviewFlow, action: ReviewAction): ReviewFlow {
  switch (action.type) {
    case 'self-assessment':
      return state.revealed ? state : { revealed: true, recall: action.choice, automaticMatch: null };
    case 'show-answer':
      return state.revealed ? state : { revealed: true, recall: null, automaticMatch: null };
    case 'speech-match':
      return state.revealed ? state : { revealed: true, recall: null, automaticMatch: action.kind };
    case 'edit-answer':
      return { ...state, automaticMatch: null };
    case 'reset':
      return initialReviewFlow;
  }
}
