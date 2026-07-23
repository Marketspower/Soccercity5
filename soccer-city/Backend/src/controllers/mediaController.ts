// backend/src/controllers/mediaController.ts
import { Request, Response } from 'express';
import { prisma } from '../services/prismaService';
import { supabaseAdmin } from '../services/realtimeService';

// ============================================
// MEDIA - Gestion des vidéos
// ============================================

export const getMedia = async (_req: Request, res: Response): Promise<Response> => {
  try {
    console.log('🔄 Récupération des médias...');
    
    const media = await prisma.media.findMany({
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ Médias récupérés:', media.length);
    return res.json(media);
  } catch (error) {
    console.error('❌ Erreur getMedia:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des médias',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getMediaById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const media = await prisma.media.findUnique({
      where: { id },
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

    if (!media) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    return res.json(media);
  } catch (error) {
    console.error('❌ Erreur getMediaById:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération du média',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const createMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      title, 
      url, 
      type, 
      thumbnail, 
      duration,
      eventId,
      description,
      isFeatured 
    } = req.body;

    if (!title || !url || !type) {
      return res.status(400).json({ 
        error: 'Titre, URL et type sont requis' 
      });
    }

    const media = await prisma.media.create({
      data: {
        title,
        url,
        type,
        thumbnail: thumbnail || null,
        duration: duration || null,
        eventId: eventId || null,
        description: description || null,
        isFeatured: isFeatured || false
      }
    });

    console.log('✅ Média créé:', media);
    return res.status(201).json(media);
  } catch (error) {
    console.error('❌ Erreur createMedia:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la création du média',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const updateMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { title, url, thumbnail, duration, eventId, description, isFeatured } = req.body;

    const existing = await prisma.media.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    const media = await prisma.media.update({
      where: { id },
      data: {
        title: title || existing.title,
        url: url || existing.url,
        thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
        duration: duration !== undefined ? duration : existing.duration,
        eventId: eventId !== undefined ? eventId : existing.eventId,
        description: description !== undefined ? description : existing.description,
        isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured
      }
    });

    return res.json(media);
  } catch (error) {
    console.error('❌ Erreur updateMedia:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du média',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const deleteMedia = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const media = await prisma.media.findUnique({
      where: { id }
    });

    if (!media) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    // Supprimer la vidéo du storage Supabase
    if (media.url) {
      const path = media.url.split('/').pop();
      if (path) {
        await supabaseAdmin.storage
          .from('media')
          .remove([`videos/${path}`])
          .catch((err: Error) => console.warn('⚠️ Erreur suppression storage:', err));
      }
    }

    // Supprimer la vignette si elle existe
    if (media.thumbnail) {
      const thumbPath = media.thumbnail.split('/').pop();
      if (thumbPath) {
        await supabaseAdmin.storage
          .from('media')
          .remove([`thumbnails/${thumbPath}`])
          .catch((err: Error) => console.warn('⚠️ Erreur suppression thumbnail:', err));
      }
    }

    await prisma.media.delete({
      where: { id }
    });

    return res.json({ message: 'Média supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur deleteMedia:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la suppression du média',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

// ============================================
// MEDIA PAR ÉVÉNEMENT
// ============================================

export const getMediaByEvent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { eventId } = req.params;

    const media = await prisma.media.findMany({
      where: { 
        eventId,
        OR: [
          { type: 'video' },
          { type: 'photo' }
        ]
      },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(media);
  } catch (error) {
    console.error('❌ Erreur getMediaByEvent:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des médias',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getEventVideos = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { eventId } = req.params;

    const videos = await prisma.media.findMany({
      where: { 
        eventId,
        type: 'video'
      },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(videos);
  } catch (error) {
    console.error('❌ Erreur getEventVideos:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des vidéos',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

export const getEventGallery = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { eventId } = req.params;

    const images = await prisma.gallery.findMany({
      where: { eventId },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(images);
  } catch (error) {
    console.error('❌ Erreur getEventGallery:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération de la galerie',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

// ============================================
// FEATURED MEDIA
// ============================================

export const getFeaturedMedia = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const media = await prisma.media.findMany({
      where: { isFeatured: true },
      include: {
        event: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(media);
  } catch (error) {
    console.error('❌ Erreur getFeaturedMedia:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des médias en vedette',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};