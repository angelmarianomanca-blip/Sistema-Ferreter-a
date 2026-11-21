import { CambiarPasswordForm } from "@/components/auth/cambiar-password-form";
import { Alinear, Apilar, Texto, Titulo } from "@/components/layout/primitives";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { InsigniaRol } from "@/components/shared/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requirePageUser();

  return (
    <Apilar gap="lg">
      <EncabezadoPagina titulo="Mi perfil" />

      <Card className="max-w-lg">
        <CardContent className="p-5">
          <Apilar gap="xs">
            <Titulo nivel={2}>{user.nombre}</Titulo>
            <Alinear gap="sm" wrap>
              <Texto tono="muted">{user.email}</Texto>
              <InsigniaRol rol={user.rol} />
            </Alinear>
          </Apilar>
        </CardContent>
      </Card>

      <CambiarPasswordForm />
    </Apilar>
  );
}
