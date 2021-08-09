export interface TokensDto {
  tokens: TokenDto[];
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
  organization_id: string;
  project_id: string;
  roles: {
    role: string;
    organization: string;
  };
  use_role_key: boolean;
  user_id: string;
}
