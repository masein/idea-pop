import { notFound } from 'next/navigation';

// Any unmatched path under /[locale]/* renders the branded, localized
// not-found page ([locale]/not-found.tsx). Without this catch-all, Next falls
// back to its default root 404 instead of our localized one.
export default function CatchAllNotFound() {
  notFound();
}
