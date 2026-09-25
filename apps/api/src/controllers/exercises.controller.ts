import type { Request, Response } from 'express';
import type { ExerciseInput, ExerciseOrderPatch } from '@latribu/shared-types';
import * as exercisesService from '../services/exercises.service.js';
import { ExerciseVideoError } from '../services/exercise-video.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 404) {
  return res.status(status).json({ success: false, error: message });
}

export async function listExercises(req: Request, res: Response) {
  const exercises = await exercisesService.listExercisesByClient(req.params.id);
  return ok(res, { exercises });
}

export async function createExercise(req: Request, res: Response) {
  const input = req.body as ExerciseInput;
  const exercise = await exercisesService.createExercise(req.params.id, input);
  return ok(res, { exercise }, 201);
}

export async function updateExercise(req: Request, res: Response) {
  const input = req.body as ExerciseInput;
  const exercise = await exercisesService.updateExercise(req.params.exerciseId, input);
  if (!exercise) return err(res, 'Ejercicio no encontrado.');
  return ok(res, { exercise });
}

export async function deleteExercise(req: Request, res: Response) {
  await exercisesService.deleteExercise(req.params.exerciseId);
  return ok(res, { message: 'Ejercicio eliminado.' });
}

export async function reorderExercise(req: Request, res: Response) {
  const { direction } = req.body as ExerciseOrderPatch;
  const exercises = await exercisesService.reorderExercise(req.params.exerciseId, direction);
  return ok(res, { exercises });
}

// El ejercicio debe pertenecer al cliente de la URL — sin esto, un id de
// ejercicio de otro cliente colado en la ruta subiría/borraría su video.
async function findOwnedExercise(req: Request) {
  const exercise = await exercisesService.findExerciseById(req.params.exerciseId);
  return exercise && exercise.clientId === req.params.id ? exercise : null;
}

export async function uploadExerciseVideo(req: Request, res: Response) {
  if (!req.file) return err(res, 'No se recibió ningún video.', 400);
  if (!(await findOwnedExercise(req))) return err(res, 'Ejercicio no encontrado.');
  try {
    const exercise = await exercisesService.uploadExerciseVideo(req.params.exerciseId, req.file);
    if (!exercise) return err(res, 'Ejercicio no encontrado.');
    return ok(res, { exercise });
  } catch (e) {
    if (e instanceof ExerciseVideoError) return err(res, e.message, 400);
    throw e;
  }
}

export async function removeExerciseVideo(req: Request, res: Response) {
  if (!(await findOwnedExercise(req))) return err(res, 'Ejercicio no encontrado.');
  const exercise = await exercisesService.removeExerciseVideo(req.params.exerciseId);
  if (!exercise) return err(res, 'Ejercicio no encontrado.');
  return ok(res, { exercise });
}
