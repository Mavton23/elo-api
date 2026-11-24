import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID as uuidv4 } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { extname } from 'path';

export interface UploadResult {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class MediaService {
  private readonly uploadPath: string;
  private readonly maxFileSize: number;
  private readonly allowedImageTypes: string[];
  private readonly allowedDocumentTypes: string[];

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get('media.uploadPath') || './uploads';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
  }

  /**
   * Upload de arquivos
   */
  async uploadFile(file: Express.Multer, userId: string): Promise<UploadResult> {
    // Validar tamanho do arquivo
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Validar tipo do arquivo
    const isImage = this.allowedImageTypes.includes(file.mimetype);
    const isDocument = this.allowedDocumentTypes.includes(file.mimetype);

    if (!isImage && !isDocument) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Use imagens (JPEG, PNG, GIF, WebP) ou documentos (PDF, DOC, XLS, PPT)',
      );
    }

    // Criar diretório se não existir
    const userUploadPath = path.join(this.uploadPath, 'users', userId);
    await fs.mkdir(userUploadPath, { recursive: true });

    // Gerar nome único para o arquivo
    const fileExt = extname(file.originalname).toLowerCase();
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(userUploadPath, fileName);

    if (!file.buffer) {
      throw new BadRequestException('Arquivo inválido ou não enviado em memória');
    }

    // Salvar arquivo
    await fs.writeFile(filePath, file.buffer);

    // Construir URL de acesso
    const baseUrl = this.configService.get('app.baseUrl') || 'http://localhost:3000';
    const url = `${baseUrl}/uploads/users/${userId}/${fileName}`;

    return {
      url,
      fileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Upload múltiplo de arquivos
   */
  async uploadMultipleFiles(
    files: Express.Multer[],
    userId: string,
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, userId));
    return Promise.all(uploadPromises);
  }

  /**
   * Validar se arquivo é seguro
   */
  private async validateFileSafety(file: Express.Multer): Promise<void> {
    // Implementar validações de segurança
    // 1. Verificar assinatura do arquivo
    // 2. Verificar conteúdo malicioso
    // 3. Validar metadados
    
    // Por enquanto, apenas validação básica
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs'];
    const ext = extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(ext)) {
      throw new BadRequestException('Tipo de arquivo não permitido por questões de segurança');
    }
  }

  /**
   * Obter informações de um arquivo
   */
  async getFileInfo(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
    createdAt?: Date;
  }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Excluir arquivo
   */
  async deleteFile(url: string, userId: string): Promise<boolean> {
    try {
      // Extrair nome do arquivo da URL
      const fileName = url.split('/').pop();
      if (!fileName) {
        return false;
      }

      const filePath = path.join(this.uploadPath, 'users', userId, fileName);
      
      // Verificar se arquivo existe
      const fileInfo = await this.getFileInfo(filePath);
      if (!fileInfo.exists) {
        return false;
      }

      // Excluir arquivo
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Limpar arquivos temporários antigos
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      // Implementar limpeza de arquivos antigos
      // Esta é uma implementação simplificada
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }
}