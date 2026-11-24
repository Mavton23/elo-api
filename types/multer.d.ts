import * as express from 'express';

declare global {
  namespace Express {
    interface Multer {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination?: string;
      filename?: string;
      path?: string;
      buffer?: Buffer;
    }

    // Para o array de arquivos do UploadedFiles
    interface Request {
      files?: Multer[] | { [fieldname: string]: Multer[] };
    }
  }
}

declare module 'multer' {
  import { RequestHandler } from 'express';

  export function memoryStorage(): any;
  export function diskStorage(opts: any): any;

  export interface File extends Express.Multer {}
  
  export function multer(opts?: any): {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: { name: string; maxCount?: number }[]): RequestHandler;
    any(): RequestHandler;
  };

  export default multer;
}
