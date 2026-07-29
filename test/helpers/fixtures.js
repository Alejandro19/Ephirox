require('./setupTestEnv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

function testSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function createTestAdmin(overrides = {}) {
  const password = overrides.password || 'TestPass123!';
  const password_hash = await bcrypt.hash(password, 10);
  const email = overrides.email || `admin-${randomUUID()}@test.latribu.local`;
  const { data, error } = await testSupabase()
    .from('admins')
    .insert({ name: overrides.name || 'Admin de prueba', email, password_hash })
    .select()
    .single();
  if (error) throw error;
  return { ...data, password };
}

async function createTestClient(overrides = {}) {
  const password = overrides.password || 'TestPass123!';
  const password_hash = await bcrypt.hash(password, 10);
  const email = overrides.email || `client-${randomUUID()}@test.latribu.local`;
  const { data, error } = await testSupabase()
    .from('clients')
    .insert({
      name: overrides.name || 'Cliente de prueba',
      email,
      password_hash,
      client_type: overrides.client_type || 'coaching_1_1',
      status: overrides.status || 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, password };
}

async function deleteTestAdmin(id) {
  await testSupabase().from('admins').delete().eq('id', id);
}

async function deleteTestClient(id) {
  await testSupabase().from('clients').delete().eq('id', id);
}

module.exports = { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient };
