'use client';

import { Heart } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { toggleWishlistAction } from '@/lib/wishlist-actions';
import { cn } from '@/lib/utils';

export function WishlistButton({
  productId,
  initialInWishlist,
  size = 'md',
}: {
  productId: string;
  initialInWishlist: boolean;
  size?: 'sm' | 'md';
}) {
  const [optimistic, setOptimistic] = useOptimistic(initialInWishlist);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const next = !optimistic;
      setOptimistic(next);
      try {
        await toggleWishlistAction(productId, optimistic);
      } catch (err) {
        setOptimistic(!next);
        toast.error(err instanceof Error ? err.message : 'Unable to update wishlist.');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={optimistic}
      aria-label={optimistic ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-border bg-white/80 backdrop-blur transition hover:bg-white',
        size === 'sm' ? 'size-8' : 'size-10',
      )}
    >
      <Heart
        className={cn(
          size === 'sm' ? 'size-4' : 'size-5',
          optimistic ? 'fill-rose-500 stroke-rose-500' : 'stroke-current',
        )}
      />
    </button>
  );
}
