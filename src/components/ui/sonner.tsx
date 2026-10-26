import { Toaster as Sonner } from "sonner"
import { useActiveTheme } from "@/features/settings/hooks/useTheme"
import { useStageOn } from "@/features/gamification/celebration"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useActiveTheme()
  // Toasts already up when the rank-up sequence opens stay out of sight under it (new ones wait: afterStage)
  const stage = useStageOn()
  return (
    <Sonner
      theme={mode}
      className={stage ? "toaster group invisible" : "toaster group"}
      toastOptions={{
        classNames: {
          // pointer-events-auto: an open dialog switches them off for everything outside it
          toast:
            "group toast pointer-events-auto group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
