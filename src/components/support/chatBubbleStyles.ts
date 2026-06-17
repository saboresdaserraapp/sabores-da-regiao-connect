import type { ActorRole } from "@/hooks/useSupportTickets";

export function roleLabel(role: ActorRole, mine: boolean): string {
  if (mine) return "Você";
  switch (role) {
    case "admin": return "Suporte";
    case "establishment": return "Loja";
    case "customer": return "Cliente";
    case "system": return "Sistema";
    default: return "";
  }
}

export function roleAlign(role: ActorRole, mine: boolean): string {
  if (role === "system") return "justify-center";
  return mine ? "justify-end" : "justify-start";
}

/** Distinct color per author so cliente / loja / suporte / sistema never blend. */
export function roleBubbleClass(role: ActorRole, mine: boolean): string {
  if (mine) return "bg-primary text-primary-foreground rounded-tr-sm shadow-sm";
  switch (role) {
    case "admin":
      return "bg-blue-100 text-blue-950 border border-blue-300 rounded-tl-sm shadow-sm dark:bg-blue-950/40 dark:text-blue-50 dark:border-blue-800";
    case "establishment":
      return "bg-amber-100 text-amber-950 border border-amber-300 rounded-tl-sm shadow-sm dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-800";
    case "customer":
      return "bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-tl-sm shadow-sm dark:bg-emerald-950/40 dark:text-emerald-50 dark:border-emerald-800";
    case "system":
      return "bg-muted text-muted-foreground italic";
    default:
      return "bg-background border";
  }
}