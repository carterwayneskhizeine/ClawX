import * as React from "react"
import { cn } from "@/lib/utils"

// 预设 Emoji 图标列表（来自 ui-react-prod Home.tsx）
const PRESET_EMOJIS = [
    // 人物/职业
    '🤖', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔬', '👩‍🔬',
    '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️',
    '👮', '👷', '💂', '🕵️', '👼', '🎅',
    '👸', '🤴', '🦸', '🦹', '🧙', '🧚',
    // 科技/设备
    '📱', '💻', '🖥️', '⌨️', '🖱️', '💾',
    '📀', '💿', '📼', '📷', '📹', '🎥',
    '📞', '☎️', '📟', '📠', '📺', '📻',
    '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️',
    '⏰', '🕰️', '⌚', '📡', '🔋', '🔌',
    // 文件/办公
    '📊', '📈', '📉', '🗂️', '📁', '📋',
    '✉️', '📧', '📨', '📩', '📤', '📥',
    '📝', '✏️', '✒️', '🖋️', '🖊️', '🖌️',
    '📌', '📍', '📎', '🖇️', '📏', '📐',
    // 工具/维修
    '🔧', '🔨', '⚙️', '🛠️', '⛏️', '🔩',
    '🔗', '⛓️', '🧰', '🧲', '💎', '🔮',
    // 网络/通讯
    '🌐', '🌍', '🌎', '🌏', '🛰️', '📶',
    // 交通
    '🚀', '✈️', '🚄', '🚗', '🚕', '🚙',
    '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
    '🚐', '🚚', '🚛', '🚜', '🛴', '🚲',
    '🛵', '🏍️', '🛺', '🚤', '⛵', '🛳️',
    // 自然/天气
    '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️',
    '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄',
    '🌪️', '🌈', '☔', '⚡', '🌊', '💧',
    // 符号/状态
    '⭐', '🌟', '💫', '🔥', '💥', '⚡',
    '💡', '🔦', '🕯️', '📚', '📖', '📕',
    '📗', '📘', '📙', '📓', '📔', '📒',
    '🎯', '🏆', '🥇', '🥈', '🥉', '🎖️',
    '✅', '❌', '⚠️', '❓', '❗', '💯',
    '💢', '♨️', '💤', '💬', '🗨️', '💭',
    '🔔', '🔕', '📢', '📣', '🔊', '🔉',
    '🔈', '🔇', '🆗', '🆕', '🆙', '🆒',
    '🆓', '🆔', '🈶', '🈚', '🈸', '🈺',
    '🗿', '🗽', '🗼', '🏰', '🏯', '⛩️',
    // 食物
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉',
    '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🥑',
    '🍕', '🍔', '🍟', '🌭', '🥪', '🌮',
    '🥙', '🧆', '🍳', '🥘', '🍲', '🥣',
    // 动物
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
    '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    // 植物
    '🌸', '🌺', '🌻', '🌼', '🏵️', '🌹',
    '🥀', '🌷', '🌱', '🌿', '☘️', '🍀',
    '🍁', '🍂', '🍃', '🌾', '🌵', '🎋',
    '🎍', '🌴', '🌳', '🌲', '🎄', '🌰'
]

interface EmojiPickerProps {
    value: string
    onChange: (emoji: string) => void
    className?: string
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-accent transition-colors w-full"
                )}
            >
                <span className="text-2xl">{value}</span>
                <span className="text-sm text-muted-foreground">选择</span>
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-2 p-2 bg-background rounded-lg shadow-lg border w-[280px] max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                        {PRESET_EMOJIS.map((emoji, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => {
                                    onChange(emoji)
                                    setOpen(false)
                                }}
                                className={cn(
                                    "p-1.5 text-lg rounded hover:bg-accent transition-colors cursor-pointer",
                                    value === emoji && "bg-primary/10 ring-1 ring-primary"
                                )}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
