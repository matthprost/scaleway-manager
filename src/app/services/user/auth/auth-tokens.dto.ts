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

export interface TokenDto {
  access_key: string;
  category: string;
  creation_date: string;
  creation_ip: string;
  deletion_date: string;
  description: string;
  expires: string;
  inherits_user_perms: boolean;
  roles: any;
  user_id: string;
}
