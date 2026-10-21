import { CircleCheck, Hourglass } from 'lucide-react';

export default function Insignia({ estado }) {
  if (estado === 'vigente') {
    return (
      <span className="insignia insignia--verificado">
        <CircleCheck size={14} aria-hidden="true" /> Verificado
      </span>
    );
  }
  return (
    <span className="insignia insignia--revision">
      <Hourglass size={14} aria-hidden="true" /> En revisión
    </span>
  );
}
