'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { listEvents, createEvent, updateEvent, deleteEvent, uploadEventImage, type CommunityEvent } from '../../lib/events-client';
import { listTherapies, createTherapy, updateTherapy, deleteTherapy, uploadTherapyImage, type CommunityTherapy } from '../../lib/therapies-client';
import { listRetreats, createRetreat, updateRetreat, deleteRetreat, uploadRetreatImage, type CommunityRetreat } from '../../lib/retreats-client';
import { getConfirmedReservations, type EventReservation, type TherapyReservation, type RetreatReservation } from '../../lib/community-reservations-client';
import { formatEventDateTime } from '../../lib/community-logic';
import { showToast } from '../layout/AppShell';
import Accordion from '../ui/Accordion';
import EmptyState from '../ui/EmptyState';
import LockedBenefit from '../ui/LockedBenefit';
import ImageField from '../ui/ImageField';
import { TherapyCard, RetreatCard } from './CommunityVisuals';

const cardStyle: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-card)', padding: '22px 24px', marginBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--ink-secondary)', marginBottom: 4,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 32, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-input)',
  padding: '0 2px 6px', fontSize: 14.5, fontWeight: 600, background: 'transparent', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};
const textareaStyle: React.CSSProperties = {
  width: '100%', borderRadius: 10, border: '1px solid var(--border-hairline)',
  padding: 10, fontSize: 14.5, fontWeight: 600, background: 'var(--paper)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box', minHeight: 72, resize: 'vertical', fontFamily: 'inherit',
};
const primaryButtonStyle: React.CSSProperties = {
  height: 40, padding: '0 22px', borderRadius: 9999, border: 'none',
  background: 'var(--ring-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const ghostButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 9999, border: '1px solid var(--border-hairline)',
  background: 'transparent', color: 'var(--ink-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const dangerButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 9999, border: '1px solid var(--danger)',
  background: 'transparent', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
};
function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    height: 38, padding: '0 20px', borderRadius: 9999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--border-hairline)',
    background: active ? 'var(--ring-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--ink-secondary)',
  };
}
function segmentButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, height: 36, borderRadius: 9999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--border-hairline)',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? '#fff' : 'var(--ink-secondary)',
  };
}

const PREVIEW_TYPES: { key: string; label: string }[] = [
  { key: 'coaching_1_1', label: 'Coaching 1:1' },
  { key: 'coaching_online', label: 'Coaching Online' },
  { key: 'lead_wellness', label: 'Lead Wellness' },
];

function PublishedRow({
  title, badge, meta, active, onToggleActive, onDelete, onEdit,
}: {
  title: string; badge?: React.ReactNode; meta: string; active: boolean; onToggleActive: () => void; onDelete: () => void; onEdit?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--border-hairline)', opacity: active ? 1 : 0.5 }}>
      <div style={{ flex: 1 }}>
        <strong>{title}</strong> {badge}
        <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>{meta}</div>
      </div>
      {onEdit && (
        <button type="button" style={ghostButtonStyle} onClick={onEdit}>
          Editar
        </button>
      )}
      <button type="button" style={ghostButtonStyle} onClick={onToggleActive}>
        {active ? 'Desactivar' : 'Activar'}
      </button>
      <button type="button" style={dangerButtonStyle} onClick={onDelete}>
        Eliminar
      </button>
    </div>
  );
}

function ReservationAccordionSection({
  title, groups, dateOrMeta,
}: {
  title: string;
  groups: { key: string; heading: string; meta: string; rows: { name: string; phone: string | null }[] }[];
  dateOrMeta?: never;
}) {
  void dateOrMeta;
  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>{title}</h3>
      {groups.length === 0 ? (
        <EmptyState message={`Sin reservas de ${title.toLowerCase()}.`} />
      ) : (
        <Accordion
          items={groups.map((g) => ({
            header: (
              <span>
                {g.heading} <span style={{ color: 'var(--ink-secondary)', fontWeight: 400 }}>— {g.rows.length} reserva{g.rows.length === 1 ? '' : 's'}</span>
              </span>
            ),
            content: (
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 10 }}>{g.meta}</div>
                {g.rows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < g.rows.length - 1 ? '1px solid var(--border-hairline)' : 'none' }}>
                    <strong>{r.name}</strong>
                    <span style={{ color: 'var(--ink-secondary)', fontSize: 13 }}>{r.phone || 'Sin celular registrado'}</span>
                  </div>
                ))}
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}

// Convierte un ISO ("2026-07-21T16:30:00.000Z") al formato que espera un
// input datetime-local ("2026-07-21T16:30"), en hora local del navegador.
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Igual que arriba pero para un input type="date" (sin hora) — usado en el
// formulario de Retiros.
function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function groupReservations<T extends { name: string; phone: string | null }>(
  rows: Array<T & Record<string, unknown>>,
  idKey: string,
  headingKey: string,
  metaFn: (first: T & Record<string, unknown>) => string
) {
  const groups = new Map<string, (T & Record<string, unknown>)[]>();
  for (const r of rows) {
    const key = (r[idKey] as string) || 'sin-id';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    heading: String(group[0][headingKey] ?? ''),
    meta: metaFn(group[0]),
    rows: group.map((r) => ({ name: r.name, phone: r.phone })),
  }));
}

export function AdminCommunityPanel() {
  const [tab, setTab] = useState<'gestion' | 'reservas'>('gestion');
  const [newType, setNewType] = useState<'event' | 'therapy' | 'retreat'>('event');
  const [previewType, setPreviewType] = useState<string>('coaching_1_1');

  const { data: bundle, error: bundleError, isLoading: loading, mutate: refetch } = useSWR('community-admin-bundle', async () => {
    const [eventsList, therapiesList, retreatsList] = await Promise.all([listEvents(), listTherapies(), listRetreats()]);
    return { events: eventsList, therapies: therapiesList, retreats: retreatsList };
  });
  const events = bundle?.events ?? [];
  const therapies = bundle?.therapies ?? [];
  const retreats = bundle?.retreats ?? [];

  useEffect(() => {
    if (bundleError) showToast((bundleError as Error).message, 'error');
  }, [bundleError]);

  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evImage, setEvImage] = useState<File | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evEditTitle, setEvEditTitle] = useState('');
  const [evEditDate, setEvEditDate] = useState('');
  const [evEditLocation, setEvEditLocation] = useState('');
  const [evEditDesc, setEvEditDesc] = useState('');
  const [evEditImage, setEvEditImage] = useState<File | null>(null);
  const [savingEventEdit, setSavingEventEdit] = useState(false);

  const [thTitle, setThTitle] = useState('');
  const [thProvider, setThProvider] = useState('');
  const [thDiscount, setThDiscount] = useState('');
  const [thDesc, setThDesc] = useState('');
  const [thImage, setThImage] = useState<File | null>(null);

  const [editingTherapyId, setEditingTherapyId] = useState<string | null>(null);
  const [thEditTitle, setThEditTitle] = useState('');
  const [thEditProvider, setThEditProvider] = useState('');
  const [thEditDiscount, setThEditDiscount] = useState('');
  const [thEditDesc, setThEditDesc] = useState('');
  const [thEditImage, setThEditImage] = useState<File | null>(null);
  const [savingTherapyEdit, setSavingTherapyEdit] = useState(false);

  const [rtTitle, setRtTitle] = useState('');
  const [rtStartDate, setRtStartDate] = useState('');
  const [rtEndDate, setRtEndDate] = useState('');
  const [rtLocation, setRtLocation] = useState('');
  const [rtCapacity, setRtCapacity] = useState('');
  const [rtPrice, setRtPrice] = useState('');
  const [rtDesc, setRtDesc] = useState('');
  const [rtImage, setRtImage] = useState<File | null>(null);

  const [editingRetreatId, setEditingRetreatId] = useState<string | null>(null);
  const [rtEditTitle, setRtEditTitle] = useState('');
  const [rtEditStartDate, setRtEditStartDate] = useState('');
  const [rtEditEndDate, setRtEditEndDate] = useState('');
  const [rtEditLocation, setRtEditLocation] = useState('');
  const [rtEditCapacity, setRtEditCapacity] = useState('');
  const [rtEditPrice, setRtEditPrice] = useState('');
  const [rtEditDesc, setRtEditDesc] = useState('');
  const [rtEditImage, setRtEditImage] = useState<File | null>(null);
  const [savingRetreatEdit, setSavingRetreatEdit] = useState(false);

  // Las reservas solo se piden cuando el admin realmente abre la pestaña
  // "Reservas" (key null = SWR no hace fetch); una vez pedida queda en caché
  // como el resto, así que volver a esta pestaña no vuelve a pagar el viaje.
  const { data: reservations, error: reservationsError, isLoading: reservationsLoading } = useSWR(
    tab === 'reservas' ? 'community-admin-reservations' : null,
    getConfirmedReservations,
  );
  const eventReservations: EventReservation[] = reservations?.eventReservations ?? [];
  const therapyReservations: TherapyReservation[] = reservations?.therapyReservations ?? [];
  const retreatReservations: RetreatReservation[] = reservations?.retreatReservations ?? [];

  useEffect(() => {
    if (reservationsError) showToast((reservationsError as Error).message, 'error');
  }, [reservationsError]);

  async function handleCreateEvent() {
    if (!evTitle.trim()) return;
    try {
      const event = await createEvent({ title: evTitle.trim(), event_date: evDate || undefined, location: evLocation || undefined, description: evDesc || undefined });
      if (evImage) await uploadEventImage(event.id, evImage);
      setEvTitle('');
      setEvDate('');
      setEvLocation('');
      setEvDesc('');
      setEvImage(null);
      await refetch();
      showToast('Evento creado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleCreateTherapy() {
    if (!thTitle.trim()) return;
    try {
      const therapy = await createTherapy({ title: thTitle.trim(), provider: thProvider || undefined, discount_pct: thDiscount ? Number(thDiscount) : undefined, description: thDesc || undefined });
      if (thImage) await uploadTherapyImage(therapy.id, thImage);
      setThTitle('');
      setThProvider('');
      setThDiscount('');
      setThDesc('');
      setThImage(null);
      await refetch();
      showToast('Terapia creada.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleCreateRetreat() {
    if (!rtTitle.trim()) return;
    try {
      const retreat = await createRetreat({
        title: rtTitle.trim(),
        start_date: rtStartDate || undefined,
        end_date: rtEndDate || undefined,
        location: rtLocation || undefined,
        capacity: rtCapacity ? Number(rtCapacity) : undefined,
        price_cents: rtPrice ? Math.round(Number(rtPrice) * 100) : undefined,
        description: rtDesc || undefined,
      });
      if (rtImage) await uploadRetreatImage(retreat.id, rtImage);
      setRtTitle('');
      setRtStartDate('');
      setRtEndDate('');
      setRtLocation('');
      setRtCapacity('');
      setRtPrice('');
      setRtDesc('');
      setRtImage(null);
      await refetch();
      showToast('Retiro creado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  async function handleToggleEventActive(ev: CommunityEvent) {
    try {
      await updateEvent(ev.id, { active: ev.active === false });
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }
  async function handleDeleteEvent(id: string) {
    try {
      await deleteEvent(id);
      await refetch();
      showToast('Evento eliminado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  function startEditEvent(ev: CommunityEvent) {
    setEditingEventId(ev.id);
    setEvEditTitle(ev.title);
    setEvEditDate(toDatetimeLocalValue(ev.eventDate));
    setEvEditLocation(ev.location || '');
    setEvEditDesc(ev.description || '');
    setEvEditImage(null);
  }
  function cancelEditEvent() {
    setEditingEventId(null);
  }
  async function handleSaveEventEdit(id: string) {
    if (!evEditTitle.trim()) return;
    setSavingEventEdit(true);
    try {
      await updateEvent(id, {
        title: evEditTitle.trim(),
        event_date: evEditDate || undefined,
        location: evEditLocation || undefined,
        description: evEditDesc || undefined,
      });
      if (evEditImage) await uploadEventImage(id, evEditImage);
      setEditingEventId(null);
      await refetch();
      showToast('Evento actualizado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSavingEventEdit(false);
    }
  }
  async function handleToggleTherapyActive(t: CommunityTherapy) {
    try {
      await updateTherapy(t.id, { active: t.active === false });
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }
  async function handleDeleteTherapy(id: string) {
    try {
      await deleteTherapy(id);
      await refetch();
      showToast('Terapia eliminada.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  function startEditTherapy(t: CommunityTherapy) {
    setEditingTherapyId(t.id);
    setThEditTitle(t.title);
    setThEditProvider(t.provider || '');
    setThEditDiscount(t.discountPct != null ? String(t.discountPct) : '');
    setThEditDesc(t.description || '');
    setThEditImage(null);
  }
  function cancelEditTherapy() {
    setEditingTherapyId(null);
  }
  async function handleSaveTherapyEdit(id: string) {
    if (!thEditTitle.trim()) return;
    setSavingTherapyEdit(true);
    try {
      await updateTherapy(id, {
        title: thEditTitle.trim(),
        provider: thEditProvider || undefined,
        discount_pct: thEditDiscount ? Number(thEditDiscount) : undefined,
        description: thEditDesc || undefined,
      });
      if (thEditImage) await uploadTherapyImage(id, thEditImage);
      setEditingTherapyId(null);
      await refetch();
      showToast('Terapia actualizada.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSavingTherapyEdit(false);
    }
  }

  async function handleToggleRetreatActive(r: CommunityRetreat) {
    try {
      await updateRetreat(r.id, { active: r.active === false });
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }
  async function handleDeleteRetreat(id: string) {
    try {
      await deleteRetreat(id);
      await refetch();
      showToast('Retiro eliminado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  function startEditRetreat(r: CommunityRetreat) {
    setEditingRetreatId(r.id);
    setRtEditTitle(r.title);
    setRtEditStartDate(toDateInputValue(r.startDate));
    setRtEditEndDate(toDateInputValue(r.endDate));
    setRtEditLocation(r.location || '');
    setRtEditCapacity(r.capacity != null ? String(r.capacity) : '');
    setRtEditPrice(r.priceCents != null ? String(r.priceCents / 100) : '');
    setRtEditDesc(r.description || '');
    setRtEditImage(null);
  }
  function cancelEditRetreat() {
    setEditingRetreatId(null);
  }
  async function handleSaveRetreatEdit(id: string) {
    if (!rtEditTitle.trim()) return;
    setSavingRetreatEdit(true);
    try {
      await updateRetreat(id, {
        title: rtEditTitle.trim(),
        start_date: rtEditStartDate || undefined,
        end_date: rtEditEndDate || undefined,
        location: rtEditLocation || undefined,
        capacity: rtEditCapacity ? Number(rtEditCapacity) : undefined,
        price_cents: rtEditPrice ? Math.round(Number(rtEditPrice) * 100) : undefined,
        description: rtEditDesc || undefined,
      });
      if (rtEditImage) await uploadRetreatImage(id, rtEditImage);
      setEditingRetreatId(null);
      await refetch();
      showToast('Retiro actualizado.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSavingRetreatEdit(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>Cargando el Club…</p>;

  const tabSwitcher = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
      <button type="button" style={tabButtonStyle(tab === 'gestion')} onClick={() => setTab('gestion')}>
        Gestión
      </button>
      <button type="button" style={tabButtonStyle(tab === 'reservas')} onClick={() => setTab('reservas')}>
        Reservas
      </button>
    </div>
  );

  if (tab === 'reservas') {
    const eventGroups = groupReservations(
      eventReservations.map((r) => ({ ...r, name: r.clientName, phone: r.clientPhone })),
      'eventId',
      'eventTitle',
      (first) => `${first.eventDate ? formatEventDateTime(first.eventDate as string) : 'Sin fecha'}${first.eventLocation ? ' · ' + first.eventLocation : ''}`
    );
    const therapyGroups = groupReservations(
      therapyReservations.map((r) => ({ ...r, name: r.clientName, phone: r.clientPhone })),
      'therapyId',
      'therapyTitle',
      (first) => `${first.therapyProvider || ''}${first.therapyDiscountPct ? ' · -' + first.therapyDiscountPct + '%' : ''}`
    );
    const retreatGroups = groupReservations(
      retreatReservations.map((r) => ({ ...r, name: r.clientName, phone: r.clientPhone })),
      'retreatId',
      'retreatTitle',
      (first) => {
        const dates = first.retreatStartDate
          ? `${formatEventDateTime(first.retreatStartDate as string)}${first.retreatEndDate ? ' – ' + formatEventDateTime(first.retreatEndDate as string) : ''}`
          : 'Sin fecha';
        return `${dates}${first.retreatLocation ? ' · ' + first.retreatLocation : ''}`;
      }
    );
    return (
      <div>
        {tabSwitcher}
        {reservationsLoading ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>Cargando reservas…</p>
        ) : (
          <>
            <ReservationAccordionSection title="Reservas de Eventos" groups={eventGroups} />
            <ReservationAccordionSection title="Reservas de Terapias" groups={therapyGroups} />
            <ReservationAccordionSection title="Reservas de Retiros" groups={retreatGroups} />
          </>
        )}
      </div>
    );
  }

  const previewUnlocked = previewType !== 'lead_wellness';

  return (
    <div>
      {tabSwitcher}

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Crear nuevo</h3>
        <div style={{ display: 'flex', gap: 8, maxWidth: 400, marginBottom: 16 }}>
          <button type="button" style={segmentButtonStyle(newType === 'event')} onClick={() => setNewType('event')}>
            Evento
          </button>
          <button type="button" style={segmentButtonStyle(newType === 'therapy')} onClick={() => setNewType('therapy')}>
            Terapia
          </button>
          <button type="button" style={segmentButtonStyle(newType === 'retreat')} onClick={() => setNewType('retreat')}>
            Retiro
          </button>
        </div>

        {newType === 'event' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="ev-new-title">Título</label>
                <input id="ev-new-title" style={fieldStyle} value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="ev-new-date">Fecha</label>
                <input id="ev-new-date" type="datetime-local" style={fieldStyle} value={evDate} onChange={(e) => setEvDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="ev-new-location">Lugar</label>
                <input id="ev-new-location" style={fieldStyle} value={evLocation} onChange={(e) => setEvLocation(e.target.value)} />
              </div>
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="ev-new-desc">Descripción</label>
            <textarea id="ev-new-desc" rows={2} style={textareaStyle} value={evDesc} onChange={(e) => setEvDesc(e.target.value)} />
            <div style={{ marginTop: 12, maxWidth: 320 }}>
              <ImageField id="ev-new-image" label="Foto (opcional)" onFileChange={setEvImage} />
            </div>
            <button type="button" style={{ ...primaryButtonStyle, marginTop: 16 }} onClick={handleCreateEvent}>
              Crear evento
            </button>
          </>
        ) : newType === 'therapy' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="th-new-title">Título</label>
                <input id="th-new-title" style={fieldStyle} value={thTitle} onChange={(e) => setThTitle(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="th-new-provider">Proveedor</label>
                <input id="th-new-provider" style={fieldStyle} value={thProvider} onChange={(e) => setThProvider(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="th-new-discount">Descuento (%)</label>
                <input id="th-new-discount" type="number" style={fieldStyle} value={thDiscount} onChange={(e) => setThDiscount(e.target.value)} />
              </div>
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="th-new-desc">Descripción</label>
            <textarea id="th-new-desc" rows={2} style={textareaStyle} value={thDesc} onChange={(e) => setThDesc(e.target.value)} />
            <div style={{ marginTop: 12, maxWidth: 320 }}>
              <ImageField id="th-new-image" label="Foto (opcional)" onFileChange={setThImage} />
            </div>
            <button type="button" style={{ ...primaryButtonStyle, marginTop: 16 }} onClick={handleCreateTherapy}>
              Crear terapia
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle} htmlFor="rt-new-title">Título</label>
                <input id="rt-new-title" style={fieldStyle} value={rtTitle} onChange={(e) => setRtTitle(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rt-new-start">Fecha inicio</label>
                <input id="rt-new-start" type="date" style={fieldStyle} value={rtStartDate} onChange={(e) => setRtStartDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rt-new-end">Fecha fin</label>
                <input id="rt-new-end" type="date" style={fieldStyle} value={rtEndDate} onChange={(e) => setRtEndDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rt-new-location">Lugar</label>
                <input id="rt-new-location" style={fieldStyle} value={rtLocation} onChange={(e) => setRtLocation(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rt-new-capacity">Cupos</label>
                <input id="rt-new-capacity" type="number" style={fieldStyle} value={rtCapacity} onChange={(e) => setRtCapacity(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="rt-new-price">Precio (opcional)</label>
                <input id="rt-new-price" type="number" style={fieldStyle} value={rtPrice} onChange={(e) => setRtPrice(e.target.value)} />
              </div>
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }} htmlFor="rt-new-desc">Descripción</label>
            <textarea id="rt-new-desc" rows={2} style={textareaStyle} value={rtDesc} onChange={(e) => setRtDesc(e.target.value)} />
            <div style={{ marginTop: 12, maxWidth: 320 }}>
              <ImageField id="rt-new-image" label="Foto (opcional)" onFileChange={setRtImage} />
            </div>
            <button type="button" style={{ ...primaryButtonStyle, marginTop: 16 }} onClick={handleCreateRetreat}>
              Crear retiro
            </button>
          </>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Eventos publicados</h3>
        {events.length === 0 ? (
          <EmptyState message="Sin eventos." />
        ) : (
          events.map((ev) =>
            editingEventId === ev.id ? (
              <div key={ev.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle} htmlFor={`ev-edit-title-${ev.id}`}>Título</label>
                    <input id={`ev-edit-title-${ev.id}`} style={fieldStyle} value={evEditTitle} onChange={(e) => setEvEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`ev-edit-date-${ev.id}`}>Fecha</label>
                    <input id={`ev-edit-date-${ev.id}`} type="datetime-local" style={fieldStyle} value={evEditDate} onChange={(e) => setEvEditDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`ev-edit-location-${ev.id}`}>Lugar</label>
                    <input id={`ev-edit-location-${ev.id}`} style={fieldStyle} value={evEditLocation} onChange={(e) => setEvEditLocation(e.target.value)} />
                  </div>
                </div>
                <label style={{ ...labelStyle, marginTop: 12 }} htmlFor={`ev-edit-desc-${ev.id}`}>Descripción</label>
                <textarea id={`ev-edit-desc-${ev.id}`} rows={2} style={textareaStyle} value={evEditDesc} onChange={(e) => setEvEditDesc(e.target.value)} />
                <div style={{ marginTop: 12, maxWidth: 320 }}>
                  <ImageField id={`ev-edit-image-${ev.id}`} label="Reemplazar foto (opcional)" onFileChange={setEvEditImage} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" disabled={savingEventEdit} style={{ ...primaryButtonStyle, opacity: savingEventEdit ? 0.6 : 1 }} onClick={() => handleSaveEventEdit(ev.id)}>
                    {savingEventEdit ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={cancelEditEvent}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <PublishedRow
                key={ev.id}
                title={ev.title}
                meta={`${ev.eventDate ? formatEventDateTime(ev.eventDate) : 'Sin fecha'}${ev.location ? ' · ' + ev.location : ''}`}
                active={ev.active !== false}
                onToggleActive={() => handleToggleEventActive(ev)}
                onDelete={() => handleDeleteEvent(ev.id)}
                onEdit={() => startEditEvent(ev)}
              />
            )
          )
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Terapias publicadas</h3>
        {therapies.length === 0 ? (
          <EmptyState message="Sin terapias." />
        ) : (
          therapies.map((t) =>
            editingTherapyId === t.id ? (
              <div key={t.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle} htmlFor={`th-edit-title-${t.id}`}>Título</label>
                    <input id={`th-edit-title-${t.id}`} style={fieldStyle} value={thEditTitle} onChange={(e) => setThEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`th-edit-provider-${t.id}`}>Proveedor</label>
                    <input id={`th-edit-provider-${t.id}`} style={fieldStyle} value={thEditProvider} onChange={(e) => setThEditProvider(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`th-edit-discount-${t.id}`}>Descuento (%)</label>
                    <input id={`th-edit-discount-${t.id}`} type="number" style={fieldStyle} value={thEditDiscount} onChange={(e) => setThEditDiscount(e.target.value)} />
                  </div>
                </div>
                <label style={{ ...labelStyle, marginTop: 12 }} htmlFor={`th-edit-desc-${t.id}`}>Descripción</label>
                <textarea id={`th-edit-desc-${t.id}`} rows={2} style={textareaStyle} value={thEditDesc} onChange={(e) => setThEditDesc(e.target.value)} />
                <div style={{ marginTop: 12, maxWidth: 320 }}>
                  <ImageField id={`th-edit-image-${t.id}`} label="Reemplazar foto (opcional)" onFileChange={setThEditImage} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" disabled={savingTherapyEdit} style={{ ...primaryButtonStyle, opacity: savingTherapyEdit ? 0.6 : 1 }} onClick={() => handleSaveTherapyEdit(t.id)}>
                    {savingTherapyEdit ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={cancelEditTherapy}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <PublishedRow
                key={t.id}
                title={t.title}
                badge={t.discountPct ? (
                  <span style={{ background: 'rgba(201,166,107,.14)', color: 'var(--ring-accent)', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    -{t.discountPct}%
                  </span>
                ) : undefined}
                meta={t.provider || ''}
                active={t.active !== false}
                onToggleActive={() => handleToggleTherapyActive(t)}
                onDelete={() => handleDeleteTherapy(t.id)}
                onEdit={() => startEditTherapy(t)}
              />
            )
          )
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Retiros publicados</h3>
        {retreats.length === 0 ? (
          <EmptyState message="Sin retiros." />
        ) : (
          retreats.map((r) =>
            editingRetreatId === r.id ? (
              <div key={r.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-title-${r.id}`}>Título</label>
                    <input id={`rt-edit-title-${r.id}`} style={fieldStyle} value={rtEditTitle} onChange={(e) => setRtEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-start-${r.id}`}>Fecha inicio</label>
                    <input id={`rt-edit-start-${r.id}`} type="date" style={fieldStyle} value={rtEditStartDate} onChange={(e) => setRtEditStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-end-${r.id}`}>Fecha fin</label>
                    <input id={`rt-edit-end-${r.id}`} type="date" style={fieldStyle} value={rtEditEndDate} onChange={(e) => setRtEditEndDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-location-${r.id}`}>Lugar</label>
                    <input id={`rt-edit-location-${r.id}`} style={fieldStyle} value={rtEditLocation} onChange={(e) => setRtEditLocation(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-capacity-${r.id}`}>Cupos</label>
                    <input id={`rt-edit-capacity-${r.id}`} type="number" style={fieldStyle} value={rtEditCapacity} onChange={(e) => setRtEditCapacity(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor={`rt-edit-price-${r.id}`}>Precio (opcional)</label>
                    <input id={`rt-edit-price-${r.id}`} type="number" style={fieldStyle} value={rtEditPrice} onChange={(e) => setRtEditPrice(e.target.value)} />
                  </div>
                </div>
                <label style={{ ...labelStyle, marginTop: 12 }} htmlFor={`rt-edit-desc-${r.id}`}>Descripción</label>
                <textarea id={`rt-edit-desc-${r.id}`} rows={2} style={textareaStyle} value={rtEditDesc} onChange={(e) => setRtEditDesc(e.target.value)} />
                <div style={{ marginTop: 12, maxWidth: 320 }}>
                  <ImageField id={`rt-edit-image-${r.id}`} label="Reemplazar foto (opcional)" onFileChange={setRtEditImage} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button type="button" disabled={savingRetreatEdit} style={{ ...primaryButtonStyle, opacity: savingRetreatEdit ? 0.6 : 1 }} onClick={() => handleSaveRetreatEdit(r.id)}>
                    {savingRetreatEdit ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={cancelEditRetreat}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <PublishedRow
                key={r.id}
                title={r.title}
                meta={`${r.startDate ? formatEventDateTime(r.startDate) : 'Sin fecha'}${r.endDate ? ' – ' + formatEventDateTime(r.endDate) : ''}${r.location ? ' · ' + r.location : ''}`}
                active={r.active !== false}
                onToggleActive={() => handleToggleRetreatActive(r)}
                onDelete={() => handleDeleteRetreat(r.id)}
                onEdit={() => startEditRetreat(r)}
              />
            )
          )
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Vista previa por tipo de cliente</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: '-8px 0 14px' }}>
          Eventos se ve igual para los 3 tipos, así que no cambia aquí. Esto es exactamente lo que un cliente vería hoy
          en las pestañas Terapias y Retiros, según su tipo — sin necesidad de entrar con otra cuenta.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {PREVIEW_TYPES.map((pt) => (
            <button key={pt.key} type="button" style={tabButtonStyle(previewType === pt.key)} onClick={() => setPreviewType(pt.key)}>
              {pt.label}
            </button>
          ))}
        </div>
        {previewUnlocked ? (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 10px' }}>Terapias</p>
            {therapies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                {therapies.map((t) => (
                  <TherapyCard key={t.id} therapy={t} />
                ))}
              </div>
            ) : (
              <EmptyState message="Sin terapias publicadas." />
            )}
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '20px 0 10px' }}>Retiros</p>
            {retreats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {retreats.map((r) => (
                  <RetreatCard key={r.id} retreat={r} />
                ))}
              </div>
            ) : (
              <EmptyState message="Sin retiros publicados." />
            )}
          </>
        ) : (
          <LockedBenefit variant="upgrade" benefit="descuentos reales en spa, terapia, fisioterapia, retiros">
            {therapies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {therapies.slice(0, 3).map((t) => (
                  <TherapyCard key={t.id} therapy={t} />
                ))}
              </div>
            ) : (
              <EmptyState message="Sin terapias publicadas." />
            )}
          </LockedBenefit>
        )}
      </div>
    </div>
  );
}
