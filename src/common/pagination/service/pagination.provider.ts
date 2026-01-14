import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { Paginated } from '../interface/paginated.interface';

type SearchSpec<T> = {
  columns: (keyof T | string)[];
  term?: string;
};

type PaginateOptions<T extends ObjectLiteral> = {
  repository?: Repository<T>;
  alias?: string;
  qb?: SelectQueryBuilder<T>;
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  search?: SearchSpec<T>;
  maxLimit?: number;
};

@Injectable()
export class PaginationProvider {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  async paginate<T extends ObjectLiteral>(
    dto: PaginationQueryDto,
    opts: PaginateOptions<T>,
  ): Promise<Paginated<T>> {
    const maxLimit = Math.max(1, opts.maxLimit ?? 100);
    const limit = Math.min(Math.max(1, dto.limit ?? 10), maxLimit);
    const page = Math.max(1, dto.page ?? 1);
    const offset = (page - 1) * limit;

    // ---------------------------
    // Base query builder
    // ---------------------------
    let qb: SelectQueryBuilder<T>;
    if (opts.qb) {
      qb = opts.qb;
    } else if (opts.repository) {
      const alias = opts.alias ?? opts.repository.metadata.tableName;
      qb = opts.repository.createQueryBuilder(alias);
      if (opts.where) qb.where(opts.where);
      if (opts.relations) {
        for (const rel of Object.keys(opts.relations)) {
          qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
        }
      }
      if (opts.select) qb.select(this.normalizeSelect(alias, opts.select));
    } else {
      throw new Error('Provide either opts.qb or opts.repository');
    }

    const alias = qb.expressionMap.mainAlias!.name;

    // ---------------------------
    // Search handling
    // ---------------------------
    this.applySearch(qb, dto.q, opts.search);

    // ---------------------------
    // Ordering (always by created_at)
    // ---------------------------
    qb.addOrderBy(`${alias}.created_at`, dto.order ?? 'DESC', 'NULLS LAST');

    qb.skip(offset).take(limit);

    // ---------------------------
    // Execute query
    // ---------------------------
    const [rows, totalItem] = await qb.getManyAndCount();
    const totalPage = Math.max(1, Math.ceil(totalItem / limit));
    const hasNextPage = page < totalPage;
    const hasPreviousPage = page > 1;

    // ---------------------------
    // Build links
    // ---------------------------
    const baseURL = `${this.request.protocol}://${this.request.headers.host}/`;
    const url = new URL(this.request.url, baseURL);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));

    const mkLink = (p: number): string => {
      const clone = new URL(url.toString());
      clone.searchParams.set('page', String(p));
      return `${clone.origin}${clone.pathname}?${clone.searchParams.toString()}`;
    };

    const links = {
      first: mkLink(1),
      last: mkLink(totalPage),
      current: mkLink(page),
      next: hasNextPage ? mkLink(page + 1) : null,
      previous: hasPreviousPage ? mkLink(page - 1) : null,
    };

    const meta = {
      itemsPerPage: limit,
      totalItem,
      currentPage: page,
      totalPage,
      hasNextPage,
      hasPreviousPage,
    };

    return { data: rows, meta, links };
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  private applySearch<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    searchTerm?: string,
    spec?: SearchSpec<T>,
  ) {
    if (!spec || !searchTerm) return;

    const alias = qb.expressionMap.mainAlias!.name;
    const term = searchTerm.trim();

    const whereBits: string[] = [];
    const params: Record<string, any> = { _term: `%${term}%` };

    spec.columns.forEach((col) => {
      const full = String(col).includes('.')
        ? String(col)
        : `${alias}.${String(col)}`;
      whereBits.push(`${full} ILIKE :_term`);
    });

    if (whereBits.length) {
      qb.andWhere(`(${whereBits.join(' OR ')})`, params);
    }
  }

  private normalizeSelect<T extends ObjectLiteral>(
    alias: string,
    select: FindOptionsSelect<T>,
  ): string[] {
    const pick: string[] = [];
    for (const [k, v] of Object.entries(select)) {
      if (v) pick.push(`${alias}.${k}`);
    }
    return pick.length ? pick : [`${alias}`];
  }

  // ↓ Inside class PaginationProvider { ... }

  private pkToString(val: unknown): string | null {
    if (val == null) return null; // null/undefined

    switch (typeof val) {
      case 'string':
      case 'number':
      case 'bigint':
        return String(val);
      default:
        break;
    }

    if (val instanceof Date) return val.toISOString();

    // Respect custom toString if it isn't Object.prototype.toString
    const maybeObj = val as { toString?: () => string } | null;
    if (
      maybeObj &&
      typeof maybeObj.toString === 'function' &&
      maybeObj.toString !== Object.prototype.toString
    ) {
      const s = maybeObj.toString();
      if (typeof s === 'string' && s !== '[object Object]') return s;
    }

    throw new Error(
      `Unsupported primary key type: ${Object.prototype.toString.call(val)}`,
    );
  }

  async paginateWithRawMerge<T extends ObjectLiteral, K extends string>(
    dto: PaginationQueryDto,
    opts: PaginateOptions<T> & { mergeKeys: readonly K[] },
  ): Promise<Paginated<T & Partial<Record<K, number | string | null>>>> {
    const maxLimit = Math.max(1, opts.maxLimit ?? 100);
    const limit = Math.min(Math.max(1, dto.limit ?? 10), maxLimit);
    const page = Math.max(1, dto.page ?? 1);
    const offset = (page - 1) * limit;

    if (!opts.qb && !opts.repository) {
      throw new Error('Provide either opts.qb or opts.repository');
    }

    // Base QB
    let qb: SelectQueryBuilder<T>;
    if (opts.qb) {
      qb = opts.qb;
    } else {
      const alias = opts.alias ?? opts.repository!.metadata.tableName;
      qb = opts.repository!.createQueryBuilder(alias);
      if (opts.where) qb.where(opts.where);
      if (opts.relations) {
        for (const rel of Object.keys(opts.relations)) {
          qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
        }
      }
      if (opts.select) qb.select(this.normalizeSelect(alias, opts.select));
    }

    // Search
    this.applySearch(qb, dto.q, opts.search);

    const mainAlias = qb.expressionMap.mainAlias!;
    const aliasName = mainAlias.name;
    const pkProp = mainAlias.metadata.primaryColumns[0].propertyPath;

    // Ordering
    qb.addOrderBy(`${aliasName}.created_at`, dto.order ?? 'DESC', 'NULLS LAST');

    // Total count (distinct PK)
    const countQb = qb.clone();
    countQb.skip(undefined).take(undefined);
    countQb.expressionMap.orderBys = {};
    countQb.select(`COUNT(DISTINCT ${aliasName}.${pkProp})`, 'total');
    const rawTotal = await countQb.getRawOne<{ total: string }>();
    const totalItem = Number(rawTotal?.total ?? 0);

    // Page fetch
    qb.skip(offset).take(limit);
    const { raw, entities } = await qb.getRawAndEntities();

    // Robust merge by PRIMARY KEY (not by index)
    const pkDbName = mainAlias.metadata.primaryColumns[0].databaseName;
    const pkRawKey = `${aliasName}_${pkDbName}`; // e.g., "p_project_id"

    const extrasByPk = new Map<
      string,
      Record<string, number | string | null>
    >();

    for (const row of raw as ReadonlyArray<Record<string, unknown>>) {
      const pkStr = this.pkToString(row[pkRawKey]);
      if (!pkStr) continue;

      const stash: Record<string, number | string | null> =
        extrasByPk.get(pkStr) ?? {};

      for (const key of opts.mergeKeys) {
        const candidate = row[key] ?? row[`${key}`] ?? null;

        let value: number | string | null = null;
        if (typeof candidate === 'number') value = candidate;
        else if (typeof candidate === 'string')
          value = /^\d+$/.test(candidate) ? Number(candidate) : candidate;
        else value = null;

        stash[key] = value;
      }

      extrasByPk.set(pkStr, stash);
    }

    const merged: Array<T & Partial<Record<K, number | string | null>>> =
      entities.map((ent) => {
        const pkStr = this.pkToString(
          (ent as unknown as Record<string, unknown>)[pkProp],
        );
        const extra = (pkStr ? extrasByPk.get(pkStr) : undefined) ?? {};
        return { ...(ent as object), ...extra } as T &
          Partial<Record<K, number | string | null>>;
      });

    // Meta/links
    const totalPage = Math.max(1, Math.ceil(totalItem / limit));
    const hasNextPage = page < totalPage;
    const hasPreviousPage = page > 1;

    const baseURL = `${this.request.protocol}://${this.request.headers.host}/`;
    const url = new URL(this.request.url, baseURL);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));

    const mkLink = (p: number): string => {
      const u = new URL(url.toString());
      u.searchParams.set('page', String(p));
      return `${u.origin}${u.pathname}?${u.searchParams.toString()}`;
    };

    return {
      data: merged,
      meta: {
        itemsPerPage: limit,
        totalItem,
        currentPage: page,
        totalPage,
        hasNextPage,
        hasPreviousPage,
      },
      links: {
        first: mkLink(1),
        last: mkLink(totalPage),
        current: mkLink(page),
        next: hasNextPage ? mkLink(page + 1) : null,
        previous: hasPreviousPage ? mkLink(page - 1) : null,
      },
    };
  }
}
