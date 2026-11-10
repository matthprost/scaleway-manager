import type { ActivityEvent } from '../domain/activity';

// By organization: logins belong to it, not to a project.
export type ActivityPort = {
  listRecent(organizationId: string): Promise<ActivityEvent[]>;
};
