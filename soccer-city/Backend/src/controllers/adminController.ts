// backend/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabase } from '../services/realtimeService';

// Interface pour les éléments de pricing
interface PricingItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  features: string[];
  highlighted: boolean;
}

// Type guard pour vérifier si une valeur est un tableau de PricingItem
function isPricingArray(value: unknown): value is PricingItem[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => 
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    'price' in item &&
    'unit' in item &&
    'features' in item &&
    'highlighted' in item
  );
}

export const getDashboardStats = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const [
      totalReservations, 
      confirmedReservations, 
      pendingEvents, 
      totalGalleryImages,
      totalMedia,
      totalRevenue
    ] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'confirmed' } }),
      prisma.privateEvent.count({ where: { status: 'new' } }),
      prisma.gallery.count(),
      prisma.media.count(),
      prisma.reservation.aggregate({
        where: { status: 'confirmed' },
        _sum: { price: true }
      })
    ]);

    const recentReservations = await prisma.reservation.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
<<<<<<< HEAD
            email: true,
            phone: true
=======
            email: true
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
          }
        }
      }
    });

    const recentEvents = await prisma.privateEvent.findMany({
      take: 6,
<<<<<<< HEAD
      orderBy: { createdAt: 'desc' },
      include: {
        media: true,
        gallery: true
      }
=======
      orderBy: { createdAt: 'desc' }
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
    });

    const recentGallery = await prisma.gallery.findMany({
      take: 6,
<<<<<<< HEAD
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      }
    });

    const recentMedia = await prisma.media.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      }
=======
      orderBy: { createdAt: 'desc' }
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
    });

    return res.json({
      stats: {
        totalReservations,
        confirmedReservations,
        pendingEvents,
        totalGalleryImages,
        totalMedia,
        totalRevenue: totalRevenue._sum.price || 0
      },
      recentActivity: {
        reservations: recentReservations,
        events: recentEvents,
<<<<<<< HEAD
        gallery: recentGallery,
        media: recentMedia
=======
        gallery: recentGallery
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
      }
    });
  } catch (error) {
    console.error('Erreur getDashboardStats:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

export const getRecentActivity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { limit = 10 } = req.query;

    const [reservations, events, gallery, media] = await Promise.all([
      prisma.reservation.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
<<<<<<< HEAD
              email: true,
              phone: true
=======
              email: true
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
            }
          }
        }
      }),
      prisma.privateEvent.findMany({
        take: Number(limit),
<<<<<<< HEAD
        orderBy: { createdAt: 'desc' },
        include: {
          media: true,
          gallery: true
        }
      }),
      prisma.gallery.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              type: true
            }
          }
        }
      }),
      prisma.media.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              type: true
            }
          }
        }
=======
        orderBy: { createdAt: 'desc' }
      }),
      prisma.gallery.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.media.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
      })
    ]);

    const activity = [
      ...reservations.map(r => ({ ...r, type: 'reservation' })),
      ...events.map(e => ({ ...e, type: 'event' })),
      ...gallery.map(g => ({ ...g, type: 'gallery' })),
      ...media.map(m => ({ ...m, type: 'media' }))
    ]
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
    const { date, hour, reason } = req.body;

<<<<<<< HEAD
    if (!date || hour === undefined) {
      return res.status(400).json({ error: 'Date et heure requises' });
    }

=======
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
    const existing = await prisma.availability.findFirst({
      where: {
        date,
        hour,
        blocked: true
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Ce créneau est déjà bloqué' });
    }

    const block = await prisma.availability.create({
      data: {
        date,
        hour,
        blocked: true,
        reason: reason || 'Bloqué par l\'administration'
      }
    });

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
    const { id } = req.params;
    const { price, name, unit, features, highlighted } = req.body;

    // Récupérer le pricing existant
    const pricingSetting = await prisma.setting.findUnique({
      where: { key: 'pricing' }
    });

    // Initialiser le tableau de pricing
    let pricingData: PricingItem[] = [];

    // Si des données existent, les parser avec validation
    if (pricingSetting?.value) {
      const value = pricingSetting.value;
      if (isPricingArray(value)) {
        pricingData = value;
      }
    }

    // Si c'est une mise à jour d'un élément existant
    if (id) {
      const index = pricingData.findIndex(item => item.id === id);
      if (index !== -1) {
        pricingData[index] = {
          ...pricingData[index],
          name: name || pricingData[index].name,
          price: price !== undefined ? Number(price) : pricingData[index].price,
          unit: unit || pricingData[index].unit,
          features: features || pricingData[index].features,
          highlighted: highlighted !== undefined ? highlighted : pricingData[index].highlighted
        };
      } else {
        return res.status(404).json({ error: 'Élément de tarif non trouvé' });
      }
    } else {
      // Création d'un nouvel élément
      if (!name || price === undefined) {
        return res.status(400).json({ error: 'Nom et prix requis' });
      }
      pricingData.push({
        id: Date.now().toString(),
        name,
        price: Number(price),
        unit: unit || '/ heure',
        features: features || [],
        highlighted: highlighted || false
      });
    }

    // Sauvegarder dans la base de données
    await prisma.setting.upsert({
      where: { key: 'pricing' },
      update: { 
<<<<<<< HEAD
        value: pricingData as any
=======
        value: pricingData as any // Conversion explicite car Prisma accepte JsonValue
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
      },
      create: { 
        key: 'pricing', 
        value: pricingData as any 
      }
    });

    return res.json({ 
      message: 'Tarifs mis à jour avec succès', 
      data: pricingData 
    });
  } catch (error) {
    console.error('Erreur updatePricing:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la mise à jour des tarifs',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getPricing = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const pricing = await prisma.setting.findUnique({
      where: { key: 'pricing' }
    });

<<<<<<< HEAD
=======
    // Vérifier et retourner les données
>>>>>>> d95f53ccde598929c69288b964084f79ee7d4b15
    if (pricing?.value && isPricingArray(pricing.value)) {
      return res.json(pricing.value);
    }
    
    return res.json([]);
  } catch (error) {
    console.error('Erreur getPricing:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des tarifs' });
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
        createdAt: true,
        _count: {
          select: {
            reservations: true
          }
        }
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

    if (!title || !body) {
      return res.status(400).json({ error: 'Titre et message requis' });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        audience: audience || 'all',
        sentById: userId
      }
    });

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

export const getGalleryStats = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const [totalImages, totalMedia, imagesByEvent] = await Promise.all([
      prisma.gallery.count(),
      prisma.media.count(),
      prisma.gallery.groupBy({
        by: ['eventId'],
        _count: true
      })
    ]);

    return res.json({
      totalImages,
      totalMedia,
      imagesByEvent
    });
  } catch (error) {
    console.error('Erreur getGalleryStats:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques de la galerie' });
  }
};

export const getEventAnalytics = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const events = await prisma.privateEvent.groupBy({
      by: ['type', 'status'],
      _count: true
    });

    const totalEvents = await prisma.privateEvent.count();

    return res.json({
      totalEvents,
      analytics: events
    });
  } catch (error) {
    console.error('Erreur getEventAnalytics:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des analytics' });
  }
};