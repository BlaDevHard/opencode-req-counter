// opencode-req-counter — contador de REQUISIÇÕES no rodapé da TUI do
// OpenCode, ao lado do monitor nativo de tokens.
//
// Registra nos DOIS rodapés: home.footer.status (tela inicial) e
// prompt.footer.status (dentro da sessão, ao lado de "7.7K (6%)" — o
// monitor de tokens/contexto), compartilhando o mesmo contador.
//
// Dois modos:
//
//   1) NATIVO (padrão, zero configuração): conta cada chamada de API ao
//      modelo via evento session.usage.updated — validado 1:1 contra o
//      log de um proxy local (3 eventos = 3 linhas de requisição).
//      Contador diário persistente, com sync entre instâncias da TUI.
//
//   2) LOG (opcional): conta linhas de HOJE em um arquivo de log de um
//      proxy local (ex.: free-router), para quem quer medir o que
//      realmente saiu na rede.
//
// Exemplo no cli.json:
//
//   { "plugins": [ "opencode-req-counter" ] }
//
//   { "plugins": [ { "package": "opencode-req-counter",
//                    "options": { "log": { "path": "~/.local/state/free-router.log",
//                                          "pattern": "^\\[([0-9-]{10})\\] usando " } } } ] }
import { Plugin } from "@opencode/plugin/tui"
import { createSignal } from "solid-js"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

interface LogOptions {
  /** Arquivo de log a contar (obrigatório para ativar o modo log). */
  path: string
  /**
   * Regex com UM grupo de captura = data (YYYY-MM-DD). Só contam as
   * linhas cuja data capturada é a de hoje. Padrão: linha iniciada
   * por "[YYYY-MM-DD" (formato de timestamp mais comum).
   */
  pattern?: string
}

interface Options {
  /** Rótulo antes do número. Padrão: "req". */
  label?: string
  /** Modo log: conta linhas de um proxy local em vez dos eventos nativos. */
  log?: LogOptions
}

/** Data de hoje (YYYY-MM-DD, horário local). */
function hoje(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const PADRAO_LOG = "^\\[([0-9]{4}-[0-9]{2}-[0-9]{2})"

/** Conta as linhas de hoje em um log. 0 se arquivo/regex falharem. */
function contarLog(caminho: string, padrao: string): number {
  let texto: string
  try {
    texto = readFileSync(caminho, "utf8")
  } catch {
    return 0 // arquivo ausente (proxy ainda não rodou, ou rotacionou)
  }
  let re: RegExp
  try {
    re = new RegExp(padrao)
  } catch {
    return 0
  }
  const dia = hoje()
  let n = 0
  for (const linha of texto.split("\n")) {
    const m = re.exec(linha)
    if (m && m[1] === dia) n++
  }
  return n
}

export default Plugin.define({
  id: "opencode-req-counter",
  setup(context) {
    const options = (context.options ?? {}) as Options
    const label = options.label ?? "req"

    let conteudo: () => unknown
    let limpar: () => void

    // ---------- modo LOG ----------
    if (options.log?.path) {
      const caminho = options.log.path.startsWith("~")
        ? join(homedir(), options.log.path.slice(1))
        : options.log.path
      const padrao = options.log.pattern ?? PADRAO_LOG

      const [contagem, setContagem] = createSignal(contarLog(caminho, padrao))
      const timer = setInterval(() => setContagem(contarLog(caminho, padrao)), 15_000)
      conteudo = () => (
        <text>
          {label}: {contagem()}
        </text>
      )
      limpar = () => clearInterval(timer)
    } else {
      // ---------- modo NATIVO ----------
      // Contador diário persistente (sobrevive a restart, sincroniza entre
      // instâncias da TUI). Vira 0 sozinho na virada do dia.
      const [estado, setEstado] = context.storage.store<{ date: string; count: number }>("counter", {
        initial: { date: hoje(), count: 0 },
      })

      // Uma requisição LLM = um session.usage.updated (validado contra log
      // real de proxy: 3 eventos = 3 requisições). Escuta global, não só da
      // sessão visível — subagentes e outras sessões contam.
      const stop = context.data.listen(({ details }) => {
        if (details.type !== "session.usage.updated") return
        setEstado((rascunho) => {
          if (rascunho.date !== hoje()) {
            rascunho.date = hoje()
            rascunho.count = 0
          }
          rascunho.count += 1
        })
      })
      // storage.store devolve um store (objeto acessível direto, estilo
      // Solid store) — não um signal chamável. Acesso defensivo para
      // funcionar em ambas as formas.
      conteudo = () => {
        const est = estado as any
        const valor = typeof est === "function" ? est() : est
        return (
          <text>
            {label}: {valor?.date === hoje() ? valor?.count : 0}
          </text>
        )
      }
      limpar = stop
    }

    // Nos DOIS rodapés: home (tela inicial) e prompt (dentro da sessão,
    // ao lado do monitor de tokens) — mesmo contador, dois slots.
    const slotHome = context.ui.slot({ append: "home.footer.status", render: conteudo })
    const slotPrompt = context.ui.slot({ append: "prompt.footer.status", render: conteudo })

    return () => {
      limpar()
      slotHome()
      slotPrompt()
    }
  },
})
