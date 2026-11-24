import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from 'nestjs-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { extname } from 'path';

export type ResourceType = 'image' | 'video' | 'raw';

/** Referência mínima a um ficheiro guardado, suficiente para gerar a URL. */
export interface StoredMediaRef {
  url?: string | null;
  publicId?: string | null;
  resourceType?: string | null;
  deliveryType?: string | null;
  format?: string | null;
}

export interface UploadResult {
  url: string;
  publicId: string;
  assetId: string;
  originalName: string;
  size: number;
  mimeType: string;
  format: string;
  width?: number;
  height?: number;
  secureUrl: string;
  type: 'image' | 'document' | 'video';
  resourceType: ResourceType;
  deliveryType: 'upload' | 'authenticated';
}

@Injectable()
export class MediaCloudinaryService {
  private readonly maxFileSize: number;
  private readonly allowedImageTypes: string[];
  private readonly allowedDocumentTypes: string[];
  private readonly allowedVideoTypes: string[];

  private readonly logger = new Logger(MediaCloudinaryService.name);
  /** Ficheiros privados por omissão. Só desligar para conteúdo público. */
  private readonly privateDelivery: boolean;
  /** Validade das URLs assinadas (segundos). */
  private readonly signedUrlTtl: number;
  private readonly rootFolder: string;

  constructor(
    private cloudinaryService: CloudinaryService,
    config: ConfigService,
  ) {
    this.privateDelivery = config.get<string>('CLOUDINARY_PRIVATE_DELIVERY', 'true') !== 'false';
    this.signedUrlTtl = Number(config.get<string>('MEDIA_URL_TTL_SECONDS', '3600'));
    this.rootFolder = config.get<string>('CLOUDINARY_ROOT_FOLDER', 'elo');
    this.maxFileSize = 20 * 1024 * 1024; // 20MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    this.allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
  }

  private determineMediaType(mimeType: string): 'image' | 'document' | 'video' {
    if (this.allowedImageTypes.includes(mimeType)) {
      return 'image';
    }
    if (this.allowedVideoTypes.includes(mimeType)) {
      return 'video';
    }
    return 'document';
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file.buffer) {
      throw new BadRequestException('Arquivo inválido ou não enviado em memória');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    const isValidType =
      this.allowedImageTypes.includes(file.mimetype) ||
      this.allowedDocumentTypes.includes(file.mimetype) ||
      this.allowedVideoTypes.includes(file.mimetype);

    if (!isValidType) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Use imagens (JPEG, PNG, GIF, WebP, ), documentos (PDF, DOC, XLS, PPT, TXT) ou vídeos (MP4, MPEG, MOV)',
      );
    }

    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.php'];
    const ext = extname(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      throw new BadRequestException('Tipo de arquivo não permitido por questões de segurança');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folder = 'social-media/posts',
    opts: { private?: boolean } = {},
  ): Promise<UploadResult> {
    try {
      this.validateFile(file);

      const type = this.determineMediaType(file.mimetype);
      const resourceType: ResourceType = type === 'video' ? 'video' : type === 'image' ? 'image' : 'raw';
      const isPrivate = opts.private ?? this.privateDelivery;
      const deliveryType = isPrivate ? 'authenticated' : 'upload';

      // Gerar nome único
      const originalNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, '');
      const safeFileName = originalNameWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50);

      // Para "raw" o Cloudinary não guarda a extensão separadamente
      const ext = resourceType === 'raw' ? extname(file.originalname).toLowerCase() : '';
      const publicId = `${Date.now()}_${safeFileName}${ext}`;
      
      // Usar o serviço do nestjs-cloudinary com opções corretas
      // O nestjs-cloudinary espera opções específicas
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: `${this.rootFolder}/${folder}/${userId}`,
        public_id: publicId,
        resource_type: resourceType as any,
        type: deliveryType,
        tags: [`user_${userId}`, 'social_media_post'],
        transformation: type === 'image' ? [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
        ] : undefined,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        assetId: result.asset_id || '',
        originalName: file.originalname,
        size: result.bytes,
        mimeType: file.mimetype,
        format: result.format || '',
        width: result.width,
        height: result.height,
        secureUrl: result.secure_url,
        type,
        resourceType,
        deliveryType,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Falha no upload', error as Error);
      throw new InternalServerErrorException('Erro ao processar upload do arquivo');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    folder = 'social-media/posts',
    opts: { private?: boolean } = {},
  ): Promise<UploadResult[]> {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file, userId, folder, opts));
      return await Promise.all(uploadPromises);
    } catch (error) {
      this.logger.error('Falha no upload múltiplo', error as Error);
      throw new InternalServerErrorException('Falha ao fazer upload dos arquivos');
    }
  }

  async deleteFile(
    publicId: string,
    resourceType: ResourceType = 'image',
    deliveryType: string = this.privateDelivery ? 'authenticated' : 'upload',
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: deliveryType,
        invalidate: true,
      });
      return result.result === 'ok';
    } catch (error) {
      this.logger.error(`Falha ao apagar ${publicId}`, error as Error);
      return false;
    }
  }

  /**
   * URL de acesso a um ficheiro guardado.
   *
   * - Ficheiros privados: URL assinada, válida por MEDIA_URL_TTL_SECONDS
   *   (1 hora por omissão). Uma URL que saia da app deixa de funcionar.
   * - Ficheiros antigos (públicos): devolve a URL guardada.
   *
   * Só deve ser chamada depois de verificar que o utilizador pode ver o
   * conteúdo a que o ficheiro pertence.
   */
  resolveUrl(ref: StoredMediaRef): string {
    if (!ref.publicId || ref.deliveryType !== 'authenticated') {
      return ref.url ?? '';
    }
    const resourceType = (ref.resourceType as ResourceType) || 'image';
    const expiresAt = Math.floor(Date.now() / 1000) + this.signedUrlTtl;
    return cloudinary.utils.private_download_url(
      ref.publicId,
      resourceType === 'raw' ? '' : (ref.format ?? ''),
      {
        resource_type: resourceType,
        type: 'authenticated',
        expires_at: expiresAt,
        attachment: false,
      },
    );
  }
}