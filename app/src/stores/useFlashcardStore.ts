import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Entry = { box: number; due: number };
const REVIEW_DAYS = [0, 1, 3, 7, 14, 30];
type State = { cards: Record<string, Entry>; grade: (id: string, known: boolean) => void };

export const useFlashcardStore = create<State>()(persist((set) => ({
  cards: {},
  grade: (id, known) => set((state) => {
    const previous = state.cards[id]?.box ?? 1;
    const box = known ? Math.min(REVIEW_DAYS.length - 1, previous + 1) : 1;
    return { cards: { ...state.cards, [id]: { box, due: Date.now() + REVIEW_DAYS[box] * 86_400_000 } } };
  }),
}), { name: 'chinspeak-flashcards', version: 1 }));

export const flashcardIsDue = (entry?: Entry) => !entry || entry.due <= Date.now();
