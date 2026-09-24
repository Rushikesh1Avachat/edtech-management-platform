import { NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { asc } from 'drizzle-orm';

const defaultCategories = [
  {
    name: 'AI',
    slug: 'ai',
    description: 'Artificial intelligence, generative AI, machine learning, and intelligent applications',
    icon: 'Sparkles',
  },
  {
    name: 'Mobile Apps',
    slug: 'mobile-apps',
    description: 'iOS, Android, Flutter, React Native, and cross-platform mobile development',
    icon: 'Smartphone',
  },
];

export async function GET() {
  try {
    // Backfill newly supported categories for databases created before they were added.
    await db.insert(categories).values(defaultCategories).onConflictDoNothing();
    const list = await db.select().from(categories).orderBy(asc(categories.name));
    return NextResponse.json({ categories: list });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}
