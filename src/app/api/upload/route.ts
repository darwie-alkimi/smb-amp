// Creative file upload — validates and stores file metadata.
// For production, replace the in-memory response with an S3 upload.

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'application/zip',
  'text/html',
]

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          error: `File type "${file.type}" is not supported. Please upload JPG, PNG, GIF, WebP, MP4, or HTML5 ZIP.`,
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return Response.json(
        { error: 'File is too large. Maximum size is 50 MB.' },
        { status: 400 }
      )
    }

    // In production: upload to S3 here and return the URL/key
    // const url = await uploadToS3(file)

    return Response.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      // url: url   // uncomment when S3 is configured
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
