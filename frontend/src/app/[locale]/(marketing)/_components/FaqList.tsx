import { motionDelay } from "./ui";

/* One FAQ design for the marketing pages (the Landing and Pricing): each question and its answer on one white row in
   ADLaM Display, the question in the dark green and the answer after a dash. In Persian the face becomes Playpen Sans
   Arabic through the :lang(fa) rules in globals.css. Motion needs the page's ScrollReveal and motion.css. */
export default function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <ul className="space-y-3" role="list">
      {items.map((item, i) => (
        <li
          key={item.q}
          className="[font-family:var(--font-adlam)] font-normal rounded-[14px] bg-white px-5 md:px-6 py-3.5 text-[clamp(0.9375rem,0.87rem+0.35vw,1.0625rem)] leading-[1.45] text-[#4F4F4F] shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
          data-reveal="grow"
          style={motionDelay(i * 90)}
        >
          <span className="text-[#1F3D34]">{item.q}</span> — {item.a}
        </li>
      ))}
    </ul>
  );
}
