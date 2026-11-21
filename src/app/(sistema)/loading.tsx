import { Apilar } from "@/components/layout/primitives";
import {
  EstadoCargandoTabla,
  EstadoCargandoTarjetas,
} from "@/components/shared/states";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <Apilar gap="lg">
      <EstadoCargandoTarjetas cantidad={4} />
      <Card>
        <EstadoCargandoTabla filas={6} />
      </Card>
    </Apilar>
  );
}
