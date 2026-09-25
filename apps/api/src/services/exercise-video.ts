import { EXERCISE_VIDEO_ALLOWED_TYPES, EXERCISE_VIDEO_MAX_BYTES } from '@latribu/shared-types';

export class ExerciseVideoError extends Error {}

// El mimetype lo manda el cliente y no es confiable — además de la lista
// permitida se verifican los primeros bytes del archivo (firma real del
// contenedor) para que un archivo renombrado a .mp4 no pase.
function hasMp4Signature(buf: Buffer): boolean {
  return buf.length >= 12 && buf.subarray(4, 8).toString('latin1') === 'ftyp';
}

function hasWebmSignature(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
}

export function validateExerciseVideo(file: { buffer: Buffer; mimetype: string }): void {
  if (!(EXERCISE_VIDEO_ALLOWED_TYPES as readonly string[]).includes(file.mimetype)) {
    throw new ExerciseVideoError('Formato no permitido: sube un video MP4 o WebM.');
  }
  if (file.buffer.length > EXERCISE_VIDEO_MAX_BYTES) {
    throw new ExerciseVideoError('El video supera el máximo de 30 MB.');
  }
  const validSignature = file.mimetype === 'video/mp4' ? hasMp4Signature(file.buffer) : hasWebmSignature(file.buffer);
  if (!validSignature) {
    throw new ExerciseVideoError('El archivo no es un video MP4 o WebM válido.');
  }
}
