'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getPersonalInfo,
  getAnthropometrics,
  getPhotos,
  getInbodyRecords,
  type PersonalInfo,
  type AnthropometricRecord,
  type ProgressPhoto,
  type InbodyRecord,
} from '../../../../lib/personal-info-client';
import { getAchievements, type Achievement } from '../../../../lib/training-client';
import { AdminExercisePanel } from '../../../../components/training/AdminExercisePanel';
import { AdminNutritionPanel } from '../../../../components/nutrition/AdminNutritionPanel';
import { AdminSupplementsPanel } from '../../../../components/supplements/AdminSupplementsPanel';
import { AdminCortisolPanel } from '../../../../components/cortisol/AdminCortisolPanel';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [anthropometrics, setAnthropometrics] = useState<AnthropometricRecord[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [inbodyRecords, setInbodyRecords] = useState<InbodyRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPersonalInfo(clientId),
      getAnthropometrics(clientId),
      getPhotos(clientId),
      getInbodyRecords(clientId),
      getAchievements(clientId),
    ])
      .then(([info, records, photoList, inbody, achievementList]) => {
        setPersonalInfo(info);
        setAnthropometrics(records);
        setPhotos(photoList);
        setInbodyRecords(inbody);
        setAchievements(achievementList);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p>Cargando detalle del cliente...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      <h1>Detalle del cliente</h1>

      <section>
        <h2>Perfil</h2>
        <p>
          <span>País:</span> <span>{personalInfo?.country || '—'}</span>
        </p>
        <p>
          <span>Ciudad:</span> <span>{personalInfo?.city || '—'}</span>
        </p>
        <p>
          <span>Peso:</span> <span>{personalInfo?.weight ?? '—'}</span>
        </p>
        <p>
          <span>Altura:</span> <span>{personalInfo?.height ?? '—'}</span>
        </p>
      </section>

      <section>
        <h2>Entrenamiento</h2>
        <AdminExercisePanel clientId={clientId} />
      </section>

      <section>
        <h2>Alimentación</h2>
        <AdminNutritionPanel clientId={clientId} />
      </section>

      <section>
        <h2>Suplementación</h2>
        <AdminSupplementsPanel clientId={clientId} />
      </section>

      <section>
        <h2>Gestión de Cortisol</h2>
        <AdminCortisolPanel clientId={clientId} />
      </section>

      <section>
        <h2>Logros</h2>
        {achievements.length === 0 ? (
          <p>Sin logros todavía.</p>
        ) : (
          <ul>
            {achievements.map((achievement) => (
              <li key={achievement.id}>
                <span>{achievement.type === 'medalla' ? '🎖️ Medalla' : '🏆 Copa'}</span> — <span>Semana {achievement.weekNumber}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Historial antropométrico</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso</th>
              <th>Cintura</th>
            </tr>
          </thead>
          <tbody>
            {anthropometrics.map((record) => (
              <tr key={record.id}>
                <td>{record.fecha}</td>
                <td>{record.peso ?? '—'}</td>
                <td>{record.cintura ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Fotos de progreso</h2>
        {photos.map((photo) => (
          <img key={photo.id} src={photo.photoUrl} alt={photo.angle || 'foto de progreso'} width={120} />
        ))}
      </section>

      <section>
        <h2>Registros InBody</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso total</th>
              <th>% Grasa</th>
            </tr>
          </thead>
          <tbody>
            {inbodyRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.fecha}</td>
                <td>{record.pesoTotal ?? '—'}</td>
                <td>{record.grasaPct ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
