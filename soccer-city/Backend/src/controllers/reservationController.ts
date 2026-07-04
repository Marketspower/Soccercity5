import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabase } from '../services/realtimeService';

export const getReservations = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { status, date, fieldId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (date) where.date = date;
    if (fieldId) where.fieldId = fieldId;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        field: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
      include: { field: true }
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
    const { fieldId, date, hour, price, userName, userEmail, userPhone } = req.body;

    // Vérifier si le créneau est disponible
    const existing = await prisma.reservation.findFirst({
      where: {
        fieldId,
        date,
        hour,
        status: { in: ['confirmed', 'pending'] }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Ce créneau est déjà réservé' });
    }

    // Vérifier les blocages administratifs
    const blocked = await prisma.availability.findFirst({
      where: {
        fieldId,
        date,
        hour,
        blocked: true
      }
    });

    if (blocked) {
      return res.status(409).json({ error: 'Ce créneau est bloqué par l\'administration' });
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        fieldId,
        date,
        hour,
        price,
        userName,
        userEmail,
        userPhone,
        status: 'confirmed'
      },
      include: { field: true }
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
    return res.status(500).json({ error: 'Erreur lors de la création de la réservation' });
  }
};

export const updateReservationStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: { field: true }
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
    const { fieldId } = req.query;

    const where: any = { date };
    if (fieldId) where.fieldId = fieldId;

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        field: true
      },
      orderBy: { hour: 'asc' }
    });

    return res.json(reservations);
  } catch (error) {
    console.error('Erreur getReservationsByDate:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des réservations' });
  }
};