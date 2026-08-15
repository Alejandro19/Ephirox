'use client';

import { useEffect, useState } from 'react';
import { listRecipes, uploadRecipe, deleteRecipe, type Recipe } from '../../lib/recipes-client';
import { showToast } from '../layout/AppShell';
import EmptyState from '../ui/EmptyState';
import FileField from '../ui/FileField';
import { IconFileDownload } from '../ui/icons';

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--ink-secondary)', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-hairline)',
  padding: '0 10px', fontSize: 14, fontWeight: 600, background: 'var(--paper)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
};
const dangerButtonStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', borderRadius: 9999, border: '1px solid var(--danger)',
  background: 'transparent', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
};
const primaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 18px', borderRadius: 9999, border: 'none',
  background: 'var(--ring-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};

export function AdminRecipesPanel() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function refetch() {
    setRecipes(await listRecipes());
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload() {
    if (!name.trim() || !file) return;
    setUploading(true);
    try {
      await uploadRecipe(name.trim(), category.trim() || null, file);
      setName('');
      setCategory('');
      setFile(null);
      await refetch();
      showToast('Receta subida.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(recipeId: string) {
    try {
      await deleteRecipe(recipeId);
      await refetch();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  }

  if (loading) return <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>Cargando recetas…</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="arp-name">Nombre de la receta</label>
          <input id="arp-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bowl de proteína" />
        </div>
        <div>
          <label style={labelStyle} htmlFor="arp-category">Categoría (opcional)</label>
          <input id="arp-category" style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Desayuno" />
        </div>
      </div>
      <FileField
        id="arp-pdf"
        label="Archivo PDF"
        accept="application/pdf"
        uploading={uploading}
        fileName={file?.name}
        onFileChange={setFile}
      />
      <button type="button" style={{ ...primaryButtonStyle, marginTop: 10 }} onClick={handleUpload} disabled={uploading || !name.trim() || !file}>
        Subir receta
      </button>

      <div style={{ marginTop: 16 }}>
        {recipes.length === 0 ? (
          <EmptyState message="Aún no hay recetas cargadas." />
        ) : (
          recipes.map((recipe) => (
            <div
              key={recipe.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--border-hairline)' }}
            >
              <span aria-hidden style={{ color: 'var(--ring-accent)', flexShrink: 0, display: 'inline-flex' }}>
                <IconFileDownload size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{recipe.name}</p>
                {recipe.category && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-secondary)' }}>{recipe.category}</p>}
              </div>
              <button type="button" style={dangerButtonStyle} onClick={() => handleDelete(recipe.id)}>Eliminar</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
