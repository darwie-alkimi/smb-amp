const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'application/zip',
  'text/html',
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB (base64 stored in state)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({
        error: `File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, MP4, or HTML5 ZIP.`,
      }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({
        error: 'File is too large. Maximum size is 10 MB.',
      }, { status: 400 })
    }

    // Convert to base64 so we can pass it through to Beeswax at submission time
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    return Response.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileBase64: base64,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
