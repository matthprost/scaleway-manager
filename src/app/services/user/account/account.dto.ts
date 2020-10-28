export interface UsersDto {
  user: UserDto;
}

export interface UserDto {
  creation_date: string;
  double_auth_enabled: boolean;
  email: string;
  firstname: string;
  fullname: string;
  id: string;
  lastname: string;
  modification_date: string;
  organizations: any;
  phone_number: string;
  roles: any;
  ssh_public_keys: any;
}
