import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { MediaCloudinaryService } from './media-cloudinary.service';

describe('MediaCloudinaryService.resolveUrl', () => {
  beforeAll(() => cloudinary.config({ cloud_name: 'demo', api_key: '123', api_secret: 'abc' }));
  const svc = new MediaCloudinaryService(
    {} as any,
    new ConfigService({ MEDIA_URL_TTL_SECONDS: '600' }),
  );

  it('gera URL assinada e temporária para ficheiros privados', () => {
    const before = Math.floor(Date.now() / 1000);
    const url = svc.resolveUrl({
      publicId: 'elo/social-media/posts/u1/123_foto',
      resourceType: 'image',
      deliveryType: 'authenticated',
      format: 'jpg',
    });
    const q = new URL(url).searchParams;
    expect(url).toContain('api.cloudinary.com');
    expect(q.get('signature')).toBeTruthy();
    expect(q.get('type')).toBe('authenticated');
    const exp = Number(q.get('expires_at'));
    expect(exp).toBeGreaterThanOrEqual(before + 600);
    expect(exp).toBeLessThan(before + 700);
  });

  it('mantém a URL antiga para ficheiros públicos', () => {
    expect(svc.resolveUrl({ url: 'https://x/y.jpg', deliveryType: null })).toBe('https://x/y.jpg');
  });
});
