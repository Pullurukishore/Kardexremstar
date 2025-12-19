import { NextRequest, NextResponse } from 'next/server'
import HTMLtoDOCX from 'html-to-docx'

export async function POST(request: NextRequest) {
    try {
        const { html, filename } = await request.json()

        if (!html) {
            return NextResponse.json(
                { error: 'HTML content is required' },
                { status: 400 }
            )
        }

        // Create full HTML document with styles for Word compatibility
        const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; }
          .page { page-break-after: always; margin: 20px; padding: 20px; }
          .page:last-child { page-break-after: avoid; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background-color: #4472C4; color: white; font-weight: bold; }
          img { max-width: 100%; height: auto; }
          .print\\:hidden { display: none !important; }
          h1, h2, h3, h4 { margin: 10px 0; }
          p { margin: 5px 0; }
          ul, ol { margin: 10px 0; padding-left: 20px; }
          .quote-title-underlined { color: #1e5f8b; text-decoration: underline; font-size: 18pt; }
          .kind-attention-text { color: #1e5f8b; }
          .service-header-badge { background-color: #4472C4; color: white; padding: 8px 16px; }
          .terms-header-badge { background-color: #2d3748; color: white; padding: 8px 16px; }
          .page-footer { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 20px; }
          .footer-content { display: flex; justify-content: space-between; font-size: 10pt; color: #6b7280; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `

        // Convert HTML to DOCX
        const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        })

        // Return the DOCX file
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        headers.set('Content-Disposition', `attachment; filename="${filename || 'quote.docx'}"`)

        return new NextResponse(docxBuffer, {
            status: 200,
            headers,
        })
    } catch (error: any) {
        console.error('Error generating Word document:', error)
        return NextResponse.json(
            { error: 'Failed to generate Word document', details: error.message },
            { status: 500 }
        )
    }
}
