import { Toaster as Sonner } from "sonner"
import { useActiveTheme } from "@/features/settings/hooks/useTheme"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useActiveTheme()
  return (
    <Sonner
      theme={mode}
      className="toaster group"
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
