export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  bg: string;
}

export const AVATARS: Avatar[] = [
  { id: "penguin", emoji: "🐧", label: "Penguin", bg: "#C0F0FF" },
  { id: "fox", emoji: "🦊", label: "Fox", bg: "#FBF7D5" },
  { id: "owl", emoji: "🦉", label: "Owl", bg: "#F1D8FB" },
  { id: "rabbit", emoji: "🐇", label: "Rabbit", bg: "#F3FFC2" },
  { id: "bear", emoji: "🐻", label: "Bear", bg: "#F9DED7" },
  { id: "cat", emoji: "🐱", label: "Cat", bg: "#FBF7D5" },
  { id: "dog", emoji: "🐶", label: "Dog", bg: "#C0F0FF" },
  { id: "turtle", emoji: "🐢", label: "Turtle", bg: "#F3FFC2" },
  { id: "lion", emoji: "🦁", label: "Lion", bg: "#FBF7D5" },
  { id: "elephant", emoji: "🐘", label: "Elephant", bg: "#C0F0FF" },
  { id: "frog", emoji: "🐸", label: "Frog", bg: "#F3FFC2" },
  { id: "shark", emoji: "🦈", label: "Shark", bg: "#C0F0FF" },
];
