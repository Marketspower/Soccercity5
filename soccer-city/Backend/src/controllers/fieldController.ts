import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';

export const getFields = async (_req: Request, res: Response): Promise<Response> => {
  try {
    console.log('🔄 Récupération des terrains...');
    
    const fields = await prisma.field.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('✅ Terrains récupérés:', fields.length);
    return res.json(fields);
  } catch (error) {
    console.error('❌ Erreur getFields:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des terrains',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getField = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    console.log('🔄 Récupération du terrain:', id);
    
    const field = await prisma.field.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: { in: ['confirmed', 'pending'] }
          }
        }
      }
    });

    if (!field) {
      return res.status(404).json({ error: 'Terrain non trouvé' });
    }

    return res.json(field);
  } catch (error) {
    console.error('❌ Erreur getField:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération du terrain',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const createField = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, dimensions, turf, players, pricePerHour, ...data } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const field = await prisma.field.create({
      data: {
        name,
        slug,
        dimensions,
        turf,
        players,
        pricePerHour: parseFloat(pricePerHour),
        ...data
      }
    });

    return res.status(201).json(field);
  } catch (error) {
    console.error('❌ Erreur createField:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la création du terrain',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const updateField = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { name, ...data } = req.body;

    const updateData: any = { ...data };
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, '-');
    }

    const field = await prisma.field.update({
      where: { id },
      data: updateData
    });

    return res.json(field);
  } catch (error) {
    console.error('❌ Erreur updateField:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du terrain',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const deleteField = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    await prisma.field.delete({
      where: { id }
    });

    return res.json({ message: 'Terrain supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur deleteField:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la suppression du terrain',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getFieldAvailability = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const field = await prisma.field.findUnique({
      where: { id }
    });

    if (!field) {
      return res.status(404).json({ error: 'Terrain non trouvé' });
    }

    let availability: any[] = [];
    if (date) {
      availability = await prisma.availability.findMany({
        where: {
          fieldId: id,
          date: date as string,
          blocked: true
        }
      });
    }

    return res.json({
      field,
      availability,
      pricePerHour: field.pricePerHour
    });
  } catch (error) {
    console.error('❌ Erreur getFieldAvailability:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des disponibilités',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};