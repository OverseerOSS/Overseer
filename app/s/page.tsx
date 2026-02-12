import { redirect } from 'next/navigation';

export default async function SPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  
  // Try to find an ID or slug in query params
  // Handles /s?id=slug, /s?slug, and even weird cases like /s?=slug
  const slug = params.id || params.slug || Object.keys(params).find(k => k !== '') || params[''];

  if (slug) {
    redirect(`/s/${slug}`);
  }

  redirect('/');
}
