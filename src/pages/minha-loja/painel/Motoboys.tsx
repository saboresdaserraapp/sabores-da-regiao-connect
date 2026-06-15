import { useState } from "react";
import { useParams } from "react-router-dom";
import { useActiveEstablishment } from "@/contexts/ActiveEstablishmentContext";
import { canUseFeature, planLabelForFeature } from "@/lib/permissions";
import { Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PainelSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  UserPlus, 
  MessageCircle, 
  MoreHorizontal,
  Smartphone,
  Info
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function PainelMotoboys() {
  const { ctx } = useActiveEstablishment();
  const { establishmentId } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["delivery-drivers", establishmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("establishment_id", establishmentId!)
        .neq("status", "archived")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingDriver) {
        const { error } = await supabase
          .from("delivery_drivers")
          .update(formData)
          .eq("id", editingDriver.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("delivery_drivers")
          .insert([{ ...formData, establishment_id: establishmentId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
      toast.success(editingDriver ? "Motoboy atualizado" : "Motoboy cadastrado");
      setIsAddDialogOpen(false);
      setEditingDriver(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
      toast.success("Motoboy arquivado");
    },
  });

  const filteredDrivers = drivers?.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         d.whatsapp_phone.includes(searchTerm);
    const matchesNeighborhood = neighborhoodFilter === "all" || 
                                (d.neighborhood_coverage && d.neighborhood_coverage.toLowerCase().includes(neighborhoodFilter.toLowerCase()));
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    
    return matchesSearch && matchesNeighborhood && matchesStatus;
  });

  const uniqueNeighborhoods = Array.from(new Set(
    drivers?.map(d => d.neighborhood_coverage).filter(Boolean).flatMap(n => n.split(",").map((s: string) => s.trim()))
  )).sort();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      whatsapp_phone: formData.get("whatsapp_phone"),
      secondary_phone: formData.get("secondary_phone"),
      driver_type: formData.get("driver_type"),
      status: formData.get("status"),
      notes: formData.get("notes"),
      neighborhood_coverage: formData.get("neighborhood_coverage"),
    };
    saveMutation.mutate(data);
  };

  const canManageDrivers = canUseFeature(ctx, "delivery_drivers");

  if (!canManageDrivers) {
    return (
      <PainelSection
        title="Gestão de Motoboys"
        subtitle="Módulo de entregadores para sua logística."
      >
        <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/30 rounded-3xl border border-dashed border-border/50">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">Funcionalidade bloqueada</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-2">
            A gestão de motoboys está disponível a partir do plano <strong>{planLabelForFeature("delivery_drivers")}</strong>.
          </p>
          <Button className="mt-6" onClick={() => window.location.href = `/minha-loja/${establishmentId}/plano`}>
            Ver Planos
          </Button>
        </div>
      </PainelSection>
    );
  }

  return (
    <PainelSection
      title="Gestão de Motoboys"
      subtitle="Cadastre e gerencie os entregadores da sua loja para envio de referências."
      action={
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingDriver(null);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" /> Novo Motoboy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingDriver ? "Editar Motoboy" : "Cadastrar Motoboy"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input name="name" defaultValue={editingDriver?.name} placeholder="Ex: João Silva" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp</label>
                    <Input name="whatsapp_phone" defaultValue={editingDriver?.whatsapp_phone} placeholder="24999999999" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tel. Auxiliar</label>
                    <Input name="secondary_phone" defaultValue={editingDriver?.secondary_phone} placeholder="Opcional" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select name="driver_type" defaultValue={editingDriver?.driver_type || "own"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Próprio</SelectItem>
                        <SelectItem value="partner">Parceiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select name="status" defaultValue={editingDriver?.status || "active"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bairros de Atuação</label>
                  <Input name="neighborhood_coverage" defaultValue={editingDriver?.neighborhood_coverage} placeholder="Ex: Centro, Quitandinha, Bingen" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações Internas</label>
                  <Textarea name="notes" defaultValue={editingDriver?.notes} placeholder="Ex: Moto preta, atende apenas região central..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar Motoboy"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou telefone..." 
            className="pl-9 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={neighborhoodFilter} onValueChange={setNeighborhoodFilter}>
            <SelectTrigger className="w-full md:w-[160px] h-10">
              <SelectValue placeholder="Bairro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Bairros</SelectItem>
              {uniqueNeighborhoods.map(n => (
                <SelectItem key={n as string} value={n as string}>{n as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[130px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Motoboy</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Cobertura</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Carregando...</TableCell></TableRow>
            ) : filteredDrivers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum motoboy encontrado.</TableCell></TableRow>
            ) : filteredDrivers?.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <div className="font-medium">{driver.name}</div>
                  {driver.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{driver.notes}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Smartphone className="size-3 text-muted-foreground" />
                    {driver.whatsapp_phone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {driver.neighborhood_coverage || "Não informada"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {driver.driver_type === "own" ? "Próprio" : "Parceiro"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={driver.status === "active" ? "secondary" : "outline"} className={`text-[10px] uppercase font-bold tracking-wider ${driver.status === "active" ? "bg-green-100 text-green-700 border-green-200" : ""}`}>
                    {driver.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8"
                      onClick={() => {
                        setEditingDriver(driver);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Deseja realmente arquivar este motoboy?")) {
                          deleteMutation.mutate(driver.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-1">Dica de uso:</p>
          Ao cadastrar seus motoboys, você poderá selecionar o entregador responsável por cada pedido e enviar as referências visuais (fotos e vídeo da residência) diretamente para o WhatsApp dele com apenas um clique.
        </div>
      </div>
    </PainelSection>
  );
}
