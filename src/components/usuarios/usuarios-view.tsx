"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  crearUsuarioAction,
  editarUsuarioAction,
  resetearPasswordUsuarioAction,
} from "@/actions/gestion.actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CampoFormulario } from "@/components/shared/form-field";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaActivo,
  InsigniaRol,
} from "@/components/shared/status-badges";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormAction } from "@/hooks/use-form-action";
import { formatFecha } from "@/lib/format";
import type { PaginatedResponse } from "@/lib/schemas/common";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
} from "@/lib/schemas/usuarios";
import type { UsuarioDTO } from "@/services/usuarios.service";

export function UsuariosView({
  currentUserId,
  usuariosPage,
  filtros,
}: {
  currentUserId: number;
  usuariosPage: PaginatedResponse<UsuarioDTO>;
  filtros: { q: string; activo: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(filtros.q);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioDTO | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"admin" | "vendedor">("vendedor");
  const [password, setPassword] = useState("");

  const [toggleTarget, setToggleTarget] = useState<UsuarioDTO | null>(null);
  const [toggling, setToggling] = useState(false);

  const [resetTarget, setResetTarget] = useState<UsuarioDTO | null>(null);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSearchText(filtros.q);
  }, [filtros.q]);

  useEffect(() => {
    if (formOpen) {
      setNombre(editing?.nombre ?? "");
      setEmail(editing?.email ?? "");
      setRol(editing?.rol ?? "vendedor");
      setPassword("");
    }
  }, [formOpen, editing]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (searchText === filtros.q) return;
    const t = setTimeout(() => {
      updateParams({ q: searchText.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: editing ? editarUsuarioSchema : crearUsuarioSchema,
    action: (data) =>
      editing ? editarUsuarioAction(editing.id, data) : crearUsuarioAction(data),
    successMessage: editing
      ? "Usuario actualizado."
      : "Usuario creado correctamente.",
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      await submit({ nombre, email, rol });
    } else {
      await submit({ nombre, email, rol, password });
    }
  }

  async function handleToggle(u: UsuarioDTO) {
    setToggling(true);
    const res = await editarUsuarioAction(u.id, { activo: !u.activo });
    setToggling(false);
    if (!res.ok) {
      toast.error(res.error.message);
      setToggleTarget(null);
      return;
    }
    toast.success(u.activo ? "Usuario desactivado." : "Usuario reactivado.");
    setToggleTarget(null);
    router.refresh();
  }

  async function handleReset(u: UsuarioDTO) {
    setResetting(true);
    const res = await resetearPasswordUsuarioAction(u.id);
    setResetting(false);
    if (!res.ok) {
      toast.error(res.error.message);
      setResetTarget(null);
      return;
    }
    setTempPassword(res.data.passwordTemporal);
    setCopied(false);
    toast.success("Contraseña restablecida.");
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Usuarios"
        subtitulo="Quiénes pueden entrar al sistema y con qué rol."
        acciones={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80">
          <div className="relative flex-1 min-w-[210px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Nombre o email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filtros.activo || "todos"}
            onValueChange={(v) =>
              updateParams({ activo: v === "todos" ? null : v, page: null })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usuariosPage.data.length === 0 ? (
          <EstadoVacio
            titulo="No encontramos usuarios"
            descripcion="Probá cambiando la búsqueda o el filtro de estado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosPage.data.map((u) => {
                const esVos = u.id === currentUserId;
                return (
                  <TableRow
                    key={u.id}
                    className={!u.activo ? "text-muted-foreground" : undefined}
                  >
                    <TableCell className="font-medium">
                      <span>{u.nombre}</span>
                      {esVos && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (vos)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <InsigniaRol rol={u.rol} />
                    </TableCell>
                    <TableCell>
                      <InsigniaActivo activo={u.activo} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatFecha(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(u);
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
                          onClick={() => {
                            setResetTarget(u);
                            setTempPassword(null);
                          }}
                        >
                          <KeyRound className="size-3.5" />
                          Restablecer
                        </Button>
                        {!esVos && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleTarget(u)}
                          >
                            {u.activo ? (
                              <>
                                <UserX className="size-3.5" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="size-3.5" />
                                Reactivar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Paginador
          page={usuariosPage.page}
          pageSize={usuariosPage.pageSize}
          total={usuariosPage.total}
          etiqueta="usuarios"
        />
      </Card>

      {/* Modal Nuevo / Editar usuario */}
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
              {editing ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Los cambios de rol se aplican en el próximo pedido del usuario."
                : "Comunicale la contraseña temporal; la puede cambiar desde su perfil."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <CampoFormulario
              id="usr-nombre"
              label="Nombre"
              error={fieldErrors.nombre}
            >
              <Input
                id="usr-nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  clearError("nombre");
                }}
                aria-invalid={Boolean(fieldErrors.nombre)}
              />
            </CampoFormulario>

            <CampoFormulario
              id="usr-email"
              label="Email"
              error={fieldErrors.email}
            >
              <Input
                id="usr-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </CampoFormulario>

            <CampoFormulario id="usr-rol" label="Rol" error={fieldErrors.rol}>
              <Select
                value={rol}
                onValueChange={(v) => setRol(v as "admin" | "vendedor")}
                disabled={editing?.id === currentUserId}
              >
                <SelectTrigger id="usr-rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </CampoFormulario>

            {!editing && (
              <CampoFormulario
                id="usr-password"
                label="Contraseña temporal"
                ayuda="Al menos 8 caracteres."
                error={fieldErrors.password}
              >
                <Input
                  id="usr-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </CampoFormulario>
            )}

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

      {/* Confirmación desactivar/reactivar */}
      {toggleTarget && (
        <ConfirmDialog
          open={Boolean(toggleTarget)}
          onOpenChange={(o) => {
            if (!o) setToggleTarget(null);
          }}
          titulo={
            toggleTarget.activo
              ? `¿Desactivar a ${toggleTarget.nombre}?`
              : `¿Reactivar a ${toggleTarget.nombre}?`
          }
          descripcion={
            toggleTarget.activo
              ? "El usuario perderá el acceso al sistema de inmediato, aunque conserve la sesión abierta."
              : "El usuario podrá volver a iniciar sesión con su cuenta."
          }
          textoConfirmar={toggleTarget.activo ? "Desactivar" : "Reactivar"}
          variante={toggleTarget.activo ? "destructive" : "default"}
          cargando={toggling}
          onConfirm={() => handleToggle(toggleTarget)}
        />
      )}

      {/* Modal restablecer contraseña */}
      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setTempPassword(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              {tempPassword
                ? `Nueva contraseña temporal para ${resetTarget?.nombre}. Se muestra una sola vez.`
                : `Se generará una nueva contraseña temporal para ${resetTarget?.nombre} (${resetTarget?.email}).`}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <code className="text-base font-mono font-semibold tracking-wider text-foreground">
                  {tempPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    setCopied(true);
                    toast.success("Copiada al portapapeles.");
                  }}
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copiada" : "Copiar"}
                </Button>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setTempPassword(null);
                  }}
                >
                  Listo
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetTarget(null)}
                disabled={resetting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => resetTarget && handleReset(resetTarget)}
                disabled={resetting}
              >
                {resetting ? "Generando..." : "Generar contraseña"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
