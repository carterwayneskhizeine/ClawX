/**
 * Binding Terminal Log Component
 * Displays command execution logs in a terminal-like UI
 */
import { useRef, useEffect } from 'react'
import { Terminal } from 'lucide-react'

interface BindingTerminalLogProps {
    log: string
    maxHeight?: number
}

export function BindingTerminalLog({ log, maxHeight = 160 }: BindingTerminalLogProps) {
    const scrollRef = useRef<HTMLPreElement>(null)

    // Auto-scroll to bottom when log updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [log])

    // Strip ANSI escape codes for clean display
    const cleanLog = log.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')

    return (
        <div className="mt-4 rounded-lg overflow-hidden border border-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">执行日志</span>
            </div>
            <pre
                ref={scrollRef}
                className="p-3 bg-[#0d0d0d] text-[#4CAF50] font-mono text-xs overflow-y-auto"
                style={{ maxHeight, margin: 0 }}
            >
                {cleanLog || '> 等待执行...'}
            </pre>
        </div>
    )
}
