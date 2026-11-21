"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, withServerAction } from "@/lib/actions";
import * as clientesService from "@/services/clientes.service";
import * as pagosService from "@/services/pagos.service";

export async function crearClienteAction(
  input: unknown
): Promise<ActionResult<clientesService.ClienteDTO>> {
  return withServerAction(async (user) => {
    const res = await clientesService.crearCliente(user, input);
    revalidatePath("/clientes");
    revalidatePath("/clientes/saldos");
    return res;
  });
}

export async function editarClienteAction(
  id: number,
  input: unknown
): Promise<ActionResult<clientesService.ClienteDTO>> {
  return withServerAction(async (user) => {
    const res = await clientesService.editarCliente(user, id, input);
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes/saldos");
    return res;
  });
}

export async function registrarPagoAction(
  clienteId: number,
  input: unknown
): Promise<ActionResult<pagosService.PagoDTO>> {
  return withServerAction(async (user) => {
    const res = await pagosService.registrarPago(user, clienteId, input);
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes/saldos");
    revalidatePath("/");
    return res;
  });
}
