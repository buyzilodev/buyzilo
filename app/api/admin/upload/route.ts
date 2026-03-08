import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const folder = String(formData.get('folder') ?? 'products').trim()

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'products'
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeFolder)
    await mkdir(uploadDir, { recursive: true })

    const urls: string[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = file.name.split('.').pop()
      const filename = `${safeFolder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filepath = path.join(uploadDir, filename)
      await writeFile(filepath, buffer)
      urls.push(`/uploads/${safeFolder}/${filename}`)
    }

    return NextResponse.json({ success: true, urls })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
