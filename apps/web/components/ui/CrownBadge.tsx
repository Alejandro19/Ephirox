import { IconCrown } from "./icons";

// Insignia de "módulo incluido en tu membresía pero vencido" — círculo dorado
// con la corona adentro. Versión definitiva: topbar en 14px/8px, cards del
// home en 26px/15px — mismo componente, solo cambia el tamaño vía props.
export function CrownBadge({ circleSize, iconSize }: { circleSize: number; iconSize: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: circleSize,
        height: circleSize,
        borderRadius: "50%",
        background: "#C9A66B",
        color: "#1A1712",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    >
      <IconCrown size={iconSize} />
    </span>
  );
}
