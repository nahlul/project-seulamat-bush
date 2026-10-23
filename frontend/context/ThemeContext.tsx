// src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  isDark: false,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Cek localStorage dulu
    const saved = localStorage.getItem("theme")
    if (saved === "dark") return "dark"
    if (saved === "light") return "light"
    // Kalau belum pernah set, default = LIGHT (bukan ikut sistem)
    return "light"
  })

  useEffect(() => {
    const root = document.documentElement
    // Hapus dulu, baru tambah — biar ga konflik
    root.classList.remove("dark", "light")
    if (theme === "dark") {
      root.classList.add("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  // Jalankan sekali saat mount untuk sync state dengan DOM
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)