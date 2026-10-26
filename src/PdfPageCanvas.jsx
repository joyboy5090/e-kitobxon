import React, { useEffect, useRef, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import './pdf-original.css'

const MAX_PAGE_WIDTH = 900

// pdf.js og'ir, shuning uchun faqat "Asl PDF" ochilganda yuklanadi
let pdfjsPromise = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([library, worker]) => {
      library.GlobalWorkerOptions.workerSrc = worker.default
      return library
    }).catch((error) => {
      pdfjsPromise = null
      throw error
    })
  }
  return pdfjsPromise
}

function PdfPageCanvas({ bookId, pageNumber }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const docRef = useRef({ id: null, promise: null })
  const renderRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', message: '' })

  const destroyDocument = () => {
    const previous = docRef.current.promise
    docRef.current = { id: null, promise: null }
    previous?.then((doc) => doc.destroy()).catch(() => {})
  }

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return undefined
    const update = () => setWidth(Math.min(Math.floor(element.clientWidth), MAX_PAGE_WIDTH))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => destroyDocument(), [])

  useEffect(() => {
    if (!width) return undefined
    let cancelled = false
    setState({ status: 'loading', message: '' })

    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        if (docRef.current.id !== bookId) {
          destroyDocument()
          const task = pdfjs.getDocument({
            url: `/api/books/${encodeURIComponent(bookId)}/file`,
            withCredentials: true,
            isEvalSupported: false,
            // Skaner rasmlari (JPEG2000/JBIG2), rang profillari va shriftlar uchun dekoderlar
            wasmUrl: `${window.location.origin}/pdfjs/wasm/`,
            iccUrl: `${window.location.origin}/pdfjs/iccs/`,
            cMapUrl: `${window.location.origin}/pdfjs/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${window.location.origin}/pdfjs/standard_fonts/`,
          })
          docRef.current = { id: bookId, promise: task.promise }
        }
        const doc = await docRef.current.promise
        if (cancelled) return
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > doc.numPages) {
          throw new Error('Asl PDFda bunday bet yo‘q.')
        }
        const page = await doc.getPage(pageNumber)
        if (cancelled) return

        // Oldingi chizish tugamaguncha kutamiz (bitta canvas ikki marta ishlatilmasin)
        if (renderRef.current) {
          try { await renderRef.current.promise } catch { /* bekor qilingan */ }
        }
        if (cancelled) return

        const ratio = window.devicePixelRatio || 1
        const baseWidth = page.getViewport({ scale: 1 }).width
        const viewport = page.getViewport({ scale: (width / baseWidth) * ratio })
        const canvas = canvasRef.current
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`

        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
        renderRef.current = task
        await task.promise
        if (!cancelled) setState({ status: 'ready', message: '' })
      } catch (error) {
        if (cancelled || error?.name === 'RenderingCancelledException') return
        destroyDocument()
        setState({ status: 'error', message: error?.message || 'Asl PDFni ochib bo‘lmadi.' })
      }
    })()

    return () => {
      cancelled = true
      renderRef.current?.cancel()
    }
  }, [bookId, pageNumber, width, attempt])

  return (
    <div className="kb-original" ref={wrapRef} aria-busy={state.status === 'loading'}>
      <canvas
        ref={canvasRef}
        className={`kb-original__canvas ${state.status === 'ready' ? '' : 'is-loading'}`}
        role="img"
        aria-label={`Asl PDF, ${pageNumber}-bet`}
      />
      {state.status === 'loading' && <div className="kb-original__overlay" role="status">Bet yuklanmoqda…</div>}
      {state.status === 'error' && (
        <div className="kb-original__overlay kb-original__overlay--error" role="alert">
          <div>
            <CircleAlert size={24} />
            <h2>Asl PDFni ochib bo‘lmadi</h2>
            <p>{state.message}</p>
            <button className="kb-button" type="button" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCw size={14} /> Qayta urinish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PdfPageCanvas
