'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

type RichTextOutput = 'html' | 'text'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  output?: RichTextOutput
  minHeightClassName?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function toEditorContent(value: string, output: RichTextOutput) {
  if (!value.trim()) return ''
  return output === 'text' ? `<p>${escapeHtml(value)}</p>` : value
}

function ToolbarButton({
  label,
  active = false,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  output = 'html',
  minHeightClassName = 'min-h-[180px]',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: toEditorContent(value, output),
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${minHeightClassName}`,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const nextValue = output === 'text'
        ? instance.getText({ blockSeparator: '\n\n' })
        : instance.getHTML()
      onChange(nextValue)
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = output === 'text'
      ? editor.getText({ blockSeparator: '\n\n' })
      : editor.getHTML()

    if (current === value) return
    editor.commands.setContent(toEditorContent(value, output), { emitUpdate: false })
  }, [editor, output, value])

  if (!editor) {
    return <div className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 ${minHeightClassName}`}>Loading editor...</div>
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-3">
        <ToolbarButton label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton label="U" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolbarButton label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton label="Bullet" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton label="Number" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const existing = editor.getAttributes('link').href as string | undefined
            const href = window.prompt('Enter link URL', existing ?? 'https://')
            if (href === null) return
            const trimmed = href.trim()
            if (!trimmed) {
              editor.chain().focus().unsetLink().run()
              return
            }
            editor.chain().focus().setLink({ href: trimmed }).run()
          }}
        />
        <ToolbarButton label="Clear" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} />
      </div>
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
