// src/components/ThemeToggle.tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { motion, AnimatePresence } from "framer-motion"

interface ThemeToggleProps {
  compact?: boolean // compact = just icon button, no track
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="w-9 h-9 rounded-xl flex items-center justify-center
          bg-white/10 hover:bg-white/20 border border-white/20
          dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700
          text-white dark:text-slate-300
          transition-all duration-200"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.span>
        </AnimatePresence>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Mode Terang" : "Mode Gelap"}
      className={`
        relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none
        ${isDark ? "bg-indigo-600" : "bg-slate-300"}
      `}
    >
      {/* Track icons */}
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-400">
        <Sun size={12} />
      </span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-indigo-200">
        <Moon size={12} />
      </span>

      {/* Thumb */}
      <motion.div
        animate={{ x: isDark ? 28 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            {isDark
              ? <Moon size={11} className="text-indigo-600" />
              : <Sun size={11} className="text-amber-500" />
            }
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
