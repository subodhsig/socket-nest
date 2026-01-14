import { Global, Module } from '@nestjs/common';
import { PaginationProvider } from './service/pagination.provider';

@Global()
@Module({
  providers: [PaginationProvider],
  exports: [PaginationProvider],
})
export class PaginationModule {}
