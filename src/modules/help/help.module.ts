import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SocialModule } from '../social/social.module';

import { HelpService } from './help.service';
import { HelpController } from './help.controller';

import { 
  HelpCategoryValidationPipe, 
  HelpTypeValidationPipe, 
  HelpAudienceValidationPipe 
} from './pipes/help-category-validation.pipe';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SocialModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: configService.get<number>('media.maxFileSize', 20 * 1024 * 1024), // 20MB
        },
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            // Imagens
            'image/jpeg',
            'image/png', 
            'image/gif',
            'image/webp',
            
            
            // Documentos
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            
            // Vídeos
            'video/mp4',
            'video/mpeg', 
            'video/quicktime',
            
            // Tipos adicionais
            'video/x-msvideo',
            'video/x-matroska',
            'video/x-ms-wmv',
            'video/webm',
            
            // Áudios
            'audio/mpeg',
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
  controllers: [HelpController],
  providers: [
    HelpService,
    HelpCategoryValidationPipe,
    HelpTypeValidationPipe,
    HelpAudienceValidationPipe
  ],
  exports: [
    HelpService,
    HelpCategoryValidationPipe,
    HelpTypeValidationPipe,
    HelpAudienceValidationPipe
  ],
})
export class HelpModule {}