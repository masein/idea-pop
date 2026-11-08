'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { getAccessToken } from '@/lib/api/auth';
import { fetchChallenges } from '@/lib/api/client';
import { PUBLIC_PREVIEW } from '@/lib/publicPreview';

// Opens a challenge by its stable slug (e.g. the landing page's "The train that went boom"). Challenge ids are
// generated per database, so links from outside the app name the slug and this page swaps it for the id.
export default function ChallengeBySlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchChallenges()
      .then((list) => {
        if (cancelled) return;
        const hit = list.find((c: { slug?: string }) => c.slug === slug) as { id: string } | undefined;
        if (hit) router.replace(`/challenges/${hit.id}`);
        else setMissing(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Public preview: the list is open to everyone, so a failure here is not a sign-in.
        if (PUBLIC_PREVIEW) {
          setMissing(true);
          return;
        }
        // Signed out: sign in and come straight back here, as the challenge page does.
        if (!getAccessToken()) {
          try {
            sessionStorage.setItem('ideapop_return_to', `/challenges/by-slug/${slug}`);
          } catch {
            /* private mode — they land on their dashboard instead */
          }
          router.replace('/child-login');
          return;
        }
        setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  useEffect(() => {
    if (missing) router.replace('/challenges');
  }, [missing, router]);

  return null;
}
