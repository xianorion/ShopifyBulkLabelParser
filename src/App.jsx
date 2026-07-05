import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, TextRun, TableLayoutType, HeightRule } from 'docx'
import { saveAs } from 'file-saver'
import PreviewControls from './components/PreviewControls'
import PreviewLabel from './components/PreviewLabel'
import PreviewSheetLabel from './components/PreviewSheetLabel'
import { getLabelPosition, getLabelScale, getPreviewPages } from './utils/previewLogic'
import './App.css'

GlobalWorkerOptions.workerSrc = pdfWorker

function looksLikeSeparator(text) {
  const trimmed = text.trim()

  return !trimmed
    ? true
    : /^[-_=]{3,}$/.test(trimmed) || /^•+$/.test(trimmed) || /^\s*(ship to|shipping address)\s*$/i.test(trimmed)
}

function isUSCountry(text) {
  const cleaned = text.trim().toLowerCase()
  return ['usa', 'united states', 'united states of america', 'us', 'u.s.', 'u.s.a.'].includes(cleaned)
}

function looksBold(item) {
  return typeof item?.fontName === 'string' && /bold/i.test(item.fontName)
}

function inchesToDxa(inches) {
  return Math.round(inches * 1440)
}

async function parseShippingAddresses(file) {
  if (!file) {
    return []
  }

  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pageCount = pdf.numPages || 1
  const fallbackName = file.name.replace(/\.pdf$/i, '')
  const parsedAddresses = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const items = content?.items || []
    const textItems = items.map((item) => (item?.str || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    const shipToIndex = textItems.findIndex((text) => /ship\s+to/i.test(text))

    if (shipToIndex === -1) {
      parsedAddresses.push(fallbackName)
      continue
    }

    const labelLines = []
    for (let index = shipToIndex + 1; index < textItems.length; index += 1) {
      const line = textItems[index]

      if (!line || looksLikeSeparator(line)) {
        continue
      }

      if (/bill\s+to/i.test(line)) {
        break
      }

      if (isUSCountry(line)) {
        break
      }

      if (/country/i.test(line)) {
        labelLines.push(line)
        break
      }

      labelLines.push(line)
    }

    const addressText = labelLines.join('\n')
    const hasLetter = /[A-Za-z]/.test(addressText)
    const hasDigit = /\d/.test(addressText)

    parsedAddresses.push(hasLetter && hasDigit ? addressText : fallbackName)
  }

  return parsedAddresses
}

function createLabelCell(address) {
  const lines = (address || '').split('\n').filter(Boolean).map((line) => line.trimStart())
  const fontSize = 14
  const text = lines.join('\n')

  return new TableCell({
    width: { size: inchesToDxa(3.6), type: WidthType.DXA },
    height: { size: inchesToDxa(1.8), type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 18, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 18, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 18, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 18, color: '000000' },
    },
    children: [
      new Paragraph({
        alignment: 'left',
        spacing: { before: 40, after: 40 },
        children: lines.flatMap((line, index) => [
          new TextRun({
            text: line,
            size: fontSize,
            font: 'Calibri',
          }),
          ...(index < lines.length - 1 ? [new TextRun({ text: '\n', break: 1 })] : []),
        ]),
      }),
    ],
  })
}

async function generateWordDoc(addresses) {
  const safeAddresses = (addresses || []).filter(Boolean)

  if (!safeAddresses.length) {
    return
  }

  const pageChunks = []
  for (let index = 0; index < safeAddresses.length; index += 10) {
    pageChunks.push(safeAddresses.slice(index, index + 10))
  }

  const children = []

  pageChunks.forEach((pageAddresses, pageIndex) => {
    if (pageIndex > 0) {
      children.push(new Paragraph({ children: [new TextRun('')], pageBreakBefore: true }))
    }

    const rows = []
    for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
      const leftAddress = pageAddresses[rowIndex * 2] || ''
      const rightAddress = pageAddresses[rowIndex * 2 + 1] || ''

      rows.push(
        new TableRow({
          height: { value: inchesToDxa(1.8), rule: HeightRule.EXACT },
          children: [createLabelCell(leftAddress), createLabelCell(rightAddress)],
        }),
      )
    }

    children.push(
      new Table({
        width: { size: inchesToDxa(7.2), type: WidthType.DXA },
        columnWidths: [inchesToDxa(3.6), inchesToDxa(3.6)],
        layout: TableLayoutType.FIXED,
        rows,
      }),
    )
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: 'portrait',
              width: inchesToDxa(8.5),
              height: inchesToDxa(11),
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, 'shopify_labels.docx')
}

function App() {
  const [extractedAddresses, setExtractedAddresses] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [labelPositions, setLabelPositions] = useState({})
  const [labelScales, setLabelScales] = useState({})
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [globalScale, setGlobalScale] = useState(1)
  const [applyScaleGlobally, setApplyScaleGlobally] = useState(false)
  const [globalLineSpacing, setGlobalLineSpacing] = useState(1.4)
  const [globalLabelOffset, setGlobalLabelOffset] = useState({ x: 0, y: 0 })
  const [activeDrag, setActiveDrag] = useState(null)
  const [activeGlobalDrag, setActiveGlobalDrag] = useState(null)

  const handleFiles = async (files) => {
    const pdfFiles = Array.from(files).filter((file) => {
      return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    })

    if (!pdfFiles.length) {
      return
    }

    const nextAddresses = (await Promise.all(pdfFiles.map((file) => parseShippingAddresses(file)))).flat()

    setExtractedAddresses((current) => [...current, ...nextAddresses])
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setDragActive(false)
    await handleFiles(event.dataTransfer.files)
  }

  const handleInputChange = async (event) => {
    await handleFiles(event.target.files)
    event.target.value = ''
  }

  const pages = getPreviewPages(extractedAddresses)

  useEffect(() => {
    if (!activeDrag && !activeGlobalDrag) {
      return undefined
    }

    const handlePointerMove = (event) => {
      if (activeDrag) {
        const deltaX = event.clientX - activeDrag.startX
        const deltaY = event.clientY - activeDrag.startY

        setLabelPositions((current) => ({
          ...current,
          [activeDrag.key]: {
            x: activeDrag.originX + deltaX,
            y: activeDrag.originY + deltaY,
          },
        }))
      }

      if (activeGlobalDrag) {
        const deltaX = event.clientX - activeGlobalDrag.startX
        const deltaY = event.clientY - activeGlobalDrag.startY

        setGlobalLabelOffset({
          x: activeGlobalDrag.originX + deltaX,
          y: activeGlobalDrag.originY + deltaY,
        })
      }
    }

    const handlePointerUp = () => {
      setActiveDrag(null)
      setActiveGlobalDrag(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [activeDrag, activeGlobalDrag])

  const handleLabelDragStart = (event, key) => {
    event.preventDefault()
    event.stopPropagation()

    const currentPosition = labelPositions[key] || { x: 0, y: 0 }

    setSelectedLabel(key)
    setActiveDrag({
      key,
      startX: event.clientX,
      startY: event.clientY,
      originX: currentPosition.x,
      originY: currentPosition.y,
    })
  }

  const handleGlobalDragStart = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setActiveGlobalDrag({
      startX: event.clientX,
      startY: event.clientY,
      originX: globalLabelOffset.x,
      originY: globalLabelOffset.y,
    })
  }

  const handleSelectedScaleChange = (event) => {
    const nextValue = Number(event.target.value)

    if (applyScaleGlobally) {
      setGlobalScale(nextValue)
      return
    }

    if (!selectedLabel) {
      return
    }

    setLabelScales((current) => ({ ...current, [selectedLabel]: nextValue }))
  }

  const selectedScale = applyScaleGlobally ? globalScale : selectedLabel ? labelScales[selectedLabel] || globalScale : globalScale

  return (
    <div className="app-shell">
      <header className="hero-header">
        <div>
          <p className="eyebrow">Shopify label parser</p>
          <h1>Import PDFs and preview your label sheet.</h1>
          <p className="subtitle">
            Drop one or more PDFs to build a simple 10-label-per-page layout preview.
          </p>
        </div>
      </header>

      <label
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={handleDrop}
      >
        <input type="file" accept="application/pdf" multiple onChange={handleInputChange} />
        <span className="upload-icon">⬆</span>
        <strong>Drop PDF files here</strong>
        <span>or click to browse</span>
      </label>

      <div className="export-bar">
        <div className="label-count-pill">
          {extractedAddresses.length} generated label{extractedAddresses.length === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowPreview(true)}
          disabled={extractedAddresses.length === 0}
        >
          Preview labels
        </button>
        <button
          type="button"
          className="export-button"
          onClick={() => generateWordDoc(extractedAddresses)}
          disabled={extractedAddresses.length === 0}
        >
          Export Word Doc
        </button>
      </div>

      <section className="workspace">
        <div className="panel">
          <div className="panel-header">
            <h2>Imported addresses</h2>
            <span>
              {extractedAddresses.length} item{extractedAddresses.length === 1 ? '' : 's'}
            </span>
          </div>

          {extractedAddresses.length === 0 ? (
            <div className="empty-state">No addresses imported yet.</div>
          ) : (
            <ul className="address-list">
              {extractedAddresses.map((address, index) => (
                <li key={`${address}-${index}`} className="address-item">
                  <span className="address-index">{index + 1}</span>
                  <div>
                    <strong>{address}</strong>
                    <p>PDF label {index + 1}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel preview-panel">
          <div className="panel-header">
            <h2>Preview</h2>
            <span>10 per page</span>
          </div>

          <div className="preview-stack">
            {pages.map((page, pageIndex) => (
              <div className="preview-page" key={`page-${pageIndex}`}>
                <div className="page-label">Page {pageIndex + 1}</div>
                <div className="page-grid">
                  {page.pageItems.map((address, itemIndex) => {
                    const key = `preview-${pageIndex}-${itemIndex}`
                    const position = getLabelPosition(labelPositions, key)
                    const scale = getLabelScale(labelScales, globalScale, key, applyScaleGlobally)

                    return (
                      <PreviewLabel
                        key={key}
                        address={address}
                        keyId={key}
                        position={{ x: position.x + globalLabelOffset.x, y: position.y + globalLabelOffset.y }}
                        scale={scale}
                        lineSpacing={globalLineSpacing}
                        selected={selectedLabel === key}
                        onSelect={setSelectedLabel}
                        onMoveStart={handleLabelDragStart}
                      />
                    )
                  })}
                  {page.emptySlots.map((_, index) => (
                    <div className="preview-card empty-slot" key={`empty-${pageIndex}-${index}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showPreview && (
        <div className="preview-modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="preview-modal-header">
              <div>
                <h3>Label preview</h3>
                <p>Review the sheet layout before exporting to Word.</p>
              </div>
              <div className="preview-modal-actions">
                <div className="preview-controls preview-controls-inline">
                  <PreviewControls
                    selectedScale={selectedScale}
                    applyScaleGlobally={applyScaleGlobally}
                    onToggleGlobalScale={() => setApplyScaleGlobally((current) => !current)}
                    onScaleChange={handleSelectedScaleChange}
                    globalLineSpacing={globalLineSpacing}
                    onLineSpacingChange={(event) => setGlobalLineSpacing(Number(event.target.value))}
                    onGlobalMoveStart={handleGlobalDragStart}
                    selectedLabel={selectedLabel}
                  />
                </div>
                <button type="button" className="secondary-button" onClick={() => window.print()}>
                  Print
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowPreview(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="preview-modal-body">
              {pages.map((page, pageIndex) => (
                <div className="preview-sheet" key={`preview-${pageIndex}`}>
                  <div className="preview-sheet-title">Page {pageIndex + 1}</div>
                  <div className="preview-sheet-grid">
                    {page.pageItems.map((address, itemIndex) => {
                      const key = `modal-preview-${pageIndex}-${itemIndex}`
                      const position = getLabelPosition(labelPositions, key)
                      const scale = getLabelScale(labelScales, globalScale, key, applyScaleGlobally)

                      return (
                        <PreviewSheetLabel
                          key={key}
                          address={address}
                          keyId={key}
                          position={{ x: position.x + globalLabelOffset.x, y: position.y + globalLabelOffset.y }}
                          scale={scale}
                          lineSpacing={globalLineSpacing}
                          selected={selectedLabel === key}
                          onSelect={setSelectedLabel}
                          onMoveStart={handleLabelDragStart}
                        />
                      )
                    })}
                    {page.emptySlots.map((_, index) => (
                      <div className="preview-sheet-label empty-slot" key={`preview-empty-${pageIndex}-${index}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
