export interface UsersDto {
  user: UserDto;
}

export interface UserDto {
  created_at: string;
  mfa_enabled: boolean;
  email: string;
  first_name: string;
  account_root_user_id: string;
  last_name: string;
  updated_at: string;
  organizations: any;
  phone_number: string;
  roles: any;
  ssh_public_keys: any;
}
