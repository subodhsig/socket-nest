export interface Paginated<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItem: number;
    currentPage: number;
    totalPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  links: {
    first: string;
    last: string;
    current: string;
    next: string | null;
    previous: string | null;
  };
}
