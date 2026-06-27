'use client';

interface KidStickerBookProps {
  stickers: string[];
}

const STICKER_EMOJIS: Record<string, string> = {
  'ant-bridge': '🐜',
  'beaver-dam': '🦫',
  'lotus-leaf': '🌸',
  'spider-silk': '🕷️',
  'seed-launcher': '🌱',
  'bird-wing': '🐦',
  'firefly': '🌟',
  'chameleon': '🦎',
};

function stickerEmoji(id: string): string {
  return STICKER_EMOJIS[id] ?? '⭐';
}

export default function KidStickerBook({ stickers }: KidStickerBookProps) {
  return (
    <div data-testid="kid-sticker-book" className="bg-white rounded-card shadow-sm p-5 flex flex-col gap-3">
      <h3 className="font-display text-base text-ink">🎨 My stickers</h3>

      {stickers.length === 0 ? (
        <p className="font-body text-sm text-ink/50">
          Finish challenges to earn stickers!
        </p>
      ) : (
        <div className="flex flex-wrap gap-3" data-testid="sticker-grid">
          {stickers.map((id) => (
            <div
              key={id}
              data-testid={`sticker-${id}`}
              className="w-14 h-14 rounded-card bg-tint-lavender flex items-center justify-center text-3xl shadow-sm"
              title={id}
            >
              {stickerEmoji(id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
