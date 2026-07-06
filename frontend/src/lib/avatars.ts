export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  bg: string;
  /** 3D illustration in /public/kid/avatars. Falls back to `emoji` when absent. */
  img?: string;
}

export const AVATARS: Avatar[] = [
  { id: "cat", emoji: "🐱", label: "Cat", bg: "#F9DED7", img: "/kid/avatars/cat.png" },
  { id: "dolphin", emoji: "🐬", label: "Dolphin", bg: "#C0F0FF", img: "/kid/avatars/dolphin.png" },
  { id: "kingfisher", emoji: "🐦", label: "Kingfisher", bg: "#C0F0FF", img: "/kid/avatars/kingfisher.png" },
  { id: "chameleon", emoji: "🦎", label: "Chameleon", bg: "#F3FFC2", img: "/kid/avatars/chameleon.png" },
  { id: "octopus", emoji: "🐙", label: "Octopus", bg: "#F1D8FB", img: "/kid/avatars/octopus.png" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly", bg: "#F1D8FB", img: "/kid/avatars/butterfly.png" },
  { id: "bee", emoji: "🐝", label: "Bee", bg: "#FBF7D5", img: "/kid/avatars/bee.png" },
  { id: "beetle", emoji: "🪲", label: "Beetle", bg: "#C0F0FF", img: "/kid/avatars/beetle.png" },
  { id: "beaver", emoji: "🦫", label: "Beaver", bg: "#FBF7D5", img: "/kid/avatars/beaver.png" },
  { id: "camel", emoji: "🐫", label: "Camel", bg: "#FBF7D5", img: "/kid/avatars/camel.png" },
  { id: "bat", emoji: "🦇", label: "Bat", bg: "#F1D8FB", img: "/kid/avatars/bat.png" },
  { id: "silkworm", emoji: "🐛", label: "Silkworm", bg: "#F3FFC2", img: "/kid/avatars/silkworm.png" },
];
