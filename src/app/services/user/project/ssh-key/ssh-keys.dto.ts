export interface SshKeysDto {
  ssh_keys: SshKeysDto[];
}

export interface SshKeysDto {
  created_at: string;
  creation_info: {
    address: string;
    user_agent: string;
    country_code: string;
  };
  fingerprint: string;
  id: string;
  name: string;
  organization_id: string;
  project_id: string;
  public_key: string;
  updated_at: string;
}
