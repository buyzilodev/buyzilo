import { NextResponse } from 'next/server'
import { getHelpCenterConfig, searchHelpArticles } from '@/lib/actions/helpCenter'

export async function GET(req: Request) {
  const config = await getHelpCenterConfig()
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''
  const articles = searchHelpArticles(config, query).filter((article) => !category || article.categorySlug === category)

  return NextResponse.json({
    categories: config.categories,
    articles,
    featured: config.articles.filter((article) => article.published !== false && article.featured),
  })
}
