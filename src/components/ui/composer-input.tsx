import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Trash2,
  Paperclip,
  CornerDownLeft,
  X
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface Attachment {
  id: string
  fileName: string
  fileType: "image" | "document"
  thumbnailUrl?: string
}

export interface ComposerInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string
  onChange?: (val: string) => void
  onSend?: (message: string, attachments: Attachment[]) => void
  initialAttachments?: Attachment[]
  attachments?: Attachment[]
  onRemoveAttachment?: (id: string) => void
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  showSendButton?: boolean
}

// Remove scripts e handlers inline do HTML gerado (autores internos, mas evita
// injeção acidental via colagem).
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
}

// Converte conteúdo legado em markdown (**negrito**, *itálico*, listas, etc.) para
// HTML, para que posts antigos abram já formatados no editor visual. Se o conteúdo
// já for HTML de bloco, devolve como está.
function normalizeToHtml(src = ""): string {
  if (!src) return ""
  if (/<(p|div|ul|ol|li|h[1-6]|strong|em|blockquote|br)\b/i.test(src)) return src

  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  const lines = src.split(/\r?\n/)
  const out: string[] = []
  let listType: "ul" | "ol" | null = null
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    let m: RegExpMatchArray | null
    if ((m = line.match(/^###\s+(.*)/))) {
      closeList(); out.push(`<h3>${inline(m[1])}</h3>`)
    } else if ((m = line.match(/^>\s+(.*)/))) {
      closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`)
    } else if ((m = line.match(/^[-*]\s+(.*)/))) {
      if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul" }
      out.push(`<li>${inline(m[1])}</li>`)
    } else if ((m = line.match(/^\d+\.\s+(.*)/))) {
      if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol" }
      out.push(`<li>${inline(m[1])}</li>`)
    } else if (line.trim() === "") {
      closeList()
    } else {
      closeList(); out.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join("")
}

const isEmptyHtml = (html: string) =>
  !html || html === "<br>" || html.replace(/<[^>]*>/g, "").replace(/ |&nbsp;/g, "").trim() === ""

// Paleta de cores de texto (rápidas). O usuário também pode escolher uma cor livre.
const TEXT_COLORS = [
  "#0f172a", "#ef4444", "#f59e0b", "#eab308", "#10b981",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
]

const ComposerInput = React.forwardRef<HTMLDivElement, ComposerInputProps>(
  (
    {
      className,
      value: externalValue,
      onChange: externalOnChange,
      onSend,
      initialAttachments = [],
      attachments: externalAttachments,
      onRemoveAttachment,
      onFileUpload,
      placeholder = "Digite o conteúdo do artigo...",
      showSendButton = false,
      ...props
    },
    ref
  ) => {
    const [internalMessage, setInternalMessage] = React.useState("")
    const [internalAttachments, setInternalAttachments] = React.useState<Attachment[]>(initialAttachments)
    const editorRef = React.useRef<HTMLDivElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    // Última string emitida por nós — evita reescrever o innerHTML (e resetar o cursor)
    // quando o valor que volta pelo props é o mesmo que acabamos de emitir.
    const lastEmitted = React.useRef<string | null>(null)
    const [showColors, setShowColors] = React.useState(false)
    // Guarda a seleção antes de abrir o seletor de cor nativo (que rouba o foco).
    const savedRange = React.useRef<Range | null>(null)

    const saveSelection = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange()
      }
    }
    const restoreSelection = () => {
      const sel = window.getSelection()
      if (sel && savedRange.current) {
        sel.removeAllRanges()
        sel.addRange(savedRange.current)
      }
    }

    const isControlled = externalValue !== undefined
    const message = isControlled ? externalValue : internalMessage
    const attachments = externalAttachments !== undefined ? externalAttachments : internalAttachments

    const emit = (html: string) => {
      const clean = sanitizeHtml(html)
      lastEmitted.current = clean
      if (!isControlled) setInternalMessage(clean)
      externalOnChange?.(clean)
    }

    // Sincroniza o DOM do editor quando o valor muda por fora (abrir post, limpar).
    React.useEffect(() => {
      const el = editorRef.current
      if (!el) return
      if (message === lastEmitted.current) return // eco da nossa própria edição
      const html = normalizeToHtml(message || "")
      if (el.innerHTML !== html) el.innerHTML = html
      lastEmitted.current = message ?? ""
    }, [message])

    const handleInput = () => {
      const el = editorRef.current
      if (el) emit(el.innerHTML)
    }

    // Colagem sempre como texto puro — mantém o HTML limpo.
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData("text/plain")
      document.execCommand("insertText", false, text)
    }

    const exec = (command: string, value?: string) => {
      editorRef.current?.focus()
      document.execCommand(command, false, value)
      handleInput()
    }

    const wrapCode = () => {
      editorRef.current?.focus()
      const sel = window.getSelection()?.toString() || "código"
      document.execCommand("insertHTML", false, `<code>${sel}</code>`)
      handleInput()
    }

    const insertLink = () => {
      const url = window.prompt("URL do link:", "https://")
      if (url) exec("createLink", url)
    }

    const applyColor = (color: string) => {
      editorRef.current?.focus()
      restoreSelection()
      // styleWithCSS gera <span style="color"> em vez do <font> legado.
      document.execCommand("styleWithCSS", false, "true")
      document.execCommand("foreColor", false, color)
      handleInput()
      setShowColors(false)
    }

    const handleSend = () => {
      if (onSend && (!isEmptyHtml(message) || attachments.length > 0)) {
        onSend(message, attachments)
        if (!isControlled) {
          setInternalMessage("")
          setInternalAttachments([])
        }
      }
    }

    const handleRemoveAttachment = (id: string) => {
      if (onRemoveAttachment) onRemoveAttachment(id)
      else setInternalAttachments((prev) => prev.filter((att) => att.id !== id))
    }

    const handleClear = () => {
      if (editorRef.current) editorRef.current.innerHTML = ""
      emit("")
      if (!onRemoveAttachment) setInternalAttachments([])
    }

    const handleOpenFile = () => fileInputRef.current?.click()

    const toolbarItems = [
      { id: "bold", icon: Bold, tooltip: "Negrito", action: () => exec("bold") },
      { id: "italic", icon: Italic, tooltip: "Itálico", action: () => exec("italic") },
      { id: "underline", icon: Underline, tooltip: "Sublinhado", action: () => exec("underline") },
      { id: "list", icon: List, tooltip: "Lista de tópicos", action: () => exec("insertUnorderedList") },
      { id: "ordered", icon: ListOrdered, tooltip: "Lista numerada", action: () => exec("insertOrderedList") },
      { id: "quote", icon: Quote, tooltip: "Citação / destaque", action: () => exec("formatBlock", "blockquote") },
      { id: "code", icon: Code, tooltip: "Código", action: wrapCode },
      { id: "link", icon: LinkIcon, tooltip: "Link", action: insertLink },
    ]

    const actionItems = [
      { id: "paperclip", icon: Paperclip, tooltip: "Anexar arquivo / imagem", action: handleOpenFile },
      { id: "image", icon: ImageIcon, tooltip: "Upload de imagem", action: handleOpenFile },
      { id: "heading", icon: Type, tooltip: "Subtítulo de seção", action: () => exec("formatBlock", "h3") },
    ]

    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={cn(
            "flex flex-col w-full rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-in-out focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500",
            className
          )}
          {...props}
        >
          {/* Estilos do conteúdo editável */}
          <style>{`
            .blog-wysiwyg:empty:before { content: attr(data-placeholder); color: hsl(var(--muted-foreground)); pointer-events: none; }
            .blog-wysiwyg:focus { outline: none; }
            .blog-wysiwyg h3 { font-size: 1.05rem; font-weight: 800; margin: 0.6em 0 0.3em; }
            .blog-wysiwyg p { margin: 0.35em 0; }
            .blog-wysiwyg ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
            .blog-wysiwyg ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
            .blog-wysiwyg blockquote { border-left: 3px solid hsl(var(--primary)); padding-left: 0.8em; margin: 0.5em 0; color: hsl(var(--muted-foreground)); font-style: italic; }
            .blog-wysiwyg code { background: hsl(var(--secondary)); padding: 0.1em 0.35em; border-radius: 0.35em; font-size: 0.9em; font-family: ui-monospace, monospace; }
            .blog-wysiwyg a { color: hsl(var(--primary)); text-decoration: underline; }
          `}</style>

          {/* Input invisível de arquivo */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Toolbar Superior */}
          <div className="flex items-center justify-between p-2 border-b bg-secondary/20 rounded-t-2xl">
            <div className="flex items-center gap-1 flex-wrap">
              {toolbarItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-secondary hover:text-blue-500 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={item.action}
                    >
                      <item.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Cor do texto */}
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-secondary hover:text-blue-500 transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); saveSelection() }}
                      onClick={() => setShowColors((v) => !v)}
                    >
                      <Baseline className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Cor do texto</p></TooltipContent>
                </Tooltip>

                {showColors && (
                  <div
                    className="absolute z-50 top-9 left-0 p-2 rounded-xl border border-border bg-card shadow-xl"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="grid grid-cols-5 gap-1.5">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => applyColor(c)}
                          className="w-5 h-5 rounded-md border border-black/10 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground cursor-pointer">
                      <input
                        type="color"
                        defaultValue="#3b82f6"
                        onChange={(e) => applyColor(e.target.value)}
                        className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
                      />
                      Cor personalizada
                    </label>
                  </div>
                )}
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-rose-500/10"
                  onClick={handleClear}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Limpar texto</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Campo Principal do Editor (WYSIWYG) */}
          <div className="p-2 flex-grow">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              data-placeholder={placeholder}
              onInput={handleInput}
              onBlur={handleInput}
              onPaste={handlePaste}
              className="blog-wysiwyg w-full min-h-[140px] max-h-[350px] overflow-y-auto rounded-md p-3 text-sm leading-relaxed"
            />
          </div>

          {/* Anexos Pré-visualizados */}
          {attachments.length > 0 && (
            <div className="px-4 pb-3 border-t pt-3 bg-secondary/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <AnimatePresence>
                  {attachments.map((att) => (
                    <motion.div
                      key={att.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="relative group"
                    >
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center relative">
                        {att.fileType === "image" && att.thumbnailUrl ? (
                          <img
                            src={att.thumbnailUrl}
                            alt={att.fileName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Paperclip className="h-6 w-6 text-muted-foreground" />
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[90%]">
                          {att.fileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-1 text-destructive hover:bg-rose-500 hover:text-white transition-all shadow-md"
                        aria-label="Remover anexo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Barra Inferior de Ações */}
          <div className="flex items-center justify-between p-2 border-t bg-secondary/10 rounded-b-2xl">
            <div className="flex items-center gap-1">
              {actionItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-secondary hover:text-blue-500 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={item.action}
                    >
                      <item.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {showSendButton && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="button" onClick={handleSend} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  Publicar
                  <CornerDownLeft className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }
)

ComposerInput.displayName = "ComposerInput"

export { ComposerInput }
