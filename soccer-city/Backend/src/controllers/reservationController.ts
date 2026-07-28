// backend/src/controllers/reservationController.ts
import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabase } from '../services/realtimeService';

export const getReservations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status, date } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (date) where.date = date;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(reservations);
  } catch (error) {
    console.error('Erreur getReservations:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
};

export const getReservation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    return res.json(reservation);
  } catch (error) {
    console.error('Erreur getReservation:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de la réservation' });
  }
};

export const createReservation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { date, hour, price, userName, userEmail, userPhone, userId } = req.body;

    // Validation des champs requis
    if (!date || hour === undefined || !price || !userName || !userEmail || !userPhone) {
      return res.status(400).json({ 
        error: 'Tous les champs sont requis: date, hour, price, userName, userEmail, userPhone' 
      });
    }

    // Vérifier si le créneau est disponible (basé sur date + hour uniquement)
    const existing = await prisma.reservation.findFirst({
      where: {
        date,
        hour,
        status: { in: ['confirmed', 'pending'] }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        date,
        hour,
        price,
        userName,
        userEmail,
        userPhone,
        userId: userId || null,
        status: 'confirmed'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Broadcast en temps réel
    await supabase.channel('reservations-changes').send({
      type: 'broadcast',
      event: 'new_reservation',
      payload: reservation
    });

    return res.status(201).json(reservation);
  } catch (error) {
    console.error('Erreur createReservation:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la création de la réservation',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const updateReservationStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Le statut est requis' });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Broadcast en temps réel
    await supabase.channel('reservations-changes').send({
      type: 'broadcast',
      event: 'update_reservation',
      payload: reservation
    });

    return res.json(reservation);
  } catch (error) {
    console.error('Erreur updateReservationStatus:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la réservation' });
  }
};

export const deleteReservation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    await prisma.reservation.delete({
      where: { id }
    });

    return res.json({ message: 'Réservation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteReservation:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de la réservation' });
  }
};

export const getReservationsByDate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { date } = req.params;

    const reservations = await prisma.reservation.findMany({
      where: { date },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { hour: 'asc' }
    });

    return res.json(reservations);
  } catch (error) {
    console.error('Erreur getReservationsByDate:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
};

export const getAvailableSlots = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { date } = req.params;

    // Récupérer toutes les réservations pour la date
    const reservations = await prisma.reservation.findMany({
      where: { 
        date,
        status: { in: ['confirmed', 'pending'] }
      },
      select: { hour: true }
    });

    // Récupérer les créneaux bloqués
    const blockedSlots = await prisma.availability.findMany({
      where: { 
        date,
        blocked: true
      },
      select: { hour: true }
    });

    // Créer un Set des heures réservées
    const bookedHours = new Set(reservations.map(r => r.hour));
    const blockedHours = new Set(blockedSlots.map(b => b.hour));

    // Générer les heures disponibles (8h à 22h)
    const availableSlots = [];
    for (let hour = 8; hour <= 22; hour++) {
      if (!bookedHours.has(hour) && !blockedHours.has(hour)) {
        availableSlots.push(hour);
      }
    }

    return res.json({
      date,
      availableSlots,
      bookedSlots: Array.from(bookedHours).sort(),
      blockedSlots: Array.from(blockedHours).sort()
    });
  } catch (error) {
    console.error('Erreur getAvailableSlots:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des créneaux disponibles' });
  }
};