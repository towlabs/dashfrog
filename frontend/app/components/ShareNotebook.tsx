'use client'

import { useState } from 'react'
import { Share2, Link, FileDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { domToPng } from 'modern-screenshot'
import { jsPDF } from 'jspdf'

interface ShareNotebookProps {
  notebookId: string
}

export function ShareNotebook({ notebookId }: ShareNotebookProps) {
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleCopyLink = async () => {
    const viewUrl = `${window.location.origin}/view/${notebookId}`
    try {
      await navigator.clipboard.writeText(viewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Find the notebook content area including title and description
      // Target the container that has both title/desc and the editor
      const contentContainer = document.querySelector('.max-w-6xl') as HTMLElement

      if (!contentContainer) {
        throw new Error('Notebook content not found')
      }

      // Capture the notebook as a PNG using modern-screenshot (supports modern CSS)
      const dataUrl = await domToPng(contentContainer, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
      })

      // Create an image to get dimensions
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = dataUrl
      })

      // Calculate dimensions for PDF - use A4 portrait with margins
      const pageWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const margin = 20 // side margins in mm
      const imgWidth = pageWidth - (2 * margin)
      const imgHeight = (img.height * imgWidth) / img.width

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // If content fits on one page, center it vertically
      if (imgHeight <= pageHeight) {
        const yPosition = (pageHeight - imgHeight) / 2
        pdf.addImage(dataUrl, 'PNG', margin, yPosition, imgWidth, imgHeight)
      } else {
        // Content spans multiple pages
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
      }

      // Download the PDF
      pdf.save(`notebook-${notebookId}.pdf`)
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-muted-foreground flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              <span>Link copied!</span>
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              <span>Copy public link</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileDown className="mr-2 h-4 w-4" />
          <span>{isExporting ? 'Exporting...' : 'Download as PDF'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
