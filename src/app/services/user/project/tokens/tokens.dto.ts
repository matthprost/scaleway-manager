export interface TokensDto {
  api_keys: TokenDto[];
}

export interface TokenDto {
  access_key: string;
  application_id: string;
  created_at: string;
  creation_ip: string;
  default_project_id: string;
  description: string;
  editable: boolean;
  expires_at: string;
  secret_key: string;
  updated_at: string;
}
