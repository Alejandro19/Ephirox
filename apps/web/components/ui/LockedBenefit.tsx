"use client";

import type { ReactNode } from "react";
import LockedOverlay from "./LockedOverlay";
import { COACH_WHATSAPP_NUMBER } from "../../lib/constants";

type LockedBenefitProps = {
  // apply: cuenta inactive (solicitud de membresía sin aprobar). upgrade:
  // cuenta active pero el tipo de cliente no alcanza el nivel requerido.
  variant: "apply" | "upgrade";
  benefit: string;
  // Solo tiene sentido en variant="upgrade" cuando hay UN único nivel que
  // alcanza (ej. "Club Elite"). Si cualquiera de varios niveles sirve, se
  // omite y el título queda genérico ("una membresía superior").
  requiredLevel?: string;
  children?: ReactNode;
};

export default function LockedBenefit({ variant, benefit, requiredLevel, children }: LockedBenefitProps) {
  const backdrop = children ?? <div style={{ minHeight: 200 }} />;

  if (variant === "apply") {
    return (
      <LockedOverlay
        title="Beneficio exclusivo del Club"
        subtitle={`Solicita tu membresía para desbloquear ${benefit} y más.`}
        ctaLabel="Solicita tu membresía"
        onCta={() => {
          window.location.href = "/login?view=premium";
        }}
      >
        {backdrop}
      </LockedOverlay>
    );
  }

  return (
    <LockedOverlay
      title={`Beneficio exclusivo de ${requiredLevel || "una membresía superior"}`}
      subtitle={`Sube de categoría en tu membresía para desbloquear ${benefit} y más.`}
      ctaLabel="Sube de categoría"
      onCta={() => window.open(`https://wa.me/${COACH_WHATSAPP_NUMBER}`, "_blank")}
    >
      {backdrop}
    </LockedOverlay>
  );
}
