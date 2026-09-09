'use client';

import { EnterpriseLeadsPanel } from '@/components/admin/EnterpriseLeadsPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function AdminLeadsPage() {
  return (
    <div>
      <IdentityHeader title="Leads por Contactar" subtitle="Empresas que dejaron sus datos en la landing pública." />
      <EnterpriseLeadsPanel />
    </div>
  );
}
