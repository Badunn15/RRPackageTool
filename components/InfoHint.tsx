"use client";

/** Small "ⓘ" hover target for an explanatory note that doesn't need to stay visible inline. */
export default function InfoHint({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      className="cursor-help rounded-full text-[11px] leading-none text-cream/40 hover:text-gold focus:text-gold focus:outline-none"
    >
      ⓘ
    </span>
  );
}
