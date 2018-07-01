export interface AuthTokenDto {
  token: TokenContent;
}

export interface TokenContent {
  creation_date: string;
  expires: any;
  id: string;
  inherits_user_perms: boolean;
  permissions: Array<any>;
  roles: TokenRoles;
  user_id: string;
}

export interface TokenRoles {
  organization: string;
  role: string;
}
