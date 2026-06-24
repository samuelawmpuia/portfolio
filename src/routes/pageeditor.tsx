import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client ─────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ruzedgxzbelmezvwjtpd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_z6Z_hB-PkpW3oWkGkIEOrw_-07GeL5q'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Types ────────────────────────────────────────────────────────────────────
type Block =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'image'; file: File | null; preview: string; caption: string }

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute('/pageeditor')({
  component: RouteComponent,
})

// ─── Component ────────────────────────────────────────────────────────────────
function RouteComponent() {
  const [title, setTitle] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: 'paragraph', text: '' },
  ])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)

  function handleThumbnailFile(file: File) {
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  function removeThumbnail() {
    setThumbnail(null)
    setThumbnailPreview('')
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
  }

  // ── Tag input ─────────────────────────────────────────────────────────────
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/,/g, '')
      if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  // ── Block helpers ─────────────────────────────────────────────────────────
  function addParagraph() {
    setBlocks((prev) => [...prev, { id: uid(), type: 'paragraph', text: '' }])
  }

  function addImageBlock() {
    setBlocks((prev) => [
      ...prev,
      { id: uid(), type: 'image', file: null, preview: '', caption: '' },
    ])
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  function updateParagraph(id: string, text: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === 'paragraph' ? { ...b, text } : b)),
    )
  }

  function updateCaption(id: string, caption: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === 'image' ? { ...b, caption } : b)),
    )
  }

  function handleImageFile(id: string, file: File) {
    const preview = URL.createObjectURL(file)
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === 'image' ? { ...b, file, preview } : b)),
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!title.trim()) {
      setErrorMsg('Please add a title before publishing.')
      return
    }
    setStatus('loading')
    setErrorMsg('')

    try {
      const processedBlocks: object[] = []

      // Upload thumbnail if provided
      let thumbnailUrl = ''
      if (thumbnail) {
        const ext = thumbnail.name.split('.').pop()
        const path = `thumbnails/${uid()}.${ext}`
        const { error: thumbError } = await supabase.storage
          .from('blog-assets')
          .upload(path, thumbnail)
        if (thumbError) throw thumbError
        const { data: thumbUrlData } = supabase.storage
          .from('blog-assets')
          .getPublicUrl(path)
        thumbnailUrl = thumbUrlData.publicUrl
      }

      for (const block of blocks) {
        if (block.type === 'paragraph') {
          processedBlocks.push({ type: 'paragraph', text: block.text })
        } else {
          let imageUrl = ''
          if (block.file) {
            const ext = block.file.name.split('.').pop()
            const path = `blog-images/${uid()}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('blog-assets')
              .upload(path, block.file)
            if (uploadError) throw uploadError
            const { data: urlData } = supabase.storage
              .from('blog-assets')
              .getPublicUrl(path)
            imageUrl = urlData.publicUrl
          }
          processedBlocks.push({ type: 'image', url: imageUrl, caption: block.caption })
        }
      }

      const { error: insertError } = await supabase.from('blogs').insert({
        title: title.trim(),
        tags,
        description: description.trim(),
        content: processedBlocks,
        thumbnail_url: thumbnailUrl,
        created_at: new Date().toISOString(),
      })

      if (insertError) throw insertError
      setStatus('success')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  function handleReset() {
    setTitle('')
    setTags([])
    setTagInput('')
    setDescription('')
    setThumbnail(null)
    setThumbnailPreview('')
    setBlocks([{ id: uid(), type: 'paragraph', text: '' }])
    setStatus('idle')
    setErrorMsg('')
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <span className="text-emerald-600 text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2 tracking-tight">
            Post published!
          </h2>
          <p className="text-sm text-stone-500 mb-8">
            Your blog post has been saved to the database.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Write another post
          </button>
        </div>
      </div>
    )
  }

  // ── Main editor ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-100">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-stone-100">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">New post</h1>
          <span className="text-xs text-stone-400 font-medium uppercase tracking-widest">Draft</span>
        </div>

        <div className="px-8 py-7 space-y-7">

          {/* Title */}
          <Field label="Title">
            <input
              className="w-full px-3.5 py-2.5 text-base bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Your post title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          {/* Tags */}
          <Field label="Tags" hint="Enter or comma to add">
            <div className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="text-indigo-400 hover:text-indigo-700 leading-none transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[120px] bg-transparent text-sm text-stone-900 placeholder:text-stone-400 outline-none"
                placeholder={tags.length ? '' : 'design, tech, life…'}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
            </div>
          </Field>

          {/* Description */}
          <Field label="Description" hint="Shown in post previews">
            <textarea
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y leading-relaxed transition"
              placeholder="A short summary of your post…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>

          {/* Thumbnail */}
          <Field label="Thumbnail" hint="Shown as the post cover image">
            {thumbnailPreview ? (
              <div className="relative group w-full">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg border border-stone-200"
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-stone-800 text-xs font-medium rounded-md hover:bg-stone-100 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={removeThumbnail}
                    className="px-3 py-1.5 bg-white text-red-600 text-xs font-medium rounded-md hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleThumbnailFile(f)
                  }}
                />
              </div>
            ) : (
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              >
                <span className="text-2xl">🖼</span>
                <span className="text-xs text-stone-500">Upload thumbnail</span>
                <span className="text-xs text-stone-400">PNG, JPG, WEBP</span>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleThumbnailFile(f)
                  }}
                />
              </div>
            )}
          </Field>

          {/* Content blocks */}
          <Field label="Content">
            <div className="space-y-3">
              {blocks.map((block) =>
                block.type === 'paragraph' ? (
                  <div key={block.id} className="relative group">
                    <textarea
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y leading-7 transition"
                      placeholder="Write your paragraph here…"
                      value={block.text}
                      onChange={(e) => updateParagraph(block.id, e.target.value)}
                      rows={4}
                    />
                    {blocks.length > 1 && (
                      <button
                        onClick={() => removeBlock(block.id)}
                        title="Remove block"
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div key={block.id} className="relative group">
                    <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-2">
                      {block.preview ? (
                        <>
                          <img
                            src={block.preview}
                            alt="preview"
                            className="w-full rounded-md object-cover max-h-72"
                          />
                          <button
                            onClick={() => fileInputRefs.current[block.id]?.click()}
                            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Change image
                            <input
                              ref={(el) => { fileInputRefs.current[block.id] = el }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleImageFile(block.id, f)
                              }}
                            />
                          </button>
                        </>
                      ) : (
                        <div
                          onClick={() => fileInputRefs.current[block.id]?.click()}
                          className="border-2 border-dashed border-stone-300 rounded-lg py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                        >
                          <span className="text-2xl">🖼</span>
                          <span className="text-xs text-stone-500">Click to upload image</span>
                          <input
                            ref={(el) => { fileInputRefs.current[block.id] = el }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleImageFile(block.id, f)
                            }}
                          />
                        </div>
                      )}
                      <input
                        className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-md text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="Caption (optional)…"
                        value={block.caption}
                        onChange={(e) => updateCaption(block.id, e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removeBlock(block.id)}
                      title="Remove block"
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ),
              )}

              {/* Add block buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addParagraph}
                  className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  + Paragraph
                </button>
                <button
                  onClick={addImageBlock}
                  className="px-4 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  🖼 Image
                </button>
              </div>
            </div>
          </Field>

          {/* Error */}
          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-stone-100 flex items-center justify-end">
          <button
            onClick={handleSubmit}
            disabled={status === 'loading'}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors tracking-tight"
          >
            {status === 'loading' ? 'Publishing…' : 'Publish post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          {label}
        </label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}