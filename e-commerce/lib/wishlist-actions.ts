'use server';

import { revalidatePath } from 'next/cache';
import {
  persistRefreshedSession,
  requireAuthenticatedSession,
} from '@/lib/auth-session';
import { addToWishlist, removeFromWishlist } from '@/lib/store';

async function requireSession() {
  const authState = await requireAuthenticatedSession();
  await persistRefreshedSession(authState);
  return { viewer: authState.viewer, accessToken: authState.accessToken };
}

export async function toggleWishlistAction(productId: string, currentlyInWishlist: boolean) {
  const { viewer, accessToken } = await requireSession();

  if (currentlyInWishlist) {
    await removeFromWishlist({ accessToken, userId: viewer.id, productId });
  } else {
    await addToWishlist({ accessToken, userId: viewer.id, productId });
  }

  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/account/wishlist');
  return { inWishlist: !currentlyInWishlist };
}
