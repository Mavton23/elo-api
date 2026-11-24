import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Services
import { PostsService } from './services/posts.service';
import { CommentsService } from './services/comments.service';
import { VisibilityService } from './services/visibility.service';
import { MediaService } from './services/media.service';
import { MediaCloudinaryService } from './services/media-cloudinary.service';
import { CategoryService } from './services/category.service';

// Controllers
import { PostsController } from './controllers/posts.controller';
import { CommentsController } from './controllers/comments.controller';
import { SocialMetadataController } from './controllers/metadata.controller';

// Guards
import { PostVisibilityGuard } from './guards/post-visibility.guard';
import { PostOwnershipGuard } from './guards/post-ownership.guard';

// Interceptors
import { PostResponseInterceptor } from './interceptors/post-response.interceptor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: memoryStorage(), // Para desenvolvimento, usar memory storage
        limits: {
          fileSize: configService.get<number>('media.maxFileSize', 10 * 1024 * 1024), // 10MB
        },
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            // Imagens (do MediaCloudinaryService)
            'image/jpeg',
            'image/png', 
            'image/gif',
            'image/webp',
            
            // Documentos (do MediaCloudinaryService)
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            
            // VÍDEOS - ADICIONE ESTAS LINHAS (do MediaCloudinaryService)
            'video/mp4',
            'video/mpeg', 
            'video/quicktime', // .mov
            
            // Tipos adicionais comuns (opcional)
            'video/x-msvideo',    // .avi
            'video/x-matroska',   // .mkv
            'video/x-ms-wmv',     // .wmv
            'video/webm',         // .webm
            
            // Áudios (se quiser suportar)
            'audio/mpeg',         // .mp3
            'audio/wav',
            'audio/ogg',
          ];

          if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Tipo de arquivo não permitido'), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    PostsController,
    CommentsController,
    SocialMetadataController,
  ],
  providers: [
    // Services
    PostsService,
    CommentsService,
    VisibilityService,
    MediaService,
    MediaCloudinaryService,
    CategoryService,
    
    // Guards
    PostVisibilityGuard,
    PostOwnershipGuard,
    
    // Interceptors
    PostResponseInterceptor,
  ],
  exports: [
    PostsService,
    CommentsService,
    VisibilityService,
    MediaService,
    MediaCloudinaryService,
    CategoryService,
    PostVisibilityGuard,
    PostOwnershipGuard,
    PostResponseInterceptor,
  ],
})
export class SocialModule {}