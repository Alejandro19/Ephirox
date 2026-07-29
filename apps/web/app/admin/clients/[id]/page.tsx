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

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [anthropometrics, setAnthropometrics] = useState<AnthropometricRecord[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [inbodyRecords, setInbodyRecords] = useState<InbodyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPersonalInfo(clientId), getAnthropometrics(clientId), getPhotos(clientId), getInbodyRecords(clientId)])
      .then(([info, records, photoList, inbody]) => {
        setPersonalInfo(info);
        setAnthropometrics(records);
        setPhotos(photoList);
        setInbodyRecords(inbody);
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
