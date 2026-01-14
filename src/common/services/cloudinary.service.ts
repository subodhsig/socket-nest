import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });
  }

  /**
   * Generate server-side signature for direct client uploads
   */
  getUploadSignature(
    params: { folder?: string; eager?: string[]; expiresIn?: number } = {},
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signParams: Record<string, any> = { timestamp };

    if (params.folder) signParams.folder = params.folder;
    if (params.eager?.length) signParams.eager = params.eager.join('|');

    const signature = cloudinary.utils.api_sign_request(
      signParams,
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      api_key: process.env.CLOUDINARY_API_KEY!,
      timestamp,
      signature,
      folder: params.folder,
    };
  }

  /**
   * Upload a file buffer to Cloudinary (server-side)
   */
  async uploadFile(
    file: Express.Multer.File,
    options: {
      folder?: string;
      resource_type?: 'auto' | 'image' | 'video' | 'raw';
    } = {},
  ): Promise<UploadApiResponse> {
    if (!file?.buffer) throw new Error('Invalid file provided');

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'pms/subtasks',
          resource_type: options.resource_type || 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(
              new Error(error.message || 'Cloudinary upload failed'),
            );
          }
          resolve(result as UploadApiResponse);
        },
      );

      // Buffer → Stream
      const readable = new Readable();
      readable._read = () => {}; // noop
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Generate secure URL from public_id (with optional transformations)
   */
  getSecureUrl(
    publicId: string,
    options: { format?: string; transformation?: any } = {},
  ): string {
    return cloudinary.url(publicId, { secure: true, ...options });
  }

  /**
   * Delete a file from Cloudinary by its public_id
   */
  async deleteFile(publicId: string): Promise<{ result: string }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cloudinary.uploader.destroy(publicId);
  }
}
