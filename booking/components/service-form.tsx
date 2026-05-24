'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createService, deleteService, updateService } from '@/lib/provider-actions';
import type { Service } from '@/lib/types';

export function ServiceForm({
  providerId,
  service,
}: {
  providerId: string;
  service?: Service;
}) {
  const router = useRouter();
  const mode: 'create' | 'edit' = service ? 'edit' : 'create';

  const [name, setName] = useState(service?.name ?? '');
  const [shortDescription, setShortDescription] = useState(service?.short_description ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [durationMin, setDurationMin] = useState(service?.duration_min ?? 60);
  const [priceDollars, setPriceDollars] = useState(
    service ? (service.price_cents / 100).toFixed(2) : '0.00',
  );
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? '');
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const priceCents = Math.max(0, Math.round(parseFloat(priceDollars) * 100) || 0);

    const result =
      mode === 'create'
        ? await createService({
            providerId,
            name,
            short_description: shortDescription,
            description,
            duration_min: durationMin,
            price_cents: priceCents,
            image_url: imageUrl,
            is_active: isActive,
          })
        : await updateService({
            serviceId: service!.id,
            name,
            short_description: shortDescription,
            description,
            duration_min: durationMin,
            price_cents: priceCents,
            image_url: imageUrl,
            is_active: isActive,
          });

    if (result.success) {
      toast.success(mode === 'create' ? 'Service created.' : 'Service updated.');
      router.push('/dashboard/services');
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!service) return;
    if (!confirm('Delete this service? Active bookings will retain their reference.')) return;
    setIsDeleting(true);
    const result = await deleteService(service.id);
    if (result.success) {
      toast.success('Service deleted.');
      router.push('/dashboard/services');
    } else {
      toast.error(result.error);
    }
    setIsDeleting(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">Name *</label>
        <input
          id="name"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="shortDescription">Short description</label>
        <input
          id="shortDescription"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="One line for the card view"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">Long description</label>
        <textarea
          id="description"
          rows={5}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="What's included, prep, expectations."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="duration">Duration (minutes) *</label>
          <input
            id="duration"
            type="number"
            min={5}
            max={480}
            step={5}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={durationMin}
            onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="price">Price (USD) *</label>
          <input
            id="price"
            type="number"
            min={0}
            step={0.5}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="imageUrl">Image URL</label>
        <input
          id="imageUrl"
          type="url"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Accepting bookings
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === 'create' ? (
            'Create service'
          ) : (
            'Save service'
          )}
        </Button>
        {mode === 'edit' && service ? (
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
