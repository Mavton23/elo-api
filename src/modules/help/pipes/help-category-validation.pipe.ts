import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { HelpCategory, HelpType, HelpAudience } from '@prisma/client';

@Injectable()
export class HelpCategoryValidationPipe implements PipeTransform {
  private readonly allowedCategories = Object.values(HelpCategory);
  
  transform(value: any) {
    if (!this.isValidCategory(value)) {
      throw new BadRequestException(`Categoria inválida. Categorias permitidas: ${this.allowedCategories.join(', ')}`);
    }
    return value;
  }

  private isValidCategory(value: any): boolean {
    return this.allowedCategories.includes(value);
  }
}

@Injectable()
export class HelpTypeValidationPipe implements PipeTransform {
  private readonly allowedTypes = Object.values(HelpType);
  
  transform(value: any) {
    if (!this.isValidType(value)) {
      throw new BadRequestException(`Tipo inválido. Tipos permitidos: ${this.allowedTypes.join(', ')}`);
    }
    return value;
  }

  private isValidType(value: any): boolean {
    return this.allowedTypes.includes(value);
  }
}

@Injectable()
export class HelpAudienceValidationPipe implements PipeTransform {
  private readonly allowedAudiences = Object.values(HelpAudience);
  
  transform(value: any) {
    if (!this.isValidAudience(value)) {
      throw new BadRequestException(`Audiência inválida. Audiências permitidas: ${this.allowedAudiences.join(', ')}`);
    }
    return value;
  }

  private isValidAudience(value: any): boolean {
    return this.allowedAudiences.includes(value);
  }
}