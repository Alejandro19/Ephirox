'use client';

import { AdminMentorList } from '@/components/admin/AdminMentorList';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function AdminMentorsPage() {
  return (
    <div>
      <IdentityHeader title="Mentores" subtitle="Catálogo de mentores de performance — Stress, Workout, Nutrition y Sleep." />
      <AdminMentorList />
    </div>
  );
}
