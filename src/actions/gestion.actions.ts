"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, withServerAction } from "@/lib/actions";
import * as facturasService from "@/services/facturas.service";
import * as usuariosService from "@/services/usuarios.service";

export async function anularFacturaAction(
  id: number,
  input: unknown
): Promise<ActionResult<facturasService.FacturaDetalleDTO>> {
  return withServerAction(async (user) => {
    const res = await facturasService.anularFactura(user, id, input);
    revalidatePath("/ventas");
    revalidatePath(`/ventas/${id}`);
    revalidatePath("/productos");
    revalidatePath("/clientes");
    revalidatePath("/");
    return res;
  });
}

export async function crearUsuarioAction(
  input: unknown
): Promise<ActionResult<usuariosService.UsuarioDTO>> {
  return withServerAction(async (user) => {
    const res = await usuariosService.crearUsuario(user, input);
    revalidatePath("/usuarios");
    return res;
  });
}

export async function editarUsuarioAction(
  id: number,
  input: unknown
): Promise<ActionResult<usuariosService.UsuarioDTO>> {
  return withServerAction(async (user) => {
    const res = await usuariosService.editarUsuario(user, id, input);
    revalidatePath("/usuarios");
    return res;
  });
}

export async function resetearPasswordUsuarioAction(
  id: number
): Promise<ActionResult<{ passwordTemporal: string }>> {
  return withServerAction(async (user) => {
    const res = await usuariosService.resetearPassword(user, id);
    return res;
  });
}
