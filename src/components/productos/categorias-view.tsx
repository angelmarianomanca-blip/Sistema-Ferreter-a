"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  crearCategoriaAction,
  editarCategoriaAction,
} from "@/actions/productos.actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CampoFormulario } from "@/components/shared/form-field";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { EstadoVacio } from "@/components/shared/states";
import { InsigniaActivo } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormAction } from "@/hooks/use-form-action";
import {
  crearCategoriaSchema,
  editarCategoriaSchema,
} from "@/lib/schemas/categorias";
import type { CategoriaDTO } from "@/services/categorias.service";

export function CategoriasView({
  esAdmin,
  categorias,
}: {
  esAdmin: boolean;
  categorias: CategoriaDTO[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaDTO | null>(null);
  const [nombre, setNombre] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<CategoriaDTO | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (formOpen) {
      setNombre(editing?.nombre ?? "");
    }
  }, [formOpen, editing]);

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: editing ? editarCategoriaSchema : crearCategoriaSchema,
    action: (data) =>
      editing
        ? editarCategoriaAction(editing.id, data)
        : crearCategoriaAction(data),
    successMessage: editing
      ? "Categoría actualizada."
      : "Categoría creada correctamente.",
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({ nombre });
  }

  async function handleToggle(cat: CategoriaDTO) {
    setToggling(true);
    const res = await editarCategoriaAction(cat.id, { activa: !cat.activa });
    setToggling(false);
    if (!res.ok) {
      toast.error(res.error.message);
      setConfirmTarget(null);
      return;
    }
    toast.success(
      cat.activa ? "Categoría desactivada." : "Categoría activada."
    );
    setConfirmTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref="/productos"
        volverTexto="Productos"
        titulo="Categorías"
        subtitulo="Agrupan el catálogo para buscar y filtrar."
        acciones={
          esAdmin ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nueva categoría
            </Button>
          ) : undefined
        }
      />

      <Card>
        {categorias.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay categorías"
            descripcion="Creá una categoría para empezar a organizar el catálogo."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Productos activos</TableHead>
                <TableHead>Estado</TableHead>
                {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">
                    {c.nombre}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.productosActivos}
                  </TableCell>
                  <TableCell>
                    <InsigniaActivo activo={c.activa} femenino />
                  </TableCell>
                  {esAdmin && (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmTarget(c)}
                        >
                          {c.activa ? (
                            <>
                              <Trash2 className="size-3.5" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="size-3.5" />
                              Activar
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {esAdmin && (
        <>
          <Dialog
            open={formOpen}
            onOpenChange={(o) => {
              setFormOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Editar categoría" : "Nueva categoría"}
                </DialogTitle>
                <DialogDescription>
                  El nombre debe ser único dentro del catálogo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <CampoFormulario
                  id="cat-nombre"
                  label="Nombre"
                  error={fieldErrors.nombre}
                >
                  <Input
                    id="cat-nombre"
                    placeholder="Ej: Electricidad"
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      clearError("nombre");
                    }}
                    aria-invalid={Boolean(fieldErrors.nombre)}
                  />
                </CampoFormulario>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {confirmTarget && (
            <ConfirmDialog
              open={Boolean(confirmTarget)}
              onOpenChange={(o) => {
                if (!o) setConfirmTarget(null);
              }}
              titulo={
                confirmTarget.activa
                  ? `¿Desactivar "${confirmTarget.nombre}"?`
                  : `¿Activar "${confirmTarget.nombre}"?`
              }
              descripcion={
                confirmTarget.activa
                  ? "No se puede desactivar si tiene productos activos asignados."
                  : "La categoría volverá a estar disponible al crear o editar productos."
              }
              textoConfirmar={confirmTarget.activa ? "Desactivar" : "Activar"}
              variante={confirmTarget.activa ? "destructive" : "default"}
              cargando={toggling}
              onConfirm={() => handleToggle(confirmTarget)}
            />
          )}
        </>
      )}
    </div>
  );
}
