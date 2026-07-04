import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabase } from '../services/realtimeService';

export const getDashboardStats = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const [totalReservations, confirmedReservations, pendingEvents, activeFields, totalRevenue] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'confirmed' } }),
      prisma.privateEvent.count({ where: { status: 'new' } }),
      prisma.field.count({ where: { active: true } }),
      prisma.reservation.aggregate({
        where: { status: 'confirmed' },
        _sum: { price: true }
      })
    ]);

    const recentReservations = await prisma.reservation.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { field: true }
    });

    return res.json({
      stats: {
        totalReservations,
        confirmedReservations,
        pendingEvents,
        activeFields,
        totalRevenue: totalRevenue._sum.price || 0
      },
      recentActivity: recentReservations
    });
  } catch (error) {
    console.error('Erreur getDashboardStats:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

export const getRecentActivity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { limit = 10 } = req.query;

    const [reservations, events] = await Promise.all([
      prisma.reservation.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { field: true }
      }),
      prisma.privateEvent.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const activity = [...reservations, ...events]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, Number(limit));

    return res.json(activity);
  } catch (error) {
    console.error('Erreur getRecentActivity:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'activité récente' });
  }
};

export const blockSlot = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fieldId, date, hour, reason } = req.body;

    const block = await prisma.availability.create({
      data: {
        fieldId,
        date,
        hour,
        blocked: true,
        reason: reason || 'Bloqué par l\'administration'
      }
    });

    // Broadcast en temps réel
    await supabase.channel('availability-changes').send({
      type: 'broadcast',
      event: 'new_block',
      payload: block
    });

    return res.status(201).json(block);
  } catch (error) {
    console.error('Erreur blockSlot:', error);
    return res.status(500).json({ error: 'Erreur lors du blocage du créneau' });
  }
};

export const unblockSlot = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    await prisma.availability.delete({
      where: { id }
    });

    return res.json({ message: 'Créneau débloqué avec succès' });
  } catch (error) {
    console.error('Erreur unblockSlot:', error);
    return res.status(500).json({ error: 'Erreur lors du déblocage du créneau' });
  }
};

export const updatePricing = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fieldId } = req.params;
    const { pricePerHour } = req.body;

    const field = await prisma.field.update({
      where: { id: fieldId },
      data: { pricePerHour: parseFloat(pricePerHour) }
    });

    return res.json(field);
  } catch (error) {
    console.error('Erreur updatePricing:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du tarif' });
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(users);
  } catch (error) {
    console.error('Erreur getUsers:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

export const sendNotification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { title, body, audience } = req.body;
    const userId = (req as any).user?.id;

    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        audience,
        sentById: userId
      }
    });

    // Broadcast en temps réel
    await supabase.channel('notifications').send({
      type: 'broadcast',
      event: 'new_notification',
      payload: notification
    });

    return res.status(201).json(notification);
  } catch (error) {
    console.error('Erreur sendNotification:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de la notification' });
  }
};