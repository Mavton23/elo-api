import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'nestjs-cloudinary';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaCloudinaryService } from '../social/services/media-cloudinary.service';

@Module({
  imports: [
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
        api_key: configService.get('CLOUDINARY_API_KEY'),
        api_secret: configService.get('CLOUDINARY_API_SECRET'),
        secure: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MediaCloudinaryService],
  exports: [MediaCloudinaryService],
})
export class MediaCloudinaryModule {}