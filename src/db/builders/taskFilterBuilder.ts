import type { TaskFilter, TaskSortBy, TaskSortOrder } from "../../types";

interface QueryParts {
  whereClause: string;
  params: unknown[];
  orderByClause: string;
}

export function buildTaskQuery(
  userId: number,
  filter: TaskFilter,
  sortBy: TaskSortBy = "created_at",
  sortOrder: TaskSortOrder = "desc"
): QueryParts {
  const conditions: string[] = ["user_id = ?", "deleted_at IS NULL"];
  const params: unknown[] = [userId];

  if (filter.priority) {
    conditions.push("priority = ?");
    params.push(filter.priority);
  }

  if (filter.due_date_from) {
    conditions.push("due_date >= ?");
    params.push(filter.due_date_from);
  }

  if (filter.due_date_to) {
    conditions.push("due_date <= ?");
    params.push(filter.due_date_to);
  }

  if (filter.search) {
    conditions.push("(title LIKE ? OR description LIKE ?)");
    const searchTerm = `%${filter.search}%`;
    params.push(searchTerm, searchTerm);
  }

  let whereClause = conditions.join(" AND ");

  if (filter.tags && filter.tags.length > 0) {
    const tagPlaceholders = filter.tags.map(() => "?").join(",");
    conditions.push(`id IN (
      SELECT task_id FROM task_tags 
      WHERE tag IN (${tagPlaceholders}) 
      GROUP BY task_id 
      HAVING COUNT(DISTINCT tag) = ?
    )`);
    params.push(...filter.tags, filter.tags.length);
    whereClause = conditions.join(" AND ");
  }

  const orderByClause = buildOrderBy(sortBy, sortOrder);

  return {
    whereClause,
    params,
    orderByClause
  };
}

function buildOrderBy(sortBy: TaskSortBy, sortOrder: TaskSortOrder): string {
  const direction = sortOrder.toUpperCase();

  if (sortBy === "priority") {
    return `CASE priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
      ELSE 4 
    END ${direction}`;
  }

  if (sortBy === "due_date") {
    return `due_date ${direction} NULLS LAST`;
  }

  return `${sortBy} ${direction}`;
}
