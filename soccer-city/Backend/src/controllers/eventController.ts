import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabase } from '../services/realtimeService';

export const getEvents = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const events = await prisma.privateEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return res.json(events);
  } catch (error) {
    console.error('Erreur getEvents:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const event = await prisma.privateEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    return res.json(event);
  } catch (error) {
    console.error('Erreur getEvent:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const event = await prisma.privateEvent.create({
      data: req.body
    });

    // Broadcast en temps réel
    await supabase.channel('events-changes').send({
      type: 'broadcast',
      event: 'new_event',
      payload: event
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Erreur createEvent:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
};

export const updateEventStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const event = await prisma.privateEvent.update({
      where: { id },
      data: { status }
    });

    // Broadcast en temps réel
    await supabase.channel('events-changes').send({
      type: 'broadcast',
      event: 'update_event',
      payload: event
    });

    return res.json(event);
  } catch (error) {
    console.error('Erreur updateEventStatus:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'événement' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    await prisma.privateEvent.delete({
      where: { id }
    });

    return res.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteEvent:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
};