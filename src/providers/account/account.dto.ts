export interface UsersDto {
  user: UserDto;
}

export interface UserDto {
  creation_date: string,
  double_auth_enabled: boolean,
  email: string,
  firstname: string,
  fullname: string,
  id: string,
  lastname: string,
  modification_date: string,
  organizations: any,
  phone_number: string,
  roles: any,
  ssh_public_keys: Array<SshKeysDto>
}

export interface SshKeysDto {
  creation_date: string
  description: string
  email: string
  fingerprint: string
  id: string
  ip: string
  key: string
  modification_date: string
  port: number
}
