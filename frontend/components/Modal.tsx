import { motion, AnimatePresence } from "framer-motion"

type ModalProps = {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export default function Modal({
  open,
  title,
  message,
  onClose,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* BACKDROP */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* MODAL BOX */}
          <motion.div
            className="relative w-[90%] max-w-sm bg-white rounded-xl shadow-xl p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h2 className="text-lg font-bold text-slate-800">
              {title}
            </h2>

            <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
              {message}
            </p>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700"
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
